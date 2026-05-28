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


_INQUIRY_CATEGORY_LABEL = {
    "bug": "バグ報告",
    "feature": "機能要望",
    "account": "アカウント相談",
    "report": "通報について",
    "other": "その他",
}


def send_inquiry_notification_to_admin(
    admin_emails: list[str],
    category: str,
    subject: str,
    user_email: str,
) -> None:
    """ユーザー問い合わせ受信時に管理者へ通知メールを送る。失敗しても例外は投げない。"""
    if not settings.resend_api_key:
        logger.info("RESEND_API_KEY が未設定のためメール送信をスキップ")
        return
    if not admin_emails:
        logger.warning("ADMIN_EMAILS が未設定のため問い合わせ通知をスキップ")
        return

    resend.api_key = settings.resend_api_key
    category_label = _INQUIRY_CATEGORY_LABEL.get(category, category)
    safe_subject = html.escape(subject)
    safe_category = html.escape(category_label)
    safe_user_email = html.escape(user_email or "（不明）")
    admin_url = f"{settings.frontend_url}/admin?tab=inquiries"

    try:
        resend.Emails.send({
            "from": settings.from_email,
            "to": admin_emails,
            "subject": f"[Cro-co] 新しい問い合わせ: {category_label}",
            "html": (
                "<p>新しい問い合わせが届きました。</p>"
                f"<p>カテゴリ: {safe_category}<br>"
                f"件名: {safe_subject}<br>"
                f"送信者: {safe_user_email}</p>"
                f'<p><a href="{admin_url}">管理画面で確認する</a></p>'
            ),
        })
    except Exception as e:
        logger.warning("問い合わせ通知メールの送信に失敗しました: %s", e)
