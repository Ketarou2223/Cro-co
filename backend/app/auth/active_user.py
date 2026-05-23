from fastapi import Depends, HTTPException, status
from gotrue.types import User

from app.auth.dependencies import get_current_user
from app.core.supabase_client import supabase


async def get_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """BANされたユーザーをすべてのエンドポイントからブロックする依存関数。"""
    try:
        res = (
            supabase.table("profiles")
            .select("status")
            .eq("id", str(current_user.id))
            .single()
            .execute()
        )
        if res.data and res.data.get("status") == "banned":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="このアカウントは利用停止されています",
            )
    except HTTPException:
        raise
    except Exception:
        pass
    return current_user
