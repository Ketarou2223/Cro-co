from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from gotrue.types import User

from app.core.supabase_client import supabase

_security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_security),
) -> User:
    token = credentials.credentials
    try:
        response = supabase.auth.get_user(jwt=token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="認証に失敗しました",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if response.user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="認証に失敗しました",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return response.user
