import json
import logging
from pywebpush import WebPushException, webpush
from app.core.config import settings

logger = logging.getLogger(__name__)


def _send_one(subscription: dict, title: str, body: str, url: str) -> tuple[bool, bool]:
    """
    return (success, is_expired)
    is_expired=True なら DB から削除すべき購読（410/404）
    """
    try:
        webpush(
            subscription_info={
                "endpoint": subscription["endpoint"],
                "keys": {
                    "p256dh": subscription["p256dh"],
                    "auth": subscription["auth"],
                },
            },
            data=json.dumps({"title": title, "body": body, "url": url}),
            vapid_private_key=settings.vapid_private_key,
            vapid_claims={"sub": settings.vapid_email},
        )
        return True, False
    except WebPushException as e:
        status = getattr(e.response, "status_code", None) if e.response else None
        is_expired = status in (404, 410)
        logger.warning("Push送信失敗 status=%s endpoint=%s: %s",
                       status, subscription.get("endpoint", "")[:40], e)
        return False, is_expired
    except Exception as e:
        logger.warning("Push送信エラー: %s", e)
        return False, False


def send_push_to_user(user_id: str, title: str, body: str, url: str = "/") -> None:
    """同期関数として実装（BackgroundTasksから呼ぶため）"""
    logger.info("send_push_to_user called: user_id=%s, title=%s", user_id, title)

    if not settings.vapid_private_key:
        logger.warning("VAPID private key not set")
        return

    from app.core.supabase_client import supabase

    try:
        res = (
            supabase.table("push_subscriptions")
            .select("id, endpoint, p256dh, auth")
            .eq("user_id", user_id)
            .execute()
        )
    except Exception as e:
        logger.error("push_subscriptions 取得失敗 user_id=%s: %s", user_id, e)
        return

    if not res.data:
        logger.info("購読なし user_id=%s", user_id)
        return

    logger.info("購読件数=%d for user_id=%s", len(res.data), user_id)

    expired_ids: list[str] = []
    for sub in res.data:
        ok, is_expired = _send_one(sub, title, body, url)
        logger.info("Push送信結果 ok=%s is_expired=%s endpoint=%s", ok, is_expired, sub["endpoint"][:50])
        if is_expired:
            expired_ids.append(sub["id"])

    if expired_ids:
        try:
            supabase.table("push_subscriptions").delete().in_("id", expired_ids).execute()
        except Exception:
            pass
