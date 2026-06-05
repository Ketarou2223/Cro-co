from fastapi import Depends, HTTPException, status
from gotrue.types import User

from app.auth.dependencies import get_current_user
from app.core.supabase_client import supabase


async def get_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """BAN/削除済みユーザーをすべてのエンドポイントからブロックする依存関数。"""
    try:
        res = (
            supabase.table("profiles")
            .select("status")
            .eq("id", str(current_user.id))
            .single()
            .execute()
        )
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="サービスに接続できませんでした",
            )
        if res.data.get("status") in ("banned", "deleted"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="このアカウントは利用できません",
            )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="サービスに接続できませんでした",
        )
    return current_user
