from fastapi import APIRouter, BackgroundTasks, Depends
from gotrue.types import User
from pydantic import BaseModel

from app.auth.active_user import get_active_user
from app.core.config import settings
from app.core.supabase_client import supabase

router = APIRouter(prefix="/api/push", tags=["push"])


class PushSubscribeRequest(BaseModel):
    endpoint: str
    p256dh: str
    auth: str
    user_agent: str | None = None


@router.get("/vapid-public-key")
def get_vapid_public_key() -> dict:
    """VAPID公開鍵を返す（認証不要）"""
    return {"public_key": settings.vapid_public_key}


@router.post("/subscribe")
def subscribe(req: PushSubscribeRequest, user: User = Depends(get_active_user)) -> dict:
    """Push購読情報を保存する"""
    supabase.table("push_subscriptions").upsert(
        {
            "user_id": str(user.id),
            "endpoint": req.endpoint,
            "p256dh": req.p256dh,
            "auth": req.auth,
            "user_agent": req.user_agent,
        },
        on_conflict="user_id,endpoint",
    ).execute()
    return {"ok": True}


@router.delete("/subscribe")
def unsubscribe(endpoint: str, user: User = Depends(get_active_user)) -> dict:
    """Push購読を解除する"""
    supabase.table("push_subscriptions").delete().eq(
        "user_id", str(user.id)
    ).eq("endpoint", endpoint).execute()
    return {"ok": True}


@router.delete("/subscribe/all")
def unsubscribe_all(user: User = Depends(get_active_user)) -> dict:
    """このユーザーの全購読を削除する"""
    supabase.table("push_subscriptions").delete().eq(
        "user_id", str(user.id)
    ).execute()
    return {"ok": True}


@router.post("/test")
def send_test_push(
    background_tasks: BackgroundTasks,
    user: User = Depends(get_active_user),
) -> dict:
    """通知テスト用エンドポイント"""
    from app.core.push import send_push_to_user
    background_tasks.add_task(
        send_push_to_user,
        str(user.id),
        "テスト通知",
        "プッシュ通知が動いてる。",
        "/settings",
    )
    return {"ok": True}


@router.get("/debug/all")
def debug_all_subscriptions(user: User = Depends(get_active_user)) -> dict:
    """デバッグ用: 全購読を返す（本人のものだけ）"""
    res = supabase.table("push_subscriptions").select(
        "id, endpoint, user_agent, created_at"
    ).eq("user_id", str(user.id)).execute()
    return {"count": len(res.data), "subscriptions": res.data}
