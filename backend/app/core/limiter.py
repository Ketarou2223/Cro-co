# 解説: このファイルは「レート制限（Rate Limit）」の設定を行う。
# 解説: 「レート制限」= 同一ユーザーや同一 IP が一定時間内に API を呼びすぎないように制限する仕組み。
#       spam やブルートフォース攻撃を防ぐ。例: 「1分間に10回まで」
# 解説: 呼ばれる場所: main.py でアプリに設定される。各ルーターは @limiter.limit("N/min") デコレータで制限を指定する
# 解説: 呼ぶ先: slowapi ライブラリ（FastAPI 向けレート制限ライブラリ）
#
# 解説: 使用ライブラリ:
#   base64  = バイナリデータを文字列に変換するエンコード。JWT のペイロード（中身）のデコードに使う
#   json    = JSON 文字列を Python の辞書に変換する標準ライブラリ
#   slowapi = FastAPI 向けレート制限ライブラリ（Limiter クラス）
#   get_remote_address = クライアントの IP アドレスを取得するユーティリティ関数

# 解説: base64 エンコード/デコードのための標準ライブラリ（JWT ペイロード解析に使う）
import base64
# 解説: JSON 文字列 ↔ Python 辞書の変換ライブラリ
import json
import logging

from fastapi import Request
# 解説: FastAPI 向けレート制限ライブラリ。Limiter オブジェクトを作るために使う
from slowapi import Limiter
# 解説: クライアントの IP アドレスを取得するユーティリティ関数
from slowapi.util import get_remote_address

logger = logging.getLogger(__name__)


# 解説: レート制限のバケツ（制限の単位）を決めるキーを生成する関数
# 解説: 「バケツキー」= 「同じキーを持つリクエストをまとめてカウントする」ための識別子
#       ユーザーID が取れればユーザー単位、取れなければ IP アドレス単位で制限する
def _get_user_key(request: Request) -> str:
    """Rate limit バケツキー: JWT sub（ユーザー UUID）が取れればそれを使い、
    取れない場合はリモート IP にフォールバック。

    ★これはバケツ仕分けキーであり認証チェックではない。
    署名検証は行わず、JWT ペイロードから sub を取り出すだけ。
    認証は get_active_user / get_current_user が担う。

    ★XFF（X-Forwarded-For）は意図的に信頼しない。
    get_remote_address は proxy ヘッダを読まないため、
    XFF 詐称によるバイパスは構造的に不可能。
    """
    try:
        # 解説: Authorization ヘッダを取得する（Bearer トークンが入っているはず）
        auth = request.headers.get("Authorization", "")
        # 解説: "Bearer " で始まる場合だけ JWT として処理する
        if auth.startswith("Bearer "):
            # 解説: "Bearer " の7文字を除いた残りが JWT 本体
            token = auth[len("Bearer "):]
            # 解説: JWT は "ヘッダ.ペイロード.署名" の3パートを "." で区切った文字列
            parts = token.split(".")
            # 解説: 3パートに分かれていれば正しい JWT 形式
            if len(parts) == 3:
                # JWT ペイロードは base64url（パディングなし）
                # 解説: base64url はパディング "=" を省略する形式。デコードするために必要な "=" を補う
                #       (-len % 4) = 不足しているパディング文字数を計算するトリック
                padded = parts[1] + "=" * (-len(parts[1]) % 4)
                # 解説: base64url デコードして JSON 文字列を取得し、Python 辞書に変換する
                payload = json.loads(base64.urlsafe_b64decode(padded))
                # 解説: JWT の "sub"（subject）クレーム = ユーザーの UUID
                sub = payload.get("sub")
                # 解説: sub が取れたらユーザー ID をキーとして返す（"user:UUID" 形式）
                if sub:
                    return f"user:{sub}"
    # 解説: JWT の解析に失敗した場合はデバッグログだけ残して IP フォールバックへ進む
    except Exception:
        logger.debug("rate limit key fallback to IP（JWT sub 取得不可）", exc_info=True)
    # 解説: JWT が取れない場合は IP アドレスをキーとして返す（"ip:x.x.x.x" 形式）
    return f"ip:{get_remote_address(request)}"


# 解説: アプリ全体で使う Limiter オブジェクト。key_func に上記 _get_user_key を指定する
# 解説: main.py でこの limiter を app.state.limiter に登録して有効化する
limiter = Limiter(key_func=_get_user_key)
