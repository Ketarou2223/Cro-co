from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from gotrue.types import User
from postgrest.exceptions import APIError

from app.auth.dependencies import get_current_user
from app.core.supabase_client import supabase
from app.schemas.profile import ProfileResponse, ProfileUpdateRequest

_AVATAR_SIGNED_URL_SECONDS = 300  # 5分

router = APIRouter(prefix="/api/profile", tags=["profile"])

_MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
_ALLOWED_MIME_TYPES = {"image/jpeg", "image/png"}
_MIME_TO_EXT = {"image/jpeg": "jpg", "image/png": "png"}


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
    return ProfileResponse(**response.data)


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
    # MIMEタイプ検証
    if file.content_type not in _ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="JPEGまたはPNG形式の画像のみアップロードできます",
        )

    # サイズ検証（全読み込み後にチェック）
    file_bytes = await file.read()
    if len(file_bytes) > _MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="ファイルサイズは5MB以下にしてください",
        )

    # ファイル名はユーザーIDとタイムスタンプで生成（元ファイル名は使わない）
    ext = _MIME_TO_EXT[file.content_type]
    timestamp = int(datetime.now(timezone.utc).timestamp())
    storage_path = f"{current_user.id}/student_id_{timestamp}.{ext}"

    # Supabase Storage にアップロード（service_role で実行）
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

    # profiles テーブルを更新
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
    # MIMEタイプ検証
    if file.content_type not in _ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="JPEGまたはPNG形式の画像のみアップロードできます",
        )

    # サイズ検証
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

    try:
        signed = supabase.storage.from_("profile-images").create_signed_url(
            path=path,
            expires_in=_AVATAR_SIGNED_URL_SECONDS,
        )
        return {"signed_url": signed.get("signedURL")}
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="署名付きURLの生成に失敗しました",
        )
