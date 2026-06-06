import logging
import os
from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.core.config import settings
from app.core.limiter import limiter
from app.core.privacy_purge import run_purge_batch
from app.core.supabase_client import supabase  # noqa: F401 — startup 時に接続確認
from app.routers import admin, browse, health, inquiries, like, match, message, notifications, profile, push, safety, ws

logger = logging.getLogger(__name__)

_scheduler = BackgroundScheduler(timezone="Asia/Tokyo", misfire_grace_time=3600)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _scheduler.add_job(run_purge_batch, "cron", hour=3, minute=0, id="privacy_purge")
    _scheduler.start()
    logger.info("APScheduler 起動: 個人情報削除バッチを毎日 03:00 JST に実行")
    yield
    _scheduler.shutdown(wait=False)


_is_prod = os.getenv("APP_ENV", "development") == "production"

app = FastAPI(
    title="Cro-co API",
    lifespan=lifespan,
    docs_url=None if _is_prod else "/docs",
    redoc_url=None if _is_prod else "/redoc",
    openapi_url=None if _is_prod else "/openapi.json",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        if _is_prod:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


class BodySizeLimitMiddleware:
    """JSON/テキスト系ボディを 256KB に制限する生 ASGI ミドルウェア。
    multipart/form-data（画像アップロード）は対象外。
    Content-Length ヘッダーが無い chunked 転送も実ストリームを計測して制限する。
    BaseHTTPMiddleware の二重読み込み問題を回避するため ASGI インターフェースで実装。
    """
    _MAX_JSON_BODY = 256 * 1024  # 256 KB
    _413_BODY = '{"detail":"リクエストが大きすぎます"}'.encode("utf-8")

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # multipart は除外（画像アップロード）
        headers = {k.lower(): v for k, v in scope.get("headers", [])}
        ct = headers.get(b"content-type", b"").decode("latin-1", errors="replace")
        if "multipart/form-data" in ct:
            await self.app(scope, receive, send)
            return

        # Content-Length が宣言されていれば即時チェック（fast path）
        cl_raw = headers.get(b"content-length", b"")
        if cl_raw:
            try:
                if int(cl_raw) > self._MAX_JSON_BODY:
                    await self._send_413(send)
                    return
            except ValueError:
                pass

        # ボディをストリーミングで積算し上限を超えたら 413
        total = 0
        body_parts: list[bytes] = []
        while True:
            msg = await receive()
            if msg["type"] == "http.disconnect":
                break
            chunk: bytes = msg.get("body", b"")
            total += len(chunk)
            if total > self._MAX_JSON_BODY:
                await self._send_413(send)
                return
            body_parts.append(chunk)
            if not msg.get("more_body", False):
                break

        full_body = b"".join(body_parts)
        consumed = False

        async def replay_receive():
            nonlocal consumed
            if not consumed:
                consumed = True
                return {"type": "http.request", "body": full_body, "more_body": False}
            return {"type": "http.disconnect"}

        await self.app(scope, replay_receive, send)

    async def _send_413(self, send) -> None:
        await send({
            "type": "http.response.start",
            "status": 413,
            "headers": [(b"content-type", b"application/json; charset=utf-8")],
        })
        await send({"type": "http.response.body", "body": self._413_BODY, "more_body": False})


app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(BodySizeLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(health.router)
app.include_router(profile.router)
app.include_router(admin.router)
app.include_router(browse.router)
app.include_router(like.router)
app.include_router(match.router)
app.include_router(message.router)
app.include_router(safety.router)
app.include_router(push.router)
app.include_router(notifications.router)
app.include_router(ws.router)
app.include_router(inquiries.router)
