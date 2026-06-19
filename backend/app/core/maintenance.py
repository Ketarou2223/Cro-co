"""メンテナンスフラグの読み書き（app_settings テーブル + 15秒 TTL キャッシュ）。

キャッシュ戦略: Render はシングルインスタンスなので process-local で十分。
ON にした瞬間に _cache を即時更新し TTL をリセットするためフラグ伝播は0秒遅延。
DB 障害時はキャッシュ値を継続使用（ログのみ・503 にしない）。
"""
import logging
import time
from datetime import datetime, timezone

from app.core.supabase_client import supabase

logger = logging.getLogger(__name__)

_TTL = 15.0  # 秒
_cache: bool = False
_cache_expires: float = 0.0

_KEY = "maintenance_mode"


def is_maintenance_on() -> bool:
    """メンテナンスモードが有効かを返す（15秒 TTL キャッシュ付き）。"""
    global _cache, _cache_expires
    now = time.monotonic()
    if now < _cache_expires:
        return _cache
    try:
        res = (
            supabase.table("app_settings")
            .select("value")
            .eq("key", _KEY)
            .single()
            .execute()
        )
        _cache = (res.data or {}).get("value", "false").lower() == "true"
    except Exception:
        # DB 障害時はキャッシュ継続（アプリを止めない）
        logger.warning("app_settings 取得失敗: メンテフラグはキャッシュ値 %s を継続使用", _cache)
    _cache_expires = now + _TTL
    return _cache


def set_maintenance(enabled: bool) -> None:
    """メンテナンスモードを ON/OFF し DB を更新してキャッシュを即時反映する。"""
    global _cache, _cache_expires
    supabase.table("app_settings").upsert(
        {
            "key": _KEY,
            "value": "true" if enabled else "false",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    ).execute()
    _cache = enabled
    _cache_expires = time.monotonic() + _TTL
    logger.info("メンテナンスモード: %s", "ON" if enabled else "OFF")
