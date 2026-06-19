# 解説: このファイルは「ヘルスチェック」エンドポイントを定義する。
# 解説: 「ヘルスチェック」= サーバーが正常に動いているかを確認するための超シンプルな API。
#       Vercel や監視ツールが定期的に叩いて「生きているか」を確認する。
# 解説: 呼ばれる場所: main.py で app.include_router(health.router) として登録される
# 解説: エンドポイント: GET /health → {"status": "ok"} を返すだけ（認証不要）

# 解説: APIRouter = 複数のエンドポイントをまとめて管理するクラス
from fastapi import APIRouter

# 解説: router インスタンスを作成する（prefix なし = /health がそのまま URL になる）
router = APIRouter()


# 解説: GET /health にアクセスすると {"status": "ok"} を返す
# 解説: 戻り値の型は dict[str, str]（キーも値も文字列の辞書）
@router.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
