import logging

import resend

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_match_notification(user_email: str, matched_user_name: str) -> None:
    if not settings.resend_api_key:
        logger.info("RESEND_API_KEY が未設定のためメール送信をスキップ")
        return

    resend.api_key = settings.resend_api_key

    try:
        resend.Emails.send({
            "from": settings.from_email,
            "to": user_email,
            "subject": "💕 マッチしました！",
            "html": (
                f"<p>{matched_user_name}さんとマッチしました！</p>"
                "<p>今すぐメッセージを送ってみましょう。</p>"
                '<p><a href="http://localhost:5173/matches">Cro-coを開く</a></p>'
            ),
        })
    except Exception as e:
        logger.error("マッチ通知メールの送信に失敗しました: %s", e)


def send_message_notification(user_email: str, sender_name: str) -> None:
    if not settings.resend_api_key:
        logger.info("RESEND_API_KEY が未設定のためメール送信をスキップ")
        return

    resend.api_key = settings.resend_api_key

    try:
        resend.Emails.send({
            "from": settings.from_email,
            "to": user_email,
            "subject": "💬 新しいメッセージが届いています",
            "html": (
                f"<p>{sender_name}さんからメッセージが届きました。</p>"
                '<p><a href="http://localhost:5173/matches">Cro-coを開く</a></p>'
            ),
        })
    except Exception as e:
        logger.error("メッセージ通知メールの送信に失敗しました: %s", e)
