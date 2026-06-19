# 解説: このファイルはメンテナンスモードの管理者向けエンドポイントを定義する。
# 解説: エンドポイント:
#   GET  /api/admin/maintenance → 現在のメンテナンス状態
#   POST /api/admin/maintenance → メンテナンス ON/OFF 切り替え

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from supabase_auth.types import User

from app.auth.dependencies import require_admin
from app.core.limiter import limiter
from app.core.maintenance import is_maintenance_on, set_maintenance

router = APIRouter(prefix="/api/admin/maintenance", tags=["admin-maintenance"])


class MaintenanceUpdate(BaseModel):
    enabled: bool


@router.get("")
@limiter.limit("60/min")
async def get_maintenance_mode(
    request: Request,
    current_user: User = Depends(require_admin),
) -> dict:
    """現在のメンテナンス状態を返す。"""
    return {"maintenance": is_maintenance_on()}


@router.post("")
@limiter.limit("30/min")
async def set_maintenance_mode(
    request: Request,
    body: MaintenanceUpdate,
    current_user: User = Depends(require_admin),
) -> dict:
    """メンテナンスモードを ON/OFF する。"""
    set_maintenance(body.enabled)
    return {"ok": True, "maintenance": body.enabled}
