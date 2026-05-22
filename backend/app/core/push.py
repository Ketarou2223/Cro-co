import json
import logging
from pywebpush import WebPushException, webpush
from app.core.config import settings

logger = logging.getLogger(__name__)


def _send_one(subscription: dict, title: str, body: str, url: str) -> bool:
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
        return True
    except WebPushException as e:
        logger.warning("Push送信失敗 endpoint=%s: %s",
                       subscription.get("endpoint", "")[:40], e)
        return False
    except Exception as e:
        logger.warning("Push送信エラー: %s", e)
        return False


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
        ok = _send_one(sub, title, body, url)
        logger.info("Push送信結果 ok=%s endpoint=%s", ok, sub["endpoint"][:50])
        if not ok:
            expired_ids.append(sub["id"])

    if expired_ids:
        try:
            supabase.table("push_subscriptions").delete().in_("id", expired_ids).execute()
        except Exception:
            pass
