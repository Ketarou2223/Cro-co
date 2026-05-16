import html
import logging

import resend

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_match_notification(user_email: str, matched_user_name: str) -> None:
    if not settings.resend_api_key:
        logger.info("RESEND_API_KEY が未設定のためメール送信をスキップ")
        return

    resend.api_key = settings.resend_api_key
    safe_name = html.escape(matched_user_name)
    matches_url = f"{settings.frontend_url}/matches"

    try:
        resend.Emails.send({
            "from": settings.from_email,
            "to": user_email,
            "subject": "マッチしました！",
            "html": (
                f"<p>{safe_name}さんとマッチしました！</p>"
                "<p>今すぐメッセージを送ってみましょう。</p>"
                f'<p><a href="{matches_url}">Cro-coを開く</a></p>'
            ),
        })
    except Exception as e:
        logger.error("マッチ通知メールの送信に失敗しました: %s", e)


def send_message_notification(user_email: str, sender_name: str) -> None:
    if not settings.resend_api_key:
        logger.info("RESEND_API_KEY が未設定のためメール送信をスキップ")
        return

    resend.api_key = settings.resend_api_key
    safe_sender = html.escape(sender_name)
    matches_url = f"{settings.frontend_url}/matches"

    try:
        resend.Emails.send({
            "from": settings.from_email,
            "to": user_email,
            "subject": "新しいメッセージが届いています",
            "html": (
                f"<p>{safe_sender}さんからメッセージが届きました。</p>"
                f'<p><a href="{matches_url}">Cro-coを開く</a></p>'
            ),
        })
    except Exception as e:
        logger.error("メッセージ通知メールの送信に失敗しました: %s", e)
