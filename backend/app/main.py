import logging
from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

_scheduler = BackgroundScheduler(timezone="Asia/Tokyo")


@asynccontextmanager
async def lifespan(app: FastAPI):
    _scheduler.add_job(run_purge_batch, "cron", hour=3, minute=0, id="privacy_purge")
    _scheduler.start()
    logger.info("APScheduler 起動: 個人情報削除バッチを毎日 03:00 JST に実行")
    yield
    _scheduler.shutdown(wait=False)


app = FastAPI(title="Cro-co API", lifespan=lifespan)

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
        return response


app.add_middleware(SecurityHeadersMiddleware)
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
