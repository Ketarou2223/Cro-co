import base64
import json
import logging

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

logger = logging.getLogger(__name__)


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
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[len("Bearer "):]
            parts = token.split(".")
            if len(parts) == 3:
                # JWT ペイロードは base64url（パディングなし）
                padded = parts[1] + "=" * (-len(parts[1]) % 4)
                payload = json.loads(base64.urlsafe_b64decode(padded))
                sub = payload.get("sub")
                if sub:
                    return f"user:{sub}"
    except Exception:
        logger.debug("rate limit key fallback to IP（JWT sub 取得不可）", exc_info=True)
    return f"ip:{get_remote_address(request)}"


limiter = Limiter(key_func=_get_user_key)
