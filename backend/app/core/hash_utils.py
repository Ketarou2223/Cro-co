"""プライバシーハッシュ計算ユーティリティ

privacy_purge.py と identity_block.py の両方から使用する共通関数。
PRIVACY_HASH_SALT は .env から pydantic-settings 経由で読む。
"""
import hashlib
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


def normalize_email(email: str | None) -> str | None:
    """メールアドレスを正規化する（strip + lower）。compute_hash に渡す前に必ず通す。"""
    if not email:
        return None
    return email.strip().lower()


def compute_hash(value: str | None) -> str | None:
    """ソルト付き SHA-256 ハッシュを計算する。

    PRIVACY_HASH_SALT が未設定の場合は None を返す（ハッシュ化を中止）。
    """
    if not value:
        return None
    if not settings.privacy_hash_salt:
        logger.error("PRIVACY_HASH_SALT が設定されていません。ハッシュ化を中止します。")
        return None
    salted = f"{settings.privacy_hash_salt}:{value}"
    return hashlib.sha256(salted.encode("utf-8")).hexdigest()
