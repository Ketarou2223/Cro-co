# 解説: このファイルは「Supabase Storage から署名付き URL を生成する」ユーティリティを定義する。
# 解説: 「署名付き URL（Signed URL）」= 有効期限付きのアクセス専用 URL。
#       非公開バケットの画像でも、この URL を知っていれば一時的にアクセスできる。
#       期限が切れると無効になるため、永続公開より安全。
# 解説: 呼ばれる場所: browse.py / profile.py など、プロフィール画像の URL が必要な全エンドポイント
# 解説: 呼ぶ先: Supabase Storage の "profile-images" バケット
# 解説: データの流れ: ルーター → get_signed_image_url(path) → Supabase Storage → 署名付き URL

# 解説: Supabase の Python クライアント（Storage API を使うために必要）
from app.core.supabase_client import supabase


# 解説: Storage 上の画像パスから署名付き URL を取得して返す関数
# 解説: path = 例 "user-id/avatar.jpg" のような Supabase Storage 内のファイルパス
# 解説: expires_in = URL の有効期限（秒）。デフォルトは 3600 秒 = 1時間
# 解説: 戻り値 str | None = URL 文字列 または 失敗時 None
def get_signed_image_url(path: str, expires_in: int = 3600) -> str | None:
    # 解説: try ブロック = Storage アクセス失敗時に None を返して処理を続行するために囲む
    try:
        # 解説: profile-images バケットに対して署名付き URL を生成する
        # 解説: .storage.from_("バケット名") = 操作対象のバケットを指定
        # 解説: .create_signed_url(path, seconds) = 指定パスの画像に有効期限付き URL を発行
        res = supabase.storage.from_("profile-images").create_signed_url(path, expires_in)
        # 解説: Supabase Python SDK のバージョンによって返却形式が異なる（辞書 or オブジェクト）ため両対応
        if isinstance(res, dict):
            # 解説: 辞書形式の場合は "signedURL"（旧 SDK）または "signed_url"（新 SDK）のキーを取る
            return res.get("signedURL") or res.get("signed_url")
        # 解説: オブジェクト形式の場合は属性として取得する（getattr = 属性がなければ None を返す）
        return getattr(res, "signed_url", None) or getattr(res, "signedURL", None)
    # 解説: ファイルが存在しない・Storage エラー等の場合は None を返す（呼び出し元はチェックして除外する）
    except Exception:
        return None
