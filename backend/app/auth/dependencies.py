# 解説: このファイルは FastAPI の認証依存関数を定義する（§5 保護ファイル・ロジック変更禁止）。
# 解説: get_current_user = Authorization: Bearer <JWT> ヘッダーを検証し Supabase の User オブジェクトを返す
# 解説: require_admin = get_current_user を経由してさらに admin_emails リストと照合し、管理者以外は 403 を返す
# 解説: _security = HTTPBearer() が Authorization ヘッダーを自動抽出する FastAPI の仕組み
# 解説: 呼び出し元: 全エンドポイントの Depends(get_current_user) / Depends(require_admin)
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase_auth.types import User

from app.core.config import settings
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


async def require_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    # BAN/deleted チェック（admin も通過させない。active_user と同等ロジックをインライン）
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
    email = current_user.email or ""
    if email.lower() not in settings.admin_emails:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="管理者権限が必要です",
        )
    return current_user
