from app.core.config import settings
from app.core.supabase_client import supabase


def notify_users(user_ids: list[str], kind: str) -> None:
    """関係者の user:{id} チャンネルに合図だけ撃つ。失敗は握りつぶす（本処理を壊さない）。"""
    if not settings.realtime_broadcast_enabled:
        return
    ids = [str(u) for u in (user_ids or []) if u]
    if not ids:
        return
    try:
        supabase.rpc("app_notify", {"target_ids": ids, "kind": kind}).execute()
    except Exception:
        pass
