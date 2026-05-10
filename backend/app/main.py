from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.supabase_client import supabase  # noqa: F401 — startup 時に接続確認
from app.routers import admin, browse, health, like, profile

app = FastAPI(title="Cro-co API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(profile.router)
app.include_router(admin.router)
app.include_router(browse.router)
app.include_router(like.router)


@app.get("/api/test/supabase")
def test_supabase() -> dict[str, object]:
    from sqlalchemy import create_engine
    from sqlalchemy import inspect as sa_inspect

    try:
        engine = create_engine(settings.database_url)
        tables: list[str] = sa_inspect(engine).get_table_names(schema="public")
        engine.dispose()
        return {"status": "connected", "tables": tables}
    except Exception as e:
        return {"status": "error", "message": str(e)}
