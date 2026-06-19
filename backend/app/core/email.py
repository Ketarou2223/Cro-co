# 解説: このファイルは「メール送信」の関数をまとめたユーティリティ。
# 解説: 呼ばれる場所:
#   - like.py / match.py: マッチ成立時に send_match_notification を呼ぶ
#   - message.py: 新着メッセージ通知に send_message_notification を呼ぶ
#   - inquiries.py: 問い合わせ受信時に send_inquiry_notification_to_admin を呼ぶ
#   ※ いずれも FastAPI の BackgroundTasks 経由で非同期に呼ばれる（レスポンス後に実行）
# 解説: 呼ぶ先: resend（外部メール送信サービス）の API
# 解説: データの流れ: ルーター → BackgroundTasks.add_task(send_xxx) → resend API → ユーザーのメール受信箱
#
# 解説: 使用ライブラリ:
#   html    = Python 標準の HTML エスケープライブラリ。html.escape() で < > & などを安全な文字列に変換する
#             （XSS という「悪意あるスクリプトを埋め込む攻撃」を防ぐため必須）
#   logging = Python 標準のログ出力ライブラリ
#   resend  = メール送信サービス「Resend」の Python SDK。RESEND_API_KEY が必要

# 解説: Python 標準の HTML エスケープライブラリ（XSS 対策に使う）
import html
# 解説: ログ出力ライブラリ
import logging

# 解説: 外部メール送信サービス Resend の Python SDK
import resend

# 解説: アプリの設定値（API キー・送信元メール・フロントエンド URL 等）を管理するオブジェクト
from app.core.config import settings

# 解説: このファイル専用のロガーを作る
logger = logging.getLogger(__name__)


# 解説: マッチ成立通知メールをユーザーに送る関数
def send_match_notification(user_email: str, matched_user_name: str) -> None:
    # 解説: API キーが未設定（開発環境など）なら送信をスキップしてログだけ残す
    if not settings.resend_api_key:
        logger.info("RESEND_API_KEY が未設定のためメール送信をスキップ")
        return

    # 解説: Resend SDK に API キーをセットする（ここでセットしないと認証エラーになる）
    resend.api_key = settings.resend_api_key
    # 解説: html.escape でユーザー名の < > & などを無害化する（XSS 対策）
    safe_name = html.escape(matched_user_name)
    # 解説: マッチ一覧ページへの URL を生成（メールの CTA リンクとして使う）
    matches_url = f"{settings.frontend_url}/matches"

    # 解説: try ブロック = メール送信失敗でも本処理（マッチ登録等）を止めないために囲む
    try:
        # 解説: resend.Emails.send に辞書でメール内容を渡して送信する
        resend.Emails.send({
            # 解説: from = 送信元アドレス（settings.from_email に設定）
            "from": settings.from_email,
            # 解説: to = 受信者のメールアドレス
            "to": user_email,
            # @copy CRO-email-match-subject-01 Lv1
            # 解説: subject = メールの件名
            "subject": "マッチしました！",
            # 解説: html = メール本文（HTML 形式）。f-string でユーザー名と URL を埋め込む
            "html": (
                # @copy CRO-email-match-body-01 Lv1
                f"<p>{safe_name}さんとマッチしました！</p>"
                # @copy CRO-email-match-body-02 Lv1
                "<p>ぜひメッセージを送ってみてください。</p>"
                # @copy CRO-email-match-cta-01 Lv1
                f'<p><a href="{matches_url}">Cro-coを開く</a></p>'
            ),
        })
    # 解説: 送信失敗（ネットワーク・API エラー等）をキャッチしてエラーログに残す
    except Exception as e:
        logger.error("マッチ通知メールの送信に失敗しました: %s", e)


# 解説: 新着メッセージ通知メールをユーザーに送る関数
def send_message_notification(user_email: str, sender_name: str) -> None:
    # 解説: API キーが未設定なら送信をスキップ
    if not settings.resend_api_key:
        logger.info("RESEND_API_KEY が未設定のためメール送信をスキップ")
        return

    # 解説: Resend SDK に API キーをセット
    resend.api_key = settings.resend_api_key
    # 解説: 送信者名を HTML エスケープ（XSS 対策）
    safe_sender = html.escape(sender_name)
    # 解説: マッチ一覧ページへの URL を生成
    matches_url = f"{settings.frontend_url}/matches"

    try:
        resend.Emails.send({
            "from": settings.from_email,
            "to": user_email,
            # @copy CRO-email-message-subject-01 Lv1
            "subject": "新しいメッセージが届いています",
            "html": (
                # @copy CRO-email-message-body-01 Lv1
                f"<p>{safe_sender}さんからメッセージが届きました。</p>"
                # @copy CRO-email-message-cta-01 Lv1
                f'<p><a href="{matches_url}">Cro-coを開く</a></p>'
            ),
        })
    except Exception as e:
        logger.error("メッセージ通知メールの送信に失敗しました: %s", e)


# 解説: お問い合わせカテゴリの内部キーを日本語ラベルに変換するテーブル
_INQUIRY_CATEGORY_LABEL = {
    "bug": "バグ報告",
    "feature": "機能要望",
    "account": "アカウント相談",
    "report": "通報について",
    "other": "その他",
}


# 解説: 問い合わせ受信時に管理者全員に通知メールを送る関数
def send_inquiry_notification_to_admin(
    # 解説: admin_emails = 通知先の管理者メールアドレスのリスト（複数人に同時送信できる）
    admin_emails: list[str],
    # 解説: category = 問い合わせカテゴリのキー（例: "bug" / "feature"）
    category: str,
    # 解説: subject = 問い合わせの件名
    subject: str,
    # 解説: user_email = 問い合わせを送ってきたユーザーのメールアドレス
    user_email: str,
) -> None:
    """ユーザー問い合わせ受信時に管理者へ通知メールを送る。失敗しても例外は投げない。"""
    # 解説: API キーが未設定なら送信をスキップ
    if not settings.resend_api_key:
        logger.info("RESEND_API_KEY が未設定のためメール送信をスキップ")
        return
    # 解説: 管理者メールリストが空なら送信をスキップ（宛先なしで送ると API エラーになる）
    if not admin_emails:
        logger.warning("ADMIN_EMAILS が未設定のため問い合わせ通知をスキップ")
        return

    # 解説: Resend SDK に API キーをセット
    resend.api_key = settings.resend_api_key
    # 解説: カテゴリキーを日本語ラベルに変換（辞書にないキーはそのまま表示）
    category_label = _INQUIRY_CATEGORY_LABEL.get(category, category)
    # 解説: 以下4行は HTML エスケープ（メール本文に埋め込む全ての外部入力値を無害化する）
    safe_subject = html.escape(subject)
    safe_category = html.escape(category_label)
    # 解説: user_email が None/空文字の場合は「（不明）」に置き換える
    safe_user_email = html.escape(user_email or "（不明）")
    # 解説: 管理画面の問い合わせタブへの URL
    admin_url = f"{settings.frontend_url}/admin?tab=inquiries"

    try:
        resend.Emails.send({
            "from": settings.from_email,
            # 解説: to にリストを渡すと複数人に同時送信できる（Resend の仕様）
            "to": admin_emails,
            # 解説: 件名にカテゴリラベルを含めて分類しやすくする
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
