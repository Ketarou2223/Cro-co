# 解説: このファイルは「Web Push 通知」の購読管理 API を定義する。
# 解説: 呼ばれる場所: main.py で app.include_router(push.router) として登録される
# 解説: エンドポイント一覧:
#   GET    /api/push/vapid-public-key  → VAPID 公開鍵を返す（認証不要・ブラウザが購読時に使う）
#   POST   /api/push/subscribe         → Push 購読情報を登録・更新する
#   DELETE /api/push/subscribe         → 特定の Push 購読を削除する
#   DELETE /api/push/subscribe/all     → ユーザーの全 Push 購読を削除する
#   POST   /api/push/test              → テスト用 Push 通知を送る（5回/分）
# 解説: 「Web Push 購読」= ブラウザが Push 通知を受け取るための情報（endpoint / p256dh / auth）。
#       ブラウザが提供する Push サーバー URL（endpoint）と暗号化キーのセット。

from fastapi import APIRouter, BackgroundTasks, Depends, Request
from supabase_auth.types import User
from pydantic import BaseModel

from app.auth.active_user import get_active_user
from app.core.config import settings
from app.core.limiter import limiter
from app.core.supabase_client import supabase

router = APIRouter(prefix="/api/push", tags=["push"])


# 解説: PushSubscribeRequest = ブラウザが送ってくる Push 購読情報のスキーマ
class PushSubscribeRequest(BaseModel):
    # 解説: endpoint = ブラウザの Push サーバーの URL（ブラウザベンダーごとに異なる）
    endpoint: str
    # 解説: p256dh = メッセージ暗号化用の公開鍵（Base64 URL エンコード）
    p256dh: str
    # 解説: auth = 認証シークレット（暗号化強度を上げるための乱数）
    auth: str
    user_agent: str | None = None


# 解説: GET /api/push/vapid-public-key = VAPID 公開鍵を返す（認証不要）
# 解説: VAPID（Voluntary Application Server Identification）= Push 通知送信者が本物かを証明する仕組み
@router.get("/vapid-public-key")
def get_vapid_public_key() -> dict:
    """VAPID公開鍵を返す（認証不要）"""
    # 解説: settings.vapid_public_key = .env から読み込んだ VAPID 公開鍵文字列
    return {"public_key": settings.vapid_public_key}


# 解説: POST /api/push/subscribe = Push 購読情報を DB に保存（upsert: 同じ endpoint なら上書き）
@router.post("/subscribe")
def subscribe(req: PushSubscribeRequest, user: User = Depends(get_active_user)) -> dict:
    """Push購読情報を保存する"""
    # 解説: on_conflict="user_id,endpoint" = 同じユーザー・同じ endpoint なら INSERT ではなく UPDATE
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


# 解説: DELETE /api/push/subscribe = 指定した endpoint の購読を削除する（特定デバイスのみ解除）
@router.delete("/subscribe")
def unsubscribe(endpoint: str, user: User = Depends(get_active_user)) -> dict:
    """Push購読を解除する"""
    # 解説: user_id と endpoint の両方が一致するレコードだけを削除する
    supabase.table("push_subscriptions").delete().eq(
        "user_id", str(user.id)
    ).eq("endpoint", endpoint).execute()
    return {"ok": True}


# 解説: DELETE /api/push/subscribe/all = このユーザーの全 Push 購読を削除する（ログアウト等に使う）
@router.delete("/subscribe/all")
def unsubscribe_all(user: User = Depends(get_active_user)) -> dict:
    """このユーザーの全購読を削除する"""
    supabase.table("push_subscriptions").delete().eq(
        "user_id", str(user.id)
    ).execute()
    return {"ok": True}


# 解説: POST /api/push/test = テスト用 Push 通知を送るエンドポイント（5回/分）
@router.post("/test")
@limiter.limit("5/minute")
def send_test_push(
    request: Request,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_active_user),
) -> dict:
    """通知テスト用エンドポイント"""
    # 解説: send_push_to_user をここでインポートするのは循環インポート回避のため
    from app.core.push import send_push_to_user
    # 解説: バックグラウンドでテスト通知を送る（レスポンスを先に返してから実行）
    background_tasks.add_task(
        send_push_to_user,
        str(user.id),
        "テスト通知",
        "プッシュ通知が動いてる。",
        "/settings",
    )
    return {"ok": True}
