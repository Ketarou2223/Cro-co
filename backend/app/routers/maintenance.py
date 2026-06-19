# 解説: このファイルはメンテナンス状態取得エンドポイントを定義する（認証不要・フロントのポーリング用）。
# 解説: エンドポイント:
#   GET /api/maintenance/status → {"maintenance": bool}（認証不要・メンテ中でも通る allowlist 対象）

from fastapi import APIRouter, Request

from app.core.limiter import limiter
from app.core.maintenance import is_maintenance_on

router = APIRouter(prefix="/api/maintenance", tags=["maintenance"])


@router.get("/status")
@limiter.limit("120/min")
async def get_maintenance_status(request: Request) -> dict:
    """メンテナンス状態を返す（認証不要・30秒ポーリング対応）。"""
    return {"maintenance": is_maintenance_on()}
