from fastapi import Depends, HTTPException, status
from gotrue.types import User
from postgrest.exceptions import APIError

from app.auth.active_user import get_active_user
from app.core.supabase_client import supabase


async def get_approved_user(
    current_user: User = Depends(get_active_user),
) -> User:
    """承認済み（status='approved'）ユーザーのみ通す依存関数。

    banned/deleted/行欠落は get_active_user が先に 403/503 で弾く。
    ここでは残った pending_review / rejected を追加で弾く。
    """
    try:
        res = (
            supabase.table("profiles")
            .select("status")
            .eq("id", str(current_user.id))
            .single()
            .execute()
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="サービスに接続できませんでした",
        )
    if not res.data:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="サービスに接続できませんでした",
        )
    if res.data.get("status") != "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="承認済みユーザーのみ操作できます",
        )
    return current_user
