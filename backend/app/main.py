# 解説: このファイルは FastAPI アプリケーションの「エントリーポイント（起動の起点）」。
# 解説: 起動コマンド: `uvicorn app.main:app --reload --port 8000`
#       uvicorn = ASGI サーバー（Python の非同期 web サーバー）
#       app.main:app = "app/main.py の中の app オブジェクト" を起動する
# 解説: このファイルがやること:
#   1. FastAPI アプリオブジェクトを作る
#   2. ミドルウェア（リクエスト前後の共通処理）を追加する
#   3. 全ルーターを登録する（各 routers/*.py のエンドポイントをアプリに接続）
#   4. APScheduler で個人情報削除バッチを毎日 03:00 に定期実行する
# 解説: 呼ぶ先: routers/ の全ルーター / core/limiter / core/privacy_purge / core/config

import logging
import os
# 解説: asynccontextmanager = async 版のコンテキストマネージャを作るデコレータ（lifespan に使う）
from contextlib import asynccontextmanager

# 解説: APScheduler = バックグラウンドでタスクを定期実行するライブラリ
from apscheduler.schedulers.background import BackgroundScheduler
# 解説: FastAPI = Web API フレームワーク本体
from fastapi import FastAPI
# 解説: CORSMiddleware = 異なるオリジン（ドメイン）からのリクエストを許可/拒否する設定
from fastapi.middleware.cors import CORSMiddleware
# 解説: JSONResponse = JSON 形式のレスポンスを返すクラス
from fastapi.responses import JSONResponse
# 解説: _rate_limit_exceeded_handler = レート制限超過時に自動的に 429 エラーを返すハンドラ
from slowapi import _rate_limit_exceeded_handler
# 解説: RateLimitExceeded = レート制限超過時に発生する例外クラス
from slowapi.errors import RateLimitExceeded
# 解説: BaseHTTPMiddleware = HTTP リクエスト/レスポンスに割り込む基底クラス（SecurityHeadersMiddleware に使う）
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.core.config import settings
# 解説: レート制限（slowapi）の Limiter インスタンス（limiter.py で作成）
from app.core.limiter import limiter
from app.core.maintenance import is_maintenance_on
# 解説: 個人情報自動削除バッチ（定期実行タスク）
from app.core.privacy_purge import run_purge_batch
from app.core.supabase_client import supabase  # noqa: F401 — startup 時に接続確認
# 解説: 全ルーターをインポート（それぞれが GET/POST 等のエンドポイントを定義している）
from app.routers import admin, admin_announcements, admin_maintenance, announcements, browse, health, inquiries, like, maintenance, match, message, notifications, profile, push, safety, ws

logger = logging.getLogger(__name__)

# 解説: APScheduler のインスタンスを作成。timezone=Asia/Tokyo で JST 基準の時刻指定が可能
# 解説: misfire_grace_time=3600 = 定時に実行できなかった場合、1時間以内なら遅れて実行する
_scheduler = BackgroundScheduler(timezone="Asia/Tokyo", misfire_grace_time=3600)


# 解説: lifespan = アプリの「起動時」と「終了時」に実行する処理を定義する関数
# 解説: yield より前が「起動時の処理」、yield より後が「終了時の処理」
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 解説: 個人情報削除バッチを毎日 03:00 に実行するジョブを登録する
    _scheduler.add_job(run_purge_batch, "cron", hour=3, minute=0, id="privacy_purge")
    # 解説: スケジューラーを起動（バックグラウンドスレッドが起動する）
    _scheduler.start()
    logger.info("APScheduler 起動: 個人情報削除バッチを毎日 03:00 JST に実行")
    # 解説: yield でアプリの通常動作期間に入る（この間はリクエストを受け付ける）
    yield
    # 解説: アプリ終了時にスケジューラーを停止する（wait=False = 実行中ジョブを待たずに止める）
    _scheduler.shutdown(wait=False)


# 解説: 環境変数 APP_ENV が "production" かどうかを判定するフラグ
_is_prod = os.getenv("APP_ENV", "development") == "production"

# 解説: FastAPI アプリのインスタンスを作成する（これが uvicorn に渡される "app"）
app = FastAPI(
    title="Cro-co API",
    lifespan=lifespan,
    # 解説: 本番環境では /docs / /redoc / /openapi.json を非公開にする（None で無効化）
    docs_url=None if _is_prod else "/docs",
    redoc_url=None if _is_prod else "/redoc",
    openapi_url=None if _is_prod else "/openapi.json",
)

# 解説: Limiter を app.state に登録する（slowapi が app.state.limiter を参照するため）
app.state.limiter = limiter
# 解説: レート制限超過時（429 Too Many Requests）のエラーハンドラを登録する
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# 解説: セキュリティヘッダーをレスポンスに自動付与するミドルウェア
# 解説: 「ミドルウェア」= 全リクエスト/レスポンスに共通処理を差し込む仕組み
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    # 解説: dispatch = 全リクエストを受け取り、処理後にレスポンスにヘッダーを追加する
    async def dispatch(self, request: Request, call_next):
        # 解説: call_next で次のミドルウェア/ルーターにリクエストを渡し、レスポンスを受け取る
        response = await call_next(request)
        # 解説: X-Content-Type-Options = ブラウザが MIME タイプを勝手に変えないようにする
        response.headers["X-Content-Type-Options"] = "nosniff"
        # 解説: X-Frame-Options = このサイトを iframe に埋め込めないようにする（クリックジャッキング防止）
        response.headers["X-Frame-Options"] = "DENY"
        # 解説: X-XSS-Protection = 古いブラウザ向けの XSS フィルタを有効にする
        response.headers["X-XSS-Protection"] = "1; mode=block"
        # 解説: Referrer-Policy = 同一オリジン時のみ完全な URL を送る。他ドメインへはオリジンのみ
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # 解説: Permissions-Policy = カメラ・マイク・位置情報へのアクセスを禁止する
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        # 解説: HSTS = HTTPS のみを使うようブラウザに1年間覚えさせる（本番のみ）
        if _is_prod:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


# 解説: JSON/テキスト系リクエストのボディサイズを 256KB に制限するミドルウェア
class BodySizeLimitMiddleware:
    """JSON/テキスト系ボディを 256KB に制限する生 ASGI ミドルウェア。
    multipart/form-data（画像アップロード）は対象外。
    Content-Length ヘッダーが無い chunked 転送も実ストリームを計測して制限する。
    BaseHTTPMiddleware の二重読み込み問題を回避するため ASGI インターフェースで実装。
    """
    # 解説: 256KB = 256 × 1024 バイト。JSON リクエストはこれで十分な上限
    _MAX_JSON_BODY = 256 * 1024  # 256 KB
    # 解説: 413 エラー時に返すレスポンスボディを事前に作っておく（毎回 encode しないため）
    _413_BODY = '{"detail":"リクエストが大きすぎます"}'.encode("utf-8")

    # 解説: ASGI ミドルウェアの初期化。次のミドルウェア/アプリを self.app に保存する
    def __init__(self, app):
        self.app = app

    # 解説: ASGI インターフェース。scope=接続情報 / receive=ボディ受信関数 / send=レスポンス送信関数
    async def __call__(self, scope, receive, send):
        # 解説: HTTP 以外（WebSocket 等）はサイズ制限をかけない
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # multipart は除外（画像アップロード）
        # 解説: ヘッダーを小文字キーの辞書に変換して Content-Type を取得する
        headers = {k.lower(): v for k, v in scope.get("headers", [])}
        ct = headers.get(b"content-type", b"").decode("latin-1", errors="replace")
        # 解説: multipart/form-data（ファイルアップロード）はサイズ制限対象外
        if "multipart/form-data" in ct:
            await self.app(scope, receive, send)
            return

        # Content-Length が宣言されていれば即時チェック（fast path）
        # 解説: Content-Length ヘッダーがある場合は先に宣言サイズをチェックする（高速）
        cl_raw = headers.get(b"content-length", b"")
        if cl_raw:
            try:
                if int(cl_raw) > self._MAX_JSON_BODY:
                    await self._send_413(send)
                    return
            except ValueError:
                pass

        # ボディをストリーミングで積算し上限を超えたら 413
        # 解説: Content-Length がない場合は実際にボディを読んでサイズを計測する
        total = 0
        body_parts: list[bytes] = []
        while True:
            # 解説: receive() = ボディのチャンク（断片）を1つ受け取る
            msg = await receive()
            # 解説: http.disconnect = 接続が切れた = ループを抜ける
            if msg["type"] == "http.disconnect":
                break
            chunk: bytes = msg.get("body", b"")
            total += len(chunk)
            # 解説: 累計サイズが上限を超えたら 413 を返して終了
            if total > self._MAX_JSON_BODY:
                await self._send_413(send)
                return
            body_parts.append(chunk)
            # 解説: more_body=False = これが最後のチャンク = ループ終了
            if not msg.get("more_body", False):
                break

        # 解説: 全チャンクを1つのバイト列に結合する
        full_body = b"".join(body_parts)
        # 解説: consumed フラグ = replay_receive が既に一度呼ばれたかを追跡する
        consumed = False

        # 解説: 読み終えたボディをアプリに渡すための「再生用 receive 関数」
        # 解説: nonlocal = 外側のスコープの変数（consumed）を変更するための宣言
        async def replay_receive():
            nonlocal consumed
            if not consumed:
                consumed = True
                # 解説: 1回目は読み取ったボディを返す
                return {"type": "http.request", "body": full_body, "more_body": False}
            # 解説: 2回目以降は切断メッセージを返す
            return {"type": "http.disconnect"}

        # 解説: 次のアプリ/ミドルウェアに scope と replay_receive を渡す
        await self.app(scope, replay_receive, send)

    # 解説: 413 Too Large エラーを ASGI 形式で送信するメソッド
    async def _send_413(self, send) -> None:
        # 解説: まずレスポンスのステータスとヘッダーを送る
        await send({
            "type": "http.response.start",
            "status": 413,
            "headers": [(b"content-type", b"application/json; charset=utf-8")],
        })
        # 解説: 次にレスポンスボディを送る（more_body=False = 終わり）
        await send({"type": "http.response.body", "body": self._413_BODY, "more_body": False})


# 解説: メンテナンス中に admin 以外の全リクエストを 503 で遮断する生 ASGI ミドルウェア
# 解説: CORS の内側・BodySize の外側に配置することで preflight OPTIONS は CORS が先に処理し 503 にならない
# 解説: allowlist に含まれるパスはメンテ中でも通す（health / maintenance status / admin API / お知らせ3本）
class MaintenanceMiddleware:
    """メンテナンスモード中に admin allowlist 以外のリクエストを 503 で返す生 ASGI ミドルウェア。

    allowlist（パス前方一致）:
      - GET  /health
      - GET  /api/maintenance/status
      - /api/admin/  （prefix: admin 操作全般）
      - GET  /api/announcements（完全一致）
      - GET  /api/announcements/unread-count
      - POST /api/announcements/read
    """
    # 解説: 503 時に返す JSON ボディ（事前 encode でリクエストごとの encode コストをゼロに）
    _503_BODY = (
        '{"detail":"ただいまメンテナンス中です。時間をおいて再度お試しください。"}'
    ).encode("utf-8")

    _ADMIN_PREFIX = "/api/admin/"

    # 解説: 完全一致 allowlist（tuple[method, path]）
    _EXACT_ALLOW: frozenset[tuple[str, str]] = frozenset({
        ("GET",  "/health"),
        ("GET",  "/api/maintenance/status"),
        ("GET",  "/api/announcements"),
        ("GET",  "/api/announcements/unread-count"),
        ("POST", "/api/announcements/read"),
    })

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        # 解説: HTTP 以外（WebSocket 等）はこのミドルウェアを通さない
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # 解説: メンテ OFF または allowlist に含まれる場合は素通り
        if not is_maintenance_on():
            await self.app(scope, receive, send)
            return

        method = scope.get("method", "").upper()
        path = scope.get("path", "")

        # 解説: admin prefix はすべて通す（require_admin が後段で権限確認する）
        if path.startswith(self._ADMIN_PREFIX):
            await self.app(scope, receive, send)
            return

        # 解説: 完全一致 allowlist に含まれるパスは通す
        if (method, path) in self._EXACT_ALLOW:
            await self.app(scope, receive, send)
            return

        # 解説: 503 Service Unavailable を返す
        await send({
            "type": "http.response.start",
            "status": 503,
            "headers": [(b"content-type", b"application/json; charset=utf-8")],
        })
        await send({"type": "http.response.body", "body": self._503_BODY, "more_body": False})


# 解説: ミドルウェアを登録する（後に登録したものが先にリクエストを受け取る = 逆順）
# 解説: 実行順: CORSMiddleware → MaintenanceMiddleware → BodySizeLimitMiddleware → SecurityHeadersMiddleware → ルーター
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(BodySizeLimitMiddleware)
# 解説: MaintenanceMiddleware は CORS の内側・BodySize の外側。preflight OPTIONS は CORS が処理するため 503 と干渉しない
app.add_middleware(MaintenanceMiddleware)
# 解説: CORS ミドルウェア = 許可オリジン・認証情報・メソッド・ヘッダーを設定する
app.add_middleware(
    CORSMiddleware,
    # 解説: get_allowed_origins() = settings から許可するフロントエンドのオリジンを返す
    allow_origins=settings.get_allowed_origins(),
    # Cookie 非使用・JWT は Authorization ヘッダー専用のため False（CSRF 面を最小化）
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# 解説: 各ルーターをアプリに登録する。これによって routers/ 内のエンドポイントが有効になる
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
# 解説: inquiries ルーター = お問い合わせ機能のエンドポイント
app.include_router(inquiries.router)
# 解説: announcements ルーター = 運営お知らせ（ユーザー向け・管理者向け）
app.include_router(announcements.router)
app.include_router(admin_announcements.router)
# 解説: メンテナンス系ルーター（ステータス取得・admin 切り替え）
app.include_router(maintenance.router)
app.include_router(admin_maintenance.router)
