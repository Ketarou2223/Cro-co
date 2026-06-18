# 解説: このファイルは「承認済みユーザーだけ通す門番関数」を定義する。
# 解説: 呼ばれる場所: browse.py / like.py / match.py / message.py / ws.py など社交機能 API が
#       Depends(get_approved_user) として使う。
# 解説: 呼ぶ先: get_active_user（BAN・退会済みチェック済みのアクティブユーザーを受け取る）
#              + Supabase の profiles テーブル（status 列を確認する）
# 解説: データの流れ:
#       リクエスト → get_active_user（BAN/退会チェック）→ この関数（審査中/却下チェック）→ ルーター処理
#
# 解説: 使用ライブラリ:
#   FastAPI の Depends = 「この関数の引数を別の関数の戻り値で自動的に埋める」仕組み
#                        正式名称: 依存注入（Dependency Injection）
#   HTTPException    = HTTP エラーを返すための例外クラス。raise するとエラーレスポンスを返す
#   status           = HTTP ステータスコード（200 / 403 / 503 など）の定数集
#   User             = supabase_auth が提供するユーザー情報の型（id / email 等を持つ）
#   APIError         = postgrest（Supabase の DB アクセス層）が出す例外の型（現在はインポートのみ）

# 解説: FastAPI の依存注入・エラー処理・ステータスコードをまとめてインポート
from fastapi import Depends, HTTPException, status
# 解説: Supabase Auth のユーザー型。current_user はこの型のオブジェクト（id・email などを持つ）
from supabase_auth.types import User
# 解説: Supabase の DB アクセス（postgrest）が出すエラーの型。直接使っていないが将来のために残す
from postgrest.exceptions import APIError

# 解説: BAN・退会済みを先に弾いてアクティブなユーザーだけを返す関数（active_user.py に定義）
from app.auth.active_user import get_active_user
# 解説: Supabase の Python クライアント。.table(...) で DB 操作を行う
from app.core.supabase_client import supabase


# 解説: FastAPI の「依存関数」として使う非同期関数。
#       async def = DB 待ち時間の間も他のリクエストを処理できる効率的な書き方
async def get_approved_user(
    # 解説: Depends(get_active_user) = 「まず get_active_user を呼び、その戻り値をここに入れる」指示
    #       つまり BAN・退会チェックを通過した current_user だけがこの関数に来る
    current_user: User = Depends(get_active_user),
) -> User:
    """承認済み（status='approved'）ユーザーのみ通す依存関数。

    banned/deleted/行欠落は get_active_user が先に 403/503 で弾く。
    ここでは残った pending_review / rejected を追加で弾く。
    """
    # 解説: try ブロック = DB アクセス中に予期しないエラーが起きてもアプリが止まらないように囲む
    try:
        # 解説: Supabase の profiles テーブルから、ログイン中ユーザーの status 列だけを1件取得する
        res = (
            # 解説: .table("profiles") = profiles テーブルを操作対象に指定
            supabase.table("profiles")
            # 解説: .select("status") = status 列だけ取得（SELECT * を使わずパフォーマンスを守る）
            .select("status")
            # 解説: .eq("id", ...) = id が current_user.id と一致する行に絞る（SQL の WHERE id = '...'）
            .eq("id", str(current_user.id))
            # 解説: .single() = 必ず1件だけ返すと明示。0件 / 2件以上のときは例外を出す
            .single()
            # 解説: .execute() = ここで実際に Supabase（PostgreSQL）にリクエストを送信する
            .execute()
        )
    # 解説: get_active_user が既に raise した HTTPException は素通りさせる（二重ラップしない）
    except HTTPException:
        raise
    # 解説: それ以外の例外（DB 接続タイムアウト等）はサービス障害として 503 を返す
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="サービスに接続できませんでした",
        )
    # 解説: res.data が空（None / {}）= プロフィール行が存在しなかった = DB 異常とみなして 503
    if not res.data:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="サービスに接続できませんでした",
        )
    # 解説: status が "approved" 以外（pending_review / rejected）なら 403 を返して処理を止める
    if res.data.get("status") != "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="承認済みユーザーのみ操作できます",
        )
    # 解説: 全チェックを通過したら current_user をそのまま返す。呼び出し元のルーターが受け取る
    return current_user
