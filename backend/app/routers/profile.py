import io
import logging
import secrets
from datetime import date, datetime, timezone
from uuid import UUID

from PIL import Image

from fastapi import APIRouter, Depends, Form, HTTPException, Request, Response, UploadFile, status
from gotrue.types import User
from postgrest.exceptions import APIError

from app.auth.active_user import get_active_user
from app.core.image_utils import get_signed_image_url
from app.core.limiter import limiter
from app.core.supabase_client import supabase
from app.schemas.profile import PhotoItem, PhotoReorderRequest, ProfileResponse, ProfileUpdateRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/profile", tags=["profile"])

_MAX_FILE_SIZE = 5 * 1024 * 1024  # バケット file_size_limit (5MB) と一致
_MAX_STUDENT_ID_SIZE = 5 * 1024 * 1024  # バケット file_size_limit (5MB) と一致
_ALLOWED_MIME_TYPES = {"image/jpeg", "image/png"}  # バケット allowed_mime_types と一致（webp はバケット側未許可のため除外）
_MIME_TO_EXT = {"image/jpeg": "jpg", "image/png": "png"}
_MAX_PHOTOS = 6
_PIL_FORMAT = {"image/jpeg": "JPEG", "image/png": "PNG"}


def _strip_exif(data: bytes, mime_type: str) -> bytes:
    fmt = _PIL_FORMAT.get(mime_type)
    if fmt is None:
        return data
    try:
        img = Image.open(io.BytesIO(data))
        output = io.BytesIO()
        save_kwargs: dict = {"format": fmt}
        if fmt == "JPEG":
            save_kwargs["exif"] = b""
        img.save(output, **save_kwargs)
        return output.getvalue()
    except Exception:
        raise HTTPException(status_code=422, detail="画像の処理に失敗しました")


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


@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(
    current_user: User = Depends(get_active_user),
) -> ProfileResponse:
    try:
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
    photos = _fetch_photos(str(current_user.id))
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


@router.patch("/me", response_model=ProfileResponse)
@limiter.limit("60/minute")
async def update_my_profile(
    request: Request,
    body: ProfileUpdateRequest,
    current_user: User = Depends(get_active_user),
) -> ProfileResponse:
    update_data = body.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="更新するフィールドがありません",
        )

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

    # identity_verified の場合、学籍情報・身元情報の変更を無視
    if current_profile.get("identity_verified"):
        for field in ("faculty", "department", "admission_year", "birth_date", "real_name", "student_number"):
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


@router.post("/upload-student-id", response_model=ProfileResponse)
@limiter.limit("5/hour")
async def upload_student_id(
    request: Request,
    file: UploadFile,
    real_name: str = Form(..., min_length=1, max_length=100),
    student_number: str = Form(..., min_length=1, max_length=20, pattern=r"^[A-Za-z0-9]+$"),
    faculty: str = Form(..., max_length=50),
    department: str = Form(..., max_length=100),
    gender: str = Form(...),
    interest_in: str = Form(...),
    year: int = Form(..., ge=1, le=11),
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
    file_bytes = _strip_exif(file_bytes, file.content_type)

    ext = _MIME_TO_EXT[file.content_type]
    timestamp = int(datetime.now(timezone.utc).timestamp())
    storage_path = f"{current_user.id}/student_id_{timestamp}.{ext}"

    try:
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
    prev_sid_path: str | None = (current_res.data.get("student_id_image_path") if current_res and current_res.data else None)

    now_iso = datetime.now(timezone.utc).isoformat()
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
    if prev_sid_path and prev_sid_path != storage_path:
        try:
            supabase.storage.from_("student-ids").remove([prev_sid_path])
        except Exception as e:
            logger.warning("旧学生証削除失敗 user=%s path=%s: %s", str(current_user.id), prev_sid_path, e)

    return ProfileResponse(**response.data[0])


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


@router.patch("/photos/reorder")
async def reorder_photos(
    body: PhotoReorderRequest,
    current_user: User = Depends(get_active_user),
) -> dict:
    my_id = str(current_user.id)
    order_ids = [str(uid) for uid in body.order]

    if not order_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="順序リストが空です")

    # 全IDが自分のものか確認
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
    if len(existing_ids) != len(order_ids):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="権限のない写真が含まれています")

    try:
        for i, photo_id in enumerate(order_ids):
            supabase.table("profile_images").update(
                {"display_order": i}
            ).eq("id", photo_id).eq("user_id", my_id).execute()
    except APIError as e:
        logger.error("写真の並び替えに失敗しました: %s", e.message)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="並び替えに失敗しました")

    return {"ok": True}


@router.post("/photos", response_model=PhotoItem, status_code=status.HTTP_201_CREATED)
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
    rand = secrets.token_hex(2)
    storage_path = f"{current_user.id}/photo_{timestamp}_{rand}.{ext}"

    try:
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


@router.delete("/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_photo(
    photo_id: UUID,
    current_user: User = Depends(get_active_user),
) -> None:
    try:
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
    if photo["user_id"] != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="この写真を削除する権限がありません",
        )

    image_path: str = photo["image_path"]

    try:
        supabase.storage.from_("profile-images").remove([image_path])
    except Exception:
        pass

    try:
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
        profile_res = (
            supabase.table("profiles")
            .select("profile_image_path")
            .eq("id", str(current_user.id))
            .single()
            .execute()
        )
        if profile_res.data and profile_res.data.get("profile_image_path") == image_path:
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
            supabase.table("profiles").update(
                {"profile_image_path": new_main}
            ).eq("id", str(current_user.id)).execute()
    except Exception:
        pass


@router.post("/reapply", response_model=ProfileResponse)
async def reapply(
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

    if not res.data or res.data.get("status") != "rejected":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="再申請できる状態ではありません",
        )

    # 旧学生証ファイルを Storage から物理削除（DB null 化前に実行・PII 孤立防止）
    old_sid_path: str | None = res.data.get("student_id_image_path")
    if old_sid_path:
        try:
            supabase.storage.from_("student-ids").remove([old_sid_path])
        except Exception as e:
            logger.warning("再申請時の旧学生証削除失敗 user=%s: %s", str(current_user.id), e)

    try:
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


@router.post("/ping")
@limiter.limit("20/minute")
async def ping(
    request: Request,
    current_user: User = Depends(get_active_user),
) -> dict:
    try:
        supabase.table("profiles").update(
            {"last_seen_at": datetime.now(timezone.utc).isoformat()}
        ).eq("id", str(current_user.id)).execute()
    except Exception:
        pass
    return {"ok": True}


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_account(
    current_user: User = Depends(get_active_user),
) -> Response:
    user_id = str(current_user.id)
    now_iso = datetime.now(timezone.utc).isoformat()

    # a) profile_images テーブルから全画像レコードを取得
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

    # d) student_id_image_path があれば student-ids バケットから物理削除
    try:
        profile_res = (
            supabase.table("profiles")
            .select("student_id_image_path")
            .eq("id", user_id)
            .single()
            .execute()
        )
        sid_path: str | None = (
            profile_res.data.get("student_id_image_path") if profile_res.data else None
        )
        if sid_path:
            try:
                supabase.storage.from_("student-ids").remove([sid_path])
            except Exception as e:
                logger.warning("student-ids Storage削除失敗 user=%s: %s", user_id, e)
    except Exception as e:
        logger.warning("profiles 取得失敗 user=%s: %s", user_id, e)

    # e) profiles テーブルをソフトデリート（status='deleted' + 個人情報を即時クリア）
    #    直後の f) で auth.users を削除すると matches/messages/likes 等が CASCADE で即時物理削除される
    try:
        supabase.table("profiles").update({
            "status": "deleted",
            "deleted_at": now_iso,
            "name": None,
            "bio": None,
            "profile_image_path": None,
            "real_name": None,
            "student_number": None,
            "birth_date": None,
            "student_id_image_path": None,
            "age": None,
            "real_name_hash": None,
            "student_number_hash": None,
        }).eq("id", user_id).execute()
    except Exception as e:
        logger.error("profiles ソフトデリート失敗 user=%s: %s", user_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="アカウントの削除に失敗しました",
        )

    # f) auth.users から削除（再ログイン不可にする）
    try:
        supabase.auth.admin.delete_user(user_id)
    except Exception as e:
        logger.error(
            "auth.users 削除失敗 user=%s (profiles はソフトデリート済み): %s", user_id, e
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="アカウントの削除に失敗しました",
        )

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/complete-onboarding", status_code=status.HTTP_204_NO_CONTENT)
async def complete_onboarding(
    current_user: User = Depends(get_active_user),
) -> None:
    """オンボーディング完了をマーク。サーバー側で必須項目を検証する。"""
    me = str(current_user.id)

    try:
        profile_res = (
            supabase.table("profiles")
            .select("name, year, faculty, gender, interest_in, student_id_submitted, status")
            .eq("id", me)
            .single()
            .execute()
        )
    except APIError:
        raise HTTPException(status_code=404, detail="プロフィールが見つかりません")

    if not profile_res.data:
        raise HTTPException(status_code=404, detail="プロフィールが見つかりません")

    p = profile_res.data
    required = ["name", "year", "faculty", "gender", "interest_in"]
    missing = [k for k in required if not p.get(k)]

    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"必須項目が未入力です: {', '.join(missing)}",
        )

    if not p.get("student_id_submitted"):
        raise HTTPException(
            status_code=400,
            detail="学生証の提出が完了していません",
        )

    supabase.table("profiles").update({
        "onboarding_completed": True,
        "profile_completed": True,
        "profile_setup_completed": True,
    }).eq("id", me).execute()


@router.post("/photos/{photo_id}/set-main")
async def set_main_photo(
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
    if photo["user_id"] != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="この写真を設定する権限がありません",
        )

    # approved 写真のみメインに設定可（profile_image_path=approved 不変条件・[8.3]）
    if photo.get("status") != "approved":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="承認済みの写真のみメイン写真に設定できます",
        )

    try:
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
