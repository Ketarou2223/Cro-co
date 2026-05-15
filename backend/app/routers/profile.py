import logging
import secrets
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, status
from gotrue.types import User
from postgrest.exceptions import APIError

from app.auth.dependencies import get_current_user
from app.core.config import settings
from app.core.supabase_client import supabase
from app.schemas.profile import PhotoItem, PhotoReorderRequest, ProfileResponse, ProfileUpdateRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/profile", tags=["profile"])

_MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
_ALLOWED_MIME_TYPES = {"image/jpeg", "image/png"}
_MIME_TO_EXT = {"image/jpeg": "jpg", "image/png": "png"}
_MAX_PHOTOS = 6


def _public_image_url(path: str) -> str:
    return f"{settings.supabase_url}/storage/v1/object/public/profile-images/{path}"


def _fetch_photos(user_id: str) -> list[PhotoItem]:
    try:
        res = (
            supabase.table("profile_images")
            .select("id, image_path, display_order")
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
                signed_url=_public_image_url(row["image_path"]),
            )
        )
    return photos


@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
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
    return ProfileResponse(**response.data, photos=photos, liked_count=liked_count)


@router.patch("/me", response_model=ProfileResponse)
async def update_my_profile(
    body: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
) -> ProfileResponse:
    update_data = body.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="更新するフィールドがありません",
        )
    try:
        response = (
            supabase.table("profiles")
            .update(update_data)
            .eq("id", str(current_user.id))
            .execute()
        )
    except APIError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"プロフィールの更新に失敗しました: {e.message}",
        )
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="プロフィールが見つかりません",
        )
    return ProfileResponse(**response.data[0])


@router.post("/upload-student-id", response_model=ProfileResponse)
async def upload_student_id(
    file: UploadFile,
    current_user: User = Depends(get_current_user),
) -> ProfileResponse:
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

    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        response = (
            supabase.table("profiles")
            .update(
                {
                    "student_id_image_path": storage_path,
                    "submitted_at": now_iso,
                }
            )
            .eq("id", str(current_user.id))
            .execute()
        )
    except APIError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"プロフィールの更新に失敗しました: {e.message}",
        )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="プロフィールが見つかりません",
        )

    return ProfileResponse(**response.data[0])


@router.post("/upload-avatar", response_model=ProfileResponse)
async def upload_avatar(
    file: UploadFile,
    current_user: User = Depends(get_current_user),
) -> ProfileResponse:
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

    ext = _MIME_TO_EXT[file.content_type]
    timestamp = int(datetime.now(timezone.utc).timestamp())
    storage_path = f"{current_user.id}/avatar_{timestamp}.{ext}"

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

    try:
        response = (
            supabase.table("profiles")
            .update({"profile_image_path": storage_path})
            .eq("id", str(current_user.id))
            .execute()
        )
    except APIError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"プロフィールの更新に失敗しました: {e.message}",
        )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="プロフィールが見つかりません",
        )

    return ProfileResponse(**response.data[0])


@router.get("/avatar-url")
async def get_avatar_url(
    current_user: User = Depends(get_current_user),
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

    return {"signed_url": _public_image_url(path)}


@router.patch("/photos/reorder")
async def reorder_photos(
    body: PhotoReorderRequest,
    current_user: User = Depends(get_current_user),
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
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"写真の確認に失敗しました: {e.message}")

    existing_ids = {row["id"] for row in (photo_res.data or [])}
    if len(existing_ids) != len(order_ids):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="権限のない写真が含まれています")

    try:
        for i, photo_id in enumerate(order_ids):
            supabase.table("profile_images").update(
                {"display_order": i}
            ).eq("id", photo_id).eq("user_id", my_id).execute()
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"並び替えに失敗しました: {e.message}")

    return {"ok": True}


@router.post("/photos", response_model=PhotoItem, status_code=status.HTTP_201_CREATED)
async def upload_photo(
    file: UploadFile,
    current_user: User = Depends(get_current_user),
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
                }
            )
            .execute()
        )
    except APIError as e:
        try:
            supabase.storage.from_("profile-images").remove([storage_path])
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"写真の登録に失敗しました: {e.message}",
        )

    row = insert_res.data[0]

    return PhotoItem(
        id=row["id"],
        image_path=row["image_path"],
        display_order=row["display_order"],
        signed_url=_public_image_url(storage_path),
    )


@router.delete("/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_photo(
    photo_id: UUID,
    current_user: User = Depends(get_current_user),
) -> None:
    try:
        photo_res = (
            supabase.table("profile_images")
            .select("*")
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"写真の削除に失敗しました: {e.message}",
        )

    # メイン写真だった場合、残りの先頭をメインに設定（なければNULL）
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
    current_user: User = Depends(get_current_user),
) -> ProfileResponse:
    try:
        res = (
            supabase.table("profiles")
            .select("status")
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

    try:
        update_res = (
            supabase.table("profiles")
            .update(
                {
                    "status": "pending_review",
                    "rejection_reason": None,
                    "reviewed_at": None,
                }
            )
            .eq("id", str(current_user.id))
            .execute()
        )
    except APIError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"再申請に失敗しました: {e.message}",
        )

    if not update_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="プロフィールが見つかりません",
        )

    photos = _fetch_photos(str(current_user.id))
    return ProfileResponse(**update_res.data[0], photos=photos)


@router.post("/ping")
async def ping(
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
) -> Response:
    user_id = str(current_user.id)

    # a) profile_images テーブルから全画像パスを取得
    try:
        images_res = (
            supabase.table("profile_images")
            .select("image_path")
            .eq("user_id", user_id)
            .execute()
        )
        profile_image_paths = [row["image_path"] for row in (images_res.data or [])]
    except Exception:
        profile_image_paths = []

    # b) Storage の profile-images バケットから全ファイルを削除
    if profile_image_paths:
        try:
            supabase.storage.from_("profile-images").remove(profile_image_paths)
        except Exception as e:
            logger.warning("profile-images 削除失敗 user=%s: %s", user_id, e)

    # c) student_id_image_path があれば student-ids バケットから削除
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
                logger.warning("student-ids 削除失敗 user=%s: %s", user_id, e)
    except Exception as e:
        logger.warning("profiles 取得失敗 user=%s: %s", user_id, e)

    # d) profiles テーブルから削除（CASCADE で関連テーブルも消える）
    try:
        supabase.table("profiles").delete().eq("id", user_id).execute()
    except Exception as e:
        logger.error("profiles 削除失敗 user=%s: %s", user_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="アカウントの削除に失敗しました",
        )

    # e) auth.users から削除
    try:
        supabase.auth.admin.delete_user(user_id)
    except Exception as e:
        logger.error(
            "auth.users 削除失敗 user=%s (profiles は削除済み): %s", user_id, e
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="アカウントの削除に失敗しました",
        )

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/photos/{photo_id}/set-main")
async def set_main_photo(
    photo_id: UUID,
    current_user: User = Depends(get_current_user),
) -> dict:
    try:
        photo_res = (
            supabase.table("profile_images")
            .select("*")
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

    try:
        supabase.table("profiles").update(
            {"profile_image_path": photo["image_path"]}
        ).eq("id", str(current_user.id)).execute()
    except APIError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"メイン写真の設定に失敗しました: {e.message}",
        )

    return {"ok": True}
