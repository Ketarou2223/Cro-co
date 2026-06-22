# 解説: このファイルは「自分のプロフィール管理」の API エンドポイントを定義する。
# 解説: 呼ばれる場所: main.py で app.include_router(profile.router) として登録される
# 解説: エンドポイント一覧:
#   GET    /api/profile/me                       → 自分のプロフィールを取得する
#   PATCH  /api/profile/me                       → 自分のプロフィールを更新する
#   DELETE /api/profile/me                       → アカウントを削除する（退会）
#   POST   /api/profile/upload-student-id        → 学生証画像をアップロードして審査申請する
#   GET    /api/profile/avatar-url               → 自分のアバター署名付き URL を返す
#   PATCH  /api/profile/photos/reorder           → 写真の表示順を変更する
#   POST   /api/profile/photos                   → プロフィール写真を追加する（最大6枚）
#   DELETE /api/profile/photos/{photo_id}        → プロフィール写真を削除する
#   POST   /api/profile/reapply                  → 却下後に再申請する
#   POST   /api/profile/ping                     → 最終アクセス日時を更新する（オンライン表示用）
#   POST   /api/profile/complete-onboarding      → オンボーディング完了フラグを立てる
#   POST   /api/profile/photos/{id}/set-main     → メイン写真を変更する
# 解説: 呼ぶ先:
#   Supabase: profiles / profile_images テーブル + Storage（profile-images / student-ids バケット）
#   image_utils.py: 署名付き URL 生成
#   PIL (Pillow): EXIF 除去（位置情報等の個人情報を写真から削除）

import io
import logging
import re
import secrets
from datetime import date, datetime, timezone
from uuid import UUID

# 解説: HTML タグ除去用の正規表現パターン（<タグ> を削除する）
_HTML_TAG_RE = re.compile(r'<[^>]*>')


def _strip_html_tags(text: str) -> str:
    return _HTML_TAG_RE.sub('', text)

from PIL import Image

from fastapi import APIRouter, Depends, Form, HTTPException, Request, Response, UploadFile, status
from supabase_auth.types import User
from postgrest.exceptions import APIError

from app.auth.active_user import get_active_user
from app.core.hash_utils import compute_hash, normalize_email
from app.core.identity_block import get_block_info, set_retain_until_on_delete
from app.core.image_utils import get_signed_image_url
from app.core.limiter import limiter
from app.core.supabase_client import supabase
from app.schemas.profile import PhotoItem, PhotoReorderRequest, ProfileResponse, ProfileUpdateRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/profile", tags=["profile"])

# 解説: プロフィール写真の最大ファイルサイズ = 5MB（Supabase Storage バケット設定と一致）
_MAX_FILE_SIZE = 5 * 1024 * 1024  # バケット file_size_limit (5MB) と一致
# 解説: 学生証の最大ファイルサイズ = 5MB（同上）
_MAX_STUDENT_ID_SIZE = 5 * 1024 * 1024  # バケット file_size_limit (5MB) と一致
# 解説: 許可する画像フォーマット（WebP はバケット側で未許可のため除外）
_ALLOWED_MIME_TYPES = {"image/jpeg", "image/png"}  # バケット allowed_mime_types と一致（webp はバケット側未許可のため除外）
# 解説: MIME タイプ → ファイル拡張子の変換マップ
_MIME_TO_EXT = {"image/jpeg": "jpg", "image/png": "png"}
# 解説: プロフィール写真の最大枚数
_MAX_PHOTOS = 6


def _format_date_ja(iso_str: str) -> str:
    """ISO 日付文字列を「YYYY年M月D日」形式に変換する。パース失敗時は元文字列を返す。"""
    try:
        dt = datetime.fromisoformat(iso_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return f"{dt.year}年{dt.month}月{dt.day}日"
    except Exception:
        return iso_str
# 解説: PIL の save() に渡すフォーマット名のマップ
_PIL_FORMAT = {"image/jpeg": "JPEG", "image/png": "PNG"}


# 解説: 画像バイト列から EXIF データ（位置情報・撮影日時等の個人情報）を除去する関数
def _strip_exif(data: bytes, mime_type: str) -> bytes:
    fmt = _PIL_FORMAT.get(mime_type)
    if fmt is None:
        return data
    try:
        # 解説: PIL で画像を開いて EXIF なしで再エンコードする
        img = Image.open(io.BytesIO(data))
        output = io.BytesIO()
        save_kwargs: dict = {"format": fmt}
        if fmt == "JPEG":
            # 解説: exif=b"" = 空のEXIF を渡すことで位置情報等を除去する
            save_kwargs["exif"] = b""
        img.save(output, **save_kwargs)
        return output.getvalue()
    except Exception:
        raise HTTPException(status_code=422, detail="画像の処理に失敗しました")


# 解説: 指定ユーザーのプロフィール写真一覧を取得するヘルパ関数
def _fetch_photos(user_id: str) -> list[PhotoItem]:
    try:
        res = (
            supabase.table("profile_images")
            .select("id, image_path, display_order, status")
            .eq("user_id", user_id)
            .order("display_order")
            .execute()
        )
    except Exception:
        return []
    photos: list[PhotoItem] = []
    for row in res.data or []:
        photos.append(
            PhotoItem(
                id=row["id"],
                image_path=row["image_path"],
                display_order=row["display_order"],
                signed_url=get_signed_image_url(row["image_path"]),
                status=row.get("status", "approved"),
            )
        )
    return photos


# 解説: GET /api/profile/me = 自分のプロフィール全情報を取得する（SELECT * 例外許可エンドポイント）
@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(
    current_user: User = Depends(get_active_user),
) -> ProfileResponse:
    # 再登録ブロック照合（関所B）: メール認証後、オンボーディングに入る前に弾く。
    # hash 生成失敗時はスキップ（upload-student-id の fail-close が最終ゲート）。
    # get_block_info 例外時は内部で {"type":"ban"} を返し fail-close を担保。
    _email_hash = compute_hash(normalize_email(current_user.email))
    if _email_hash:
        _block = get_block_info(_email_hash, exclude_user_id=str(current_user.id))
        if _block is not None:
            if _block.get("type") == "withdrawal":
                _retain_iso = _block.get("retain_until", "")
                logger.warning("再登録ブロック(withdrawal): user_id=%s", current_user.id)
                raise HTTPException(
                    status_code=423,
                    detail={
                        "code": "registration_blocked",
                        "type": "withdrawal",
                        "retain_until": _retain_iso,
                        "message": f"退会されたため、{_format_date_ja(_retain_iso)}まで再登録できません",
                    },
                )
            # ban または active → 中立（日付・「退会」の語・retain_until を出さない）
            logger.warning("再登録ブロック(ban/active): user_id=%s", current_user.id)
            raise HTTPException(
                status_code=423,
                detail={"code": "registration_blocked", "type": "ban"},
            )
    try:
        # 解説: 自分のプロフィールのみ SELECT * を許容（CLAUDE.md §4 例外）
        response = (
            supabase.table("profiles")
            .select("*")
            .eq("id", str(current_user.id))
            .single()
            .execute()
        )
    except APIError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="プロフィールが見つかりません",
        )
    if response.data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="プロフィールが見つかりません",
        )
    # 解説: 写真一覧を別途取得して ProfileResponse に含める
    photos = _fetch_photos(str(current_user.id))
    # 解説: 自分が受け取ったいいね数を取得する（count="exact" で件数のみ取得）
    likes_res = (
        supabase.table("likes")
        .select("*", count="exact")
        .eq("liked_id", str(current_user.id))
        .execute()
    )
    liked_count = likes_res.count or 0
    # 主画像 profile_image_path を署名 URL 化（Private バケットのため直 public URL は不可）
    main_path = response.data.get("profile_image_path")
    avatar_url = get_signed_image_url(main_path) if main_path else None
    return ProfileResponse(
        **response.data, photos=photos, liked_count=liked_count, avatar_url=avatar_url
    )


# 解説: PATCH /api/profile/me = 自分のプロフィールを部分更新する（60回/分）
@router.patch("/me", response_model=ProfileResponse)
@limiter.limit("60/minute")
async def update_my_profile(
    request: Request,
    body: ProfileUpdateRequest,
    current_user: User = Depends(get_active_user),
) -> ProfileResponse:
    # 解説: exclude_unset=True = リクエストで指定されたフィールドだけを辞書に含める（未指定は無視）
    update_data = body.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="更新するフィールドがありません",
        )

    # 自由入力テキストフィールドから HTML タグを除去（多層防御）
    # 解説: XSS 対策として自由入力テキストは HTML タグを除去してから保存する
    _TEXT_FIELDS = {"name", "faculty", "department", "bio", "hometown", "status_message", "club"}
    for field in _TEXT_FIELDS:
        if field in update_data and isinstance(update_data[field], str):
            update_data[field] = _strip_html_tags(update_data[field])

    # 表示名・自己紹介は空文字列 / None で上書きさせない（onboarding 後の不整合防止）
    if "name" in update_data and not (update_data.get("name") or "").strip():
        raise HTTPException(status_code=400, detail="表示名を入力してください")
    if "bio" in update_data and not (update_data.get("bio") or "").strip():
        raise HTTPException(status_code=400, detail="自己紹介を入力してください")

    # 現在のプロフィールを取得（各種バリデーション・profile_setup_completed 判定用）
    try:
        current_res = (
            supabase.table("profiles")
            .select("identity_verified, clubs, gender, interest_in, name, year, faculty")
            .eq("id", str(current_user.id))
            .single()
            .execute()
        )
    except APIError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="プロフィールが見つかりません",
        )

    if not current_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="プロフィールが見つかりません",
        )

    current_profile = current_res.data

    # identity_verified の場合、学籍情報の変更を無視（real_name/student_number/birth_date は
    # ProfileUpdateRequest から除外済みのため、ここでは faculty/department/admission_year のみ保護）
    # 解説: 身元確認済みユーザーは学部・学科・入学年度を変更できない（なりすまし防止）
    if current_profile.get("identity_verified"):
        for field in ("faculty", "department", "admission_year"):
            update_data.pop(field, None)

    # gender・interest_in は一度設定したら変更不可（設定済みなら無視）
    if "gender" in update_data and current_profile.get("gender"):
        update_data.pop("gender")
    if "interest_in" in update_data and current_profile.get("interest_in"):
        update_data.pop("interest_in")

    # clubs のバリデーション
    if "clubs" in update_data:
        clubs = update_data.get("clubs") or []
        if len(clubs) > 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="サークルは5個までにして。",
            )

    # hidden_clubs のバリデーション（clubs のサブセットのみ許可）
    # 解説: 非表示にできるのは自分が所属するサークルだけ（それ以外は弾く）
    if "hidden_clubs" in update_data:
        effective_clubs: set[str] = set(
            (update_data.get("clubs") or []) if "clubs" in update_data
            else (current_profile.get("clubs") or [])
        )
        hidden = set(update_data.get("hidden_clubs") or [])
        invalid = hidden - effective_clubs
        if invalid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="非表示にできるのは自分が所属しているサークルだけ。",
            )

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="更新するフィールドがありません",
        )

    # 必須項目が揃っていれば profile_setup_completed を True に設定
    # 解説: required 全項目が埋まっていれば自動的にセットアップ完了フラグを立てる
    required = ["name", "year", "faculty", "gender", "interest_in"]
    if all(update_data.get(k) or current_profile.get(k) for k in required):
        update_data["profile_setup_completed"] = True

    try:
        response = (
            supabase.table("profiles")
            .update(update_data)
            .eq("id", str(current_user.id))
            .execute()
        )
    except APIError as e:
        logger.error("プロフィールの更新に失敗しました: %s", e.message)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="プロフィールの更新に失敗しました",
        )
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="プロフィールが見つかりません",
        )
    photos = _fetch_photos(str(current_user.id))
    return ProfileResponse(**response.data[0], photos=photos)


# 解説: POST /api/profile/upload-student-id = 学生証画像をアップロードして審査申請する（5回/時間）
@router.post("/upload-student-id", response_model=ProfileResponse)
@limiter.limit("5/hour")
async def upload_student_id(
    request: Request,
    # 解説: UploadFile = multipart/form-data で送られてくるファイル
    file: UploadFile,
    # 解説: Form パラメータ = フォームデータとして送られてくる各フィールド
    real_name: str = Form(..., min_length=1, max_length=100),
    student_number: str = Form(..., min_length=1, max_length=20, pattern=r"^[A-Za-z0-9]+$"),
    faculty: str = Form(..., max_length=50),
    department: str = Form(..., max_length=100),
    gender: str = Form(...),
    interest_in: str = Form(...),
    year: int = Form(..., ge=1, le=6),
    birth_date: str | None = Form(None),
    current_user: User = Depends(get_active_user),
) -> ProfileResponse:
    if not real_name.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="本名を入力して。")
    if not student_number.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="学籍番号を入力して。")
    if gender not in ("male", "female"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="性別を選択して。")
    if interest_in not in ("male", "female"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="恋愛対象を選択して。")

    # 再登録ブロック照合（fail-close: ハッシュ生成失敗・照合例外いずれも拒否）
    # 照合キー: email_hash（Phase A 以降。normalize_email で正規化後にハッシュ化）
    # 自己除外: 自分の既存ブロック行で自分が弾かれないよう source_user_id != 現ユーザーの行のみ照合
    _email_hash = compute_hash(normalize_email(current_user.email))
    if not _email_hash:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="この内容では登録できません")
    _block = get_block_info(_email_hash, exclude_user_id=str(current_user.id))
    if _block is not None:
        if _block.get("type") == "withdrawal":
            _retain_iso = _block["retain_until"]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "withdrawal_block",
                    "message": f"退会されたため、{_format_date_ja(_retain_iso)}まで再登録できません",
                    "retain_until": _retain_iso,
                },
            )
        # BAN または在籍中 → 中立文言（理由・日付を出さない）
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="この内容では登録できません")

    if file.content_type not in _ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="JPEGまたはPNG形式の画像のみアップロードできます",
        )

    file_bytes = await file.read()
    if len(file_bytes) > _MAX_STUDENT_ID_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="ファイルサイズは10MB以下にしてください",
        )
    # 解説: EXIF（位置情報等）を除去してから保存する
    file_bytes = _strip_exif(file_bytes, file.content_type)

    ext = _MIME_TO_EXT[file.content_type]
    timestamp = int(datetime.now(timezone.utc).timestamp())
    # 解説: ストレージパス = "{ユーザーID}/student_id_{タイムスタンプ}.{拡張子}"
    storage_path = f"{current_user.id}/student_id_{timestamp}.{ext}"

    try:
        # 解説: student-ids バケットにファイルをアップロードする
        supabase.storage.from_("student-ids").upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": file.content_type},
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="画像のアップロードに失敗しました",
        )

    # 現在の gender/interest_in/status を確認
    # 解説: 一度設定された gender/interest_in は上書きしない（一度設定したら変更不可の仕様）
    try:
        current_res = (
            supabase.table("profiles")
            .select("gender, interest_in, status, student_id_image_path")
            .eq("id", str(current_user.id))
            .single()
            .execute()
        )
    except APIError:
        current_res = None

    current_gender = current_res.data.get("gender") if current_res and current_res.data else None
    current_interest_in = current_res.data.get("interest_in") if current_res and current_res.data else None
    current_status = current_res.data.get("status") if current_res and current_res.data else None
    # 解説: 以前の学生証ファイルパス（再アップ時に古いファイルを削除するため）
    prev_sid_path: str | None = (current_res.data.get("student_id_image_path") if current_res and current_res.data else None)

    now_iso = datetime.now(timezone.utc).isoformat()
    # 解説: UPDATE するフィールドを辞書に組み立てる
    update_fields: dict = {
        "student_id_image_path": storage_path,
        "submitted_at": now_iso,
        "status": "pending_review",
        "student_id_submitted": True,
        "profile_setup_completed": True,
        "real_name": real_name.strip(),
        "student_number": student_number.strip(),
        "faculty": faculty,
        "department": department,
        "year": year,
    }
    if birth_date:
        try:
            # 解説: birth_date が有効な ISO 日付形式かを確認してから保存する
            update_fields["birth_date"] = str(date.fromisoformat(birth_date))
        except ValueError:
            pass
    # gender/interest_in は未設定の場合のみ保存
    if not current_gender:
        update_fields["gender"] = gender
    if not current_interest_in:
        update_fields["interest_in"] = interest_in
    # 再申請時は rejection_reason をクリア
    if current_status == "rejected":
        update_fields["rejection_reason"] = None

    try:
        response = (
            supabase.table("profiles")
            .update(update_fields)
            .eq("id", str(current_user.id))
            .execute()
        )
    except APIError as e:
        logger.error("学生証アップロード後のプロフィール更新に失敗しました: %s", e.message)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="プロフィールの更新に失敗しました",
        )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="プロフィールが見つかりません",
        )

    # DB 更新成功後に旧学生証ファイルを削除（再アップ時の孤立ファイル防止）
    # 解説: DB が成功してから Storage を削除する（逆にすると DB 失敗時にファイルが消える）
    if prev_sid_path and prev_sid_path != storage_path:
        try:
            supabase.storage.from_("student-ids").remove([prev_sid_path])
        except Exception as e:
            logger.warning("旧学生証削除失敗 user=%s path=%s: %s", str(current_user.id), prev_sid_path, e)

    return ProfileResponse(**response.data[0])


# 解説: GET /api/profile/avatar-url = 自分のアバター画像の署名付き URL だけを返す（軽量版）
@router.get("/avatar-url")
async def get_avatar_url(
    current_user: User = Depends(get_active_user),
) -> dict:
    try:
        profile_res = (
            supabase.table("profiles")
            .select("profile_image_path")
            .eq("id", str(current_user.id))
            .single()
            .execute()
        )
    except APIError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="プロフィールが見つかりません",
        )

    path: str | None = (
        profile_res.data.get("profile_image_path") if profile_res.data else None
    )
    if not path:
        return {"signed_url": None}

    return {"signed_url": get_signed_image_url(path)}


# 解説: PATCH /api/profile/photos/reorder = 写真の表示順（display_order）を更新する（30回/分）
@router.patch("/photos/reorder")
@limiter.limit("30/minute")
async def reorder_photos(
    request: Request,
    body: PhotoReorderRequest,
    current_user: User = Depends(get_active_user),
) -> dict:
    my_id = str(current_user.id)
    # 解説: body.order = 新しい順番に並んだ写真 ID のリスト
    order_ids = [str(uid) for uid in body.order]

    if not order_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="順序リストが空です")

    # 全IDが自分のものか確認
    # 解説: 他人の写真 ID を混ぜた不正リクエストを弾く（IDOR 対策）
    try:
        photo_res = (
            supabase.table("profile_images")
            .select("id")
            .eq("user_id", my_id)
            .in_("id", order_ids)
            .execute()
        )
    except APIError as e:
        logger.error("写真の確認に失敗しました: %s", e.message)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="写真の確認に失敗しました")

    existing_ids = {row["id"] for row in (photo_res.data or [])}
    # 解説: リクエストの ID 数と実際に自分の写真として確認できた ID 数が一致しなければ不正
    if len(existing_ids) != len(order_ids):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="権限のない写真が含まれています")

    try:
        # 解説: リストの順番（インデックス i）を display_order として1件ずつ更新する
        for i, photo_id in enumerate(order_ids):
            supabase.table("profile_images").update(
                {"display_order": i}
            ).eq("id", photo_id).eq("user_id", my_id).execute()
    except APIError as e:
        logger.error("写真の並び替えに失敗しました: %s", e.message)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="並び替えに失敗しました")

    return {"ok": True}


# 解説: POST /api/profile/photos = プロフィール写真を追加する（20回/分・100回/時間）
@router.post("/photos", response_model=PhotoItem, status_code=status.HTTP_201_CREATED)
# 解説: セミコロン区切りで「20/min かつ 100/hour」という複合レート制限を設定する
@limiter.limit("20/minute;100/hour")
async def upload_photo(
    request: Request,
    file: UploadFile,
    current_user: User = Depends(get_active_user),
) -> PhotoItem:
    if file.content_type not in _ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="JPEGまたはPNG形式の画像のみアップロードできます",
        )

    file_bytes = await file.read()
    if len(file_bytes) > _MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="ファイルサイズは5MB以下にしてください",
        )
    file_bytes = _strip_exif(file_bytes, file.content_type)

    # 6枚制限チェック
    # 解説: 現在の写真枚数が上限に達していれば追加を拒否する
    count_res = (
        supabase.table("profile_images")
        .select("id")
        .eq("user_id", str(current_user.id))
        .execute()
    )
    if len(count_res.data or []) >= _MAX_PHOTOS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="写真は最大6枚まで",
        )

    ext = _MIME_TO_EXT[file.content_type]
    timestamp = int(datetime.now(timezone.utc).timestamp())
    # 解説: secrets.token_hex(2) = 4桁のランダム16進数（ファイル名の衝突を避ける）
    rand = secrets.token_hex(2)
    storage_path = f"{current_user.id}/photo_{timestamp}_{rand}.{ext}"

    try:
        # 解説: profile-images バケットに写真をアップロードする
        supabase.storage.from_("profile-images").upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": file.content_type},
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="画像のアップロードに失敗しました",
        )

    # display_order = 現在の最大値 + 1
    # 解説: 新しい写真は最後尾（最大 display_order + 1）に追加する
    order_res = (
        supabase.table("profile_images")
        .select("display_order")
        .eq("user_id", str(current_user.id))
        .order("display_order", desc=True)
        .limit(1)
        .execute()
    )
    max_order = order_res.data[0]["display_order"] if order_res.data else -1
    new_order = max_order + 1

    try:
        # 解説: profile_images テーブルに新しいレコードを INSERT する（status="pending" = 審査待ち）
        insert_res = (
            supabase.table("profile_images")
            .insert(
                {
                    "user_id": str(current_user.id),
                    "image_path": storage_path,
                    "display_order": new_order,
                    "status": "pending",
                }
            )
            .execute()
        )
    except APIError as e:
        logger.error("写真の登録に失敗しました: %s", e.message)
        # 解説: DB 登録に失敗したときは Storage のファイルも削除して孤立を防ぐ
        try:
            supabase.storage.from_("profile-images").remove([storage_path])
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="写真の登録に失敗しました",
        )

    row = insert_res.data[0]

    return PhotoItem(
        id=row["id"],
        image_path=row["image_path"],
        display_order=row["display_order"],
        signed_url=get_signed_image_url(storage_path),
        status=row.get("status", "pending"),
    )


# 解説: DELETE /api/profile/photos/{photo_id} = 指定の写真を削除する（204 No Content）
@router.delete("/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_photo(
    photo_id: UUID,
    current_user: User = Depends(get_active_user),
) -> None:
    try:
        # 解説: 削除対象の写真レコードを取得する
        photo_res = (
            supabase.table("profile_images")
            .select("id, user_id, image_path")
            .eq("id", str(photo_id))
            .single()
            .execute()
        )
    except APIError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="写真が見つかりません",
        )

    if not photo_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="写真が見つかりません",
        )

    photo = photo_res.data
    # 解説: 他人の写真を削除しようとしている場合は 403 を返す
    if photo["user_id"] != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="この写真を削除する権限がありません",
        )

    # onboarding 完了後は写真を0枚にできない
    try:
        count_res = (
            supabase.table("profile_images")
            .select("id", count="exact")
            .eq("user_id", str(current_user.id))
            .execute()
        )
        if (count_res.count or 0) <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="写真は最低1枚必要です",
            )
    except HTTPException:
        raise
    except Exception:
        pass

    image_path: str = photo["image_path"]

    # 解説: Storage からファイルを物理削除する（失敗しても DB 削除は続行する）
    try:
        supabase.storage.from_("profile-images").remove([image_path])
    except Exception:
        pass

    try:
        # 解説: profile_images テーブルからレコードを削除する
        supabase.table("profile_images").delete().eq("id", str(photo_id)).execute()
    except APIError as e:
        logger.error("写真の削除に失敗しました: %s", e.message)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="写真の削除に失敗しました",
        )

    # メイン写真だった場合、残りの approved 先頭をメインに設定（なければNULL）
    # approved のみ後継に選ぶことで profile_image_path=approved 不変条件を維持する（[8.3]）
    try:
        # 解説: profiles.profile_image_path が削除した写真だったか確認する
        profile_res = (
            supabase.table("profiles")
            .select("profile_image_path")
            .eq("id", str(current_user.id))
            .single()
            .execute()
        )
        if profile_res.data and profile_res.data.get("profile_image_path") == image_path:
            # 解説: approved 写真の中で一番先頭（display_order が小さい）ものをメインにする
            remaining_res = (
                supabase.table("profile_images")
                .select("image_path")
                .eq("user_id", str(current_user.id))
                .eq("status", "approved")
                .order("display_order")
                .limit(1)
                .execute()
            )
            new_main = (
                remaining_res.data[0]["image_path"] if remaining_res.data else None
            )
            # 解説: new_main = None の場合はメイン写真を NULL にする
            supabase.table("profiles").update(
                {"profile_image_path": new_main}
            ).eq("id", str(current_user.id)).execute()
    except Exception:
        pass


# 解説: POST /api/profile/reapply = 審査却下後に再申請する（5回/時間）
@router.post("/reapply", response_model=ProfileResponse)
@limiter.limit("5/hour")
async def reapply(
    request: Request,
    current_user: User = Depends(get_active_user),
) -> ProfileResponse:
    try:
        res = (
            supabase.table("profiles")
            .select("status, student_id_image_path")
            .eq("id", str(current_user.id))
            .single()
            .execute()
        )
    except APIError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="プロフィールが見つかりません",
        )

    # 解説: rejected（却下）状態でなければ再申請できない
    if not res.data or res.data.get("status") != "rejected":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="再申請できる状態ではありません",
        )

    # 旧学生証ファイルを Storage から物理削除（DB null 化前に実行・PII 孤立防止）
    # 解説: DB を更新する前に Storage ファイルを削除することで PII（個人情報）の孤立を防ぐ
    old_sid_path: str | None = res.data.get("student_id_image_path")
    if old_sid_path:
        try:
            supabase.storage.from_("student-ids").remove([old_sid_path])
        except Exception as e:
            logger.warning("再申請時の旧学生証削除失敗 user=%s: %s", str(current_user.id), e)

    try:
        # 解説: ステータスを "pending_review" に戻して各審査フィールドをリセットする
        update_res = (
            supabase.table("profiles")
            .update(
                {
                    "status": "pending_review",
                    "rejection_reason": None,
                    "reviewed_at": None,
                    "submitted_at": None,
                    "student_id_image_path": None,
                    "student_id_submitted": False,
                }
            )
            .eq("id", str(current_user.id))
            .execute()
        )
    except APIError as e:
        logger.error("再申請に失敗しました: %s", e.message)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="再申請に失敗しました",
        )

    if not update_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="プロフィールが見つかりません",
        )

    photos = _fetch_photos(str(current_user.id))
    return ProfileResponse(**update_res.data[0], photos=photos)


# 解説: POST /api/profile/ping = 最終アクセス時刻を現在時刻に更新する（オンライン状態の管理）
@router.post("/ping")
@limiter.limit("20/minute")
async def ping(
    request: Request,
    current_user: User = Depends(get_active_user),
) -> dict:
    try:
        # 解説: last_seen_at を現在の UTC 時刻に更新する（ブラウザが定期的に叩く）
        supabase.table("profiles").update(
            {"last_seen_at": datetime.now(timezone.utc).isoformat()}
        ).eq("id", str(current_user.id)).execute()
    except Exception:
        pass
    return {"ok": True}


# 解説: DELETE /api/profile/me = アカウントを削除する（退会）（3回/時間）
@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("3/hour")
async def delete_my_account(
    request: Request,
    current_user: User = Depends(get_active_user),
) -> Response:
    user_id = str(current_user.id)

    # 0) profiles から必要なフィールドをまとめて取得（後続のストレージ削除・退避テーブル更新に使用）
    try:
        profile_res = (
            supabase.table("profiles")
            .select("student_id_image_path")
            .eq("id", user_id)
            .single()
            .execute()
        )
        profile_snapshot = profile_res.data or {}
    except Exception as e:
        logger.warning("profiles 取得失敗 user=%s: %s", user_id, e)
        profile_snapshot = {}

    sid_path: str | None = profile_snapshot.get("student_id_image_path")

    # a) profile_images テーブルから全画像レコードを取得
    # 解説: まず削除すべき画像の一覧を取得する（Storage 削除のパスリストが必要）
    try:
        images_res = (
            supabase.table("profile_images")
            .select("id, image_path")
            .eq("user_id", user_id)
            .execute()
        )
        profile_image_rows = images_res.data or []
        profile_image_paths = [row["image_path"] for row in profile_image_rows]
    except Exception:
        profile_image_rows = []
        profile_image_paths = []

    # b) Storage の profile-images バケットから全ファイルを物理削除
    if profile_image_paths:
        try:
            supabase.storage.from_("profile-images").remove(profile_image_paths)
        except Exception as e:
            logger.warning("profile-images Storage削除失敗 user=%s: %s", user_id, e)

    # c) profile_images テーブルから全レコードを物理削除（写真は個人情報）
    if profile_image_rows:
        try:
            photo_ids = [row["id"] for row in profile_image_rows]
            supabase.table("profile_images").delete().in_("id", photo_ids).execute()
        except Exception as e:
            logger.warning("profile_images テーブル削除失敗 user=%s: %s", user_id, e)

    # d) student-ids バケットから物理削除
    if sid_path:
        try:
            supabase.storage.from_("student-ids").remove([sid_path])
        except Exception as e:
            logger.warning("student-ids Storage削除失敗 user=%s: %s", user_id, e)

    # e) identity_block_hashes に retain_until=now+30日 をセット（auth.users 削除より前に確定・fail-close）
    # 解説: email_hash のみでも INSERT 可（migration 058 で student_number_hash NOT NULL 解除済み）
    # 解説: この時点での email 取得が唯一の機会（auth.users 削除後は参照不可）
    _delete_email_hash = compute_hash(normalize_email(current_user.email))
    try:
        set_retain_until_on_delete(source_user_id=user_id, email_hash=_delete_email_hash)
    except Exception as e:
        logger.error("IBH 退会記録失敗（fail-close・auth 削除中断）user=%s: %s", user_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="アカウントの削除に失敗しました",
        )

    # f) auth.users から削除（再ログイン不可にする）
    # 解説: ソフトデリートは行わない。auth 削除失敗時に profiles が deleted のまま残る宙吊りを根本解消するため。
    # 解説: auth.users 削除後は CASCADE で profiles / matches / messages / likes 等が物理削除される。
    try:
        supabase.auth.admin.delete_user(user_id)
    except Exception as e:
        logger.error(
            "auth.users 削除失敗 user=%s (IBH 記録済み・profiles は未変更): %s", user_id, e
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="アカウントの削除に失敗しました",
        )

    return Response(status_code=status.HTTP_204_NO_CONTENT)


# 解説: POST /api/profile/complete-onboarding = オンボーディング完了フラグを立てる（10回/分）
@router.post("/complete-onboarding", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("10/minute")
async def complete_onboarding(
    request: Request,
    current_user: User = Depends(get_active_user),
) -> None:
    """オンボーディング完了をマーク。サーバー側で必須項目を検証する。"""
    me = str(current_user.id)

    try:
        profile_res = (
            supabase.table("profiles")
            .select("name, bio, student_id_submitted")
            .eq("id", me)
            .single()
            .execute()
        )
    except APIError:
        raise HTTPException(status_code=404, detail="プロフィールが見つかりません")

    if not profile_res.data:
        raise HTTPException(status_code=404, detail="プロフィールが見つかりません")

    p = profile_res.data

    if not p.get("student_id_submitted"):
        raise HTTPException(
            status_code=400,
            detail="学生証の提出が完了していません",
        )

    if not (p.get("name") or "").strip():
        raise HTTPException(status_code=400, detail="表示名を設定してください")

    if not (p.get("bio") or "").strip():
        raise HTTPException(status_code=400, detail="自己紹介を入力してください")

    # 写真テーブルに1件以上あるかチェック（pending 含む・profile_image_path は承認後のみ設定）
    try:
        photo_count_res = (
            supabase.table("profile_images")
            .select("id", count="exact")
            .eq("user_id", me)
            .execute()
        )
        if (photo_count_res.count or 0) < 1:
            raise HTTPException(
                status_code=400,
                detail="プロフィール写真を設定してください",
            )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="写真の確認に失敗しました")

    # 解説: 全チェックを通過したら完了フラグを True にする
    supabase.table("profiles").update({
        "onboarding_completed": True,
        "profile_completed": True,
        "profile_setup_completed": True,
    }).eq("id", me).execute()


# 解説: POST /api/profile/photos/{photo_id}/set-main = 指定写真をメイン写真にする（20回/分）
@router.post("/photos/{photo_id}/set-main")
@limiter.limit("20/minute")
async def set_main_photo(
    request: Request,
    photo_id: UUID,
    current_user: User = Depends(get_active_user),
) -> dict:
    try:
        photo_res = (
            supabase.table("profile_images")
            .select("id, user_id, image_path, status")
            .eq("id", str(photo_id))
            .single()
            .execute()
        )
    except APIError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="写真が見つかりません",
        )

    if not photo_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="写真が見つかりません",
        )

    photo = photo_res.data
    # 解説: 他人の写真をメインに設定しようとしている場合は 403
    if photo["user_id"] != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="この写真を設定する権限がありません",
        )

    # approved 写真のみメインに設定可（profile_image_path=approved 不変条件・[8.3]）
    # 解説: 審査通過（approved）の写真だけをメインにできる（審査中の写真は設定不可）
    if photo.get("status") != "approved":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="承認済みの写真のみメイン写真に設定できます",
        )

    try:
        # 解説: profiles.profile_image_path を選択した写真のパスに更新する
        supabase.table("profiles").update(
            {"profile_image_path": photo["image_path"]}
        ).eq("id", str(current_user.id)).execute()
    except APIError as e:
        logger.error("メイン写真の設定に失敗しました: %s", e.message)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="メイン写真の設定に失敗しました",
        )

    return {"ok": True}
