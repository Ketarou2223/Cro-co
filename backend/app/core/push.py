# 解説: このファイルは「プッシュ通知（Web Push）を送信する」ユーティリティを定義する。
# 解説: 「Web Push」= ブラウザ経由でスマートフォンやPCに通知を送る仕組み。
#       アプリを開いていなくても届く。VAPID キーという認証情報が必要。
# 解説: 呼ばれる場所: like.py / match.py / message.py / notifications.py 等が
#       BackgroundTasks 経由で send_push_to_user を呼ぶ（非同期・レスポンス後に実行）
# 解説: 呼ぶ先: pywebpush ライブラリ → ブラウザのプッシュサービス（FCM 等）→ ユーザーのデバイス
# 解説: データの流れ:
#   ルーター → BackgroundTasks.add_task(send_push_to_user) → Supabase（購読情報取得）→ _send_one → プッシュ送信
#
# 解説: 使用ライブラリ:
#   pywebpush = Web Push プロトコルを実装したライブラリ。webpush() 関数で通知を送る
#   VAPID    = 「Voluntary Application Server Identification」= プッシュサービスへの認証方式
#   WebPushException = webpush() が失敗した時に投げる例外クラス

# 解説: JSON 文字列の変換ライブラリ（通知データを JSON 形式にして送るため）
import json
import logging
# 解説: pywebpush = Web Push 送信ライブラリ。WebPushException = 送信失敗の例外
from pywebpush import WebPushException, webpush
from app.core.config import settings

logger = logging.getLogger(__name__)


# 解説: 1件のプッシュ購読情報に対して通知を送る内部ヘルパ関数
# 解説: 戻り値のタプル = (成功フラグ, 期限切れフラグ)
def _send_one(subscription: dict, title: str, body: str, url: str) -> tuple[bool, bool]:
    """
    return (success, is_expired)
    is_expired=True なら DB から削除すべき購読（410/404）
    """
    try:
        # 解説: webpush() = 実際に Web Push プロトコルでブラウザのプッシュサービスにリクエストを送る
        webpush(
            # 解説: subscription_info = ブラウザが登録したプッシュ購読情報（endpoint と暗号化キー）
            subscription_info={
                # 解説: endpoint = プッシュサービス（FCM 等）のエンドポイント URL（購読ごとに固有）
                "endpoint": subscription["endpoint"],
                # 解説: keys = メッセージを暗号化するための公開鍵（p256dh）と認証シークレット（auth）
                "keys": {
                    "p256dh": subscription["p256dh"],
                    "auth": subscription["auth"],
                },
            },
            # 解説: data = 通知のペイロード（中身）を JSON 文字列で渡す
            data=json.dumps({"title": title, "body": body, "url": url}),
            # 解説: VAPID 秘密鍵で署名して、プッシュサービスに「このサーバーからの正規リクエスト」と証明する
            vapid_private_key=settings.vapid_private_key,
            # 解説: sub = 連絡先メールアドレス（VAPID の仕様で必須。問題発生時にプッシュサービスが連絡する）
            vapid_claims={"sub": settings.vapid_email},
        )
        # 解説: 送信成功 = (True, False)（成功・期限切れでない）
        return True, False
    # 解説: Web Push 固有のエラー（HTTP エラーレスポンス等）をキャッチ
    except WebPushException as e:
        # 解説: e.response が存在する場合は HTTP ステータスコードを取得する
        status = getattr(e.response, "status_code", None) if e.response else None
        # 解説: 404/410 = 購読が期限切れまたは削除済み。DB からも消すべき
        is_expired = status in (404, 410)
        if is_expired:
            # 解説: endpoint の先頭40文字だけログに出す（長い URL を短縮して見やすくする）
            logger.info("Push購読期限切れ削除 endpoint=%s",
                        subscription.get("endpoint", "")[:40])
        else:
            logger.warning("Push送信失敗 status=%s endpoint=%s: %s",
                           status, subscription.get("endpoint", "")[:40], e)
        # 解説: 送信失敗 = (False, is_expired)
        return False, is_expired
    # 解説: その他の予期しないエラー（ネットワーク断など）
    except Exception as e:
        logger.warning("Push送信エラー: %s", e)
        # 解説: 原因不明の失敗 = (False, False)（期限切れとは判断しない）
        return False, False


# 解説: 指定ユーザーの全プッシュ購読情報を取得して通知を送るメイン関数
def send_push_to_user(user_id: str, title: str, body: str, url: str = "/") -> None:
    """同期関数として実装（BackgroundTasksから呼ぶため）"""
    logger.info("send_push_to_user called: user_id=%s, title=%s", user_id, title)

    # 解説: VAPID 秘密鍵が設定されていなければプッシュ通知を送れない（開発環境などではスキップ）
    if not settings.vapid_private_key:
        logger.warning("VAPID private key not set")
        return

    # 解説: supabase をここでインポートする（循環インポートを防ぐための遅延インポート）
    from app.core.supabase_client import supabase

    # 解説: ユーザーのプッシュ購読情報を DB から取得する
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

    # 解説: 購読情報が0件ならプッシュ通知なし（通知をオフにしているユーザー等）
    if not res.data:
        logger.info("購読なし user_id=%s", user_id)
        return

    logger.info("購読件数=%d for user_id=%s", len(res.data), user_id)

    # 解説: 期限切れで削除すべき購読の ID を溜める
    expired_ids: list[str] = []
    # 解説: 取得した購読情報1件ずつに対してプッシュ通知を送る
    for sub in res.data:
        ok, is_expired = _send_one(sub, title, body, url)
        logger.info("Push送信結果 ok=%s is_expired=%s endpoint=%s", ok, is_expired, sub["endpoint"][:50])
        # 解説: 期限切れと判明した購読は削除リストに追加
        if is_expired:
            expired_ids.append(sub["id"])

    # 解説: 期限切れの購読が1件以上あれば DB から一括削除する
    if expired_ids:
        try:
            # 解説: .in_("id", expired_ids) = ID が expired_ids リストに含まれる行を削除
            supabase.table("push_subscriptions").delete().in_("id", expired_ids).execute()
        except Exception:
            # 解説: 削除失敗はエラーにしない（次回の通知時に再試行される）
            pass
