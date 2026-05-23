import logging
from typing import Any

from fastapi import Request

from app.core.supabase_client import supabase

logger = logging.getLogger(__name__)


def log_admin_action(
    admin_id: str,
    admin_email: str,
    action: str,
    target_type: str,
    target_id: str | None = None,
    details: dict[str, Any] | None = None,
    request: Request | None = None,
) -> None:
    """管理者操作を admin_logs に記録。失敗しても本処理は止めない。"""
    try:
        ip = None
        ua = None
        if request:
            ip = request.client.host if request.client else None
            ua = request.headers.get("user-agent")

        supabase.table("admin_logs").insert({
            "admin_id": admin_id,
            "admin_email": admin_email,
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            "details": details or {},
            "ip_address": ip,
            "user_agent": ua,
        }).execute()
    except Exception as e:
        logger.error("admin_logs記録失敗: %s", e)
