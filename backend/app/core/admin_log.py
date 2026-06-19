# 解説: このファイルは「管理者の操作履歴を DB に書き残す」ユーティリティを定義する。
# 解説: 呼ばれる場所: admin.py の各エンドポイント（承認・却下・BAN 等）が操作後に呼ぶ。
# 解説: 呼ぶ先: Supabase の admin_logs テーブル（INSERT）
# 解説: データの流れ: 管理者操作 → admin.py → この関数 → admin_logs テーブルに記録
#
# 解説: 使用ライブラリ:
#   logging = Python 標準の「ログ出力」ライブラリ。print の代わりにサーバーログへ記録する
#   Any     = 「何でも入れられる」型ヒント（typing モジュール）。辞書の値など型が決まらない時に使う
#   Request = FastAPI が受け取った HTTP リクエスト全体を表すオブジェクト
import logging
# 解説: Any 型をインポート（型ヒントで「何でも入れられる」を表現するため）
from typing import Any

# 解説: FastAPI の HTTP リクエストオブジェクト（IP アドレス・User-Agent を取得するために使う）
from fastapi import Request

# 解説: Supabase の Python クライアント（admin_logs テーブルへの INSERT に使う）
from app.core.supabase_client import supabase

# 解説: このファイル専用のロガーを作る。ログを出力すると "app.core.admin_log" というラベルで記録される
logger = logging.getLogger(__name__)


# 解説: 管理者操作を admin_logs テーブルに記録する関数。戻り値なし（-> None）
def log_admin_action(
    # 解説: admin_id = 操作した管理者のユーザー ID（UUID 文字列）
    admin_id: str,
    # 解説: admin_email = 操作した管理者のメールアドレス（ログで誰が操作したか確認するため）
    admin_email: str,
    # 解説: action = 何をしたか（例: "approve_user" / "ban_user"）
    action: str,
    # 解説: target_type = 操作対象の種類（例: "user" / "profile"）
    target_type: str,
    # 解説: target_id = 操作対象の ID（省略可能。None を許容するため str | None）
    target_id: str | None = None,
    # 解説: details = 補足情報を辞書で渡す（省略可能。例: {"reason": "規約違反"}）
    details: dict[str, Any] | None = None,
    # 解説: request = HTTP リクエストオブジェクト（省略可能。IP / User-Agent 取得のために渡す）
    request: Request | None = None,
) -> None:
    """管理者操作を admin_logs に記録。失敗しても本処理は止めない。"""
    # 解説: try ブロック = ログ記録が失敗しても本来の管理者操作を止めないために囲む
    try:
        # 解説: IP アドレスと User-Agent の初期値を None に設定
        ip = None
        ua = None
        # 解説: request が渡されたときだけ IP / User-Agent を取り出す（省略された場合は None のまま）
        if request:
            # 解説: request.client はクライアントの接続情報。None の場合もある（プロキシ経由等）
            ip = request.client.host if request.client else None
            # 解説: User-Agent = ブラウザ / OS 情報を示すヘッダー
            ua = request.headers.get("user-agent")

        # 解説: admin_logs テーブルに辞書形式で1行挿入する。.execute() で実際に DB に送信
        supabase.table("admin_logs").insert({
            # 解説: 以下の各キーが admin_logs テーブルの列名に対応する
            "admin_id": admin_id,
            "admin_email": admin_email,
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            # 解説: details が None なら空辞書 {} を入れる（None のまま DB に送ると型エラーになる）
            "details": details or {},
            "ip_address": ip,
            "user_agent": ua,
        }).execute()
    # 解説: DB 接続失敗・INSERT エラー等の例外をキャッチし、ログに記録して処理を続行する
    except Exception as e:
        # 解説: logger.error = エラーレベルのログを出力（%s に e の内容が入る）
        logger.error("admin_logs記録失敗: %s", e)
