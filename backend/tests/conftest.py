import io
import os

import httpx
import pytest
from PIL import Image
from supabase import create_client, Client

# pytest は uvicorn と違い .env を自動ロードしないため明示ロード
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
except Exception:
    pass

BASE_URL = os.getenv("E2E_BASE_URL", "http://localhost:8000")
SUPABASE_URL = os.environ["SUPABASE_URL"]
ANON_KEY = os.environ["SUPABASE_ANON_KEY"]
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

DUMMY_UUID = "00000000-0000-0000-0000-000000000000"
E2E_PASSWORD = "e2e-Test-Pw-9f3k"

# 専用 e2e ユーザー（@ecs 必須・034 トリガ通過。plus-alias は 050 で拒否なのでハイフン使用）
_E2E_USERS = {
    "a": {"email": "e2e-idor-a@ecs.osaka-u.ac.jp", "gender": "male",   "interest_in": "female"},
    "b": {"email": "e2e-idor-b@ecs.osaka-u.ac.jp", "gender": "female", "interest_in": "male"},
    "c": {"email": "e2e-idor-c@ecs.osaka-u.ac.jp", "gender": "male",   "interest_in": "female"},
}


def _svc() -> Client:
    return create_client(SUPABASE_URL, SERVICE_KEY)


def _delete_by_email(svc: Client, email: str) -> None:
    # 前回 teardown 失敗で残った同名ユーザーを掃除
    page = svc.auth.admin.list_users()
    users = page if isinstance(page, list) else getattr(page, "users", [])
    for u in users:
        if getattr(u, "email", None) == email:
            try:
                svc.auth.admin.delete_user(u.id)
            except Exception:
                pass


def _provision(svc: Client, spec: dict) -> str:
    _delete_by_email(svc, spec["email"])
    created = svc.auth.admin.create_user(
        {"email": spec["email"], "password": E2E_PASSWORD, "email_confirm": True}
    )
    uid = created.user.id
    # handle_new_user トリガが profiles 行を作る前提で approved まで持ち上げる
    # ⚠️ CC 確認: gender/interest_in の enum 値・必須列・列名が実スキーマと一致するか。
    #    不一致なら execute() がエラーを返すので、その列だけ修正して再実行。
    svc.table("profiles").update({
        "name": "E2E_" + spec["email"][9:11],
        "gender": spec["gender"],
        "interest_in": spec["interest_in"],
        "year": 1,
        "faculty": "工学部",
        "department": "電子情報工学科",
        "hometown": "大阪府",
        "bio": "e2e",
        "status": "approved",
        "identity_verified": True,
        "onboarding_completed": True,
        "profile_setup_completed": True,
    }).eq("id", uid).execute()
    return uid


def _login(email: str) -> str:
    anon = create_client(SUPABASE_URL, ANON_KEY)
    res = anon.auth.sign_in_with_password({"email": email, "password": E2E_PASSWORD})
    return res.session.access_token


def _client(token: str) -> httpx.Client:
    return httpx.Client(
        base_url=BASE_URL,
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
        follow_redirects=True,
    )


@pytest.fixture(scope="session")
def provisioned():
    svc = _svc()
    users = {}
    for key, spec in _E2E_USERS.items():
        uid = _provision(svc, spec)
        users[key] = {"id": uid, "email": spec["email"], "token": _login(spec["email"])}
    yield users
    for u in users.values():
        try:
            svc.auth.admin.delete_user(u["id"])
        except Exception:
            pass


@pytest.fixture()
def token_a(provisioned):
    return provisioned["a"]["token"]


@pytest.fixture()
def client_a(token_a):
    with httpx.Client(base_url=BASE_URL, headers={"Authorization": f"Bearer {token_a}"}, timeout=20, follow_redirects=True) as c:
        yield c


@pytest.fixture()
def client_noauth():
    with httpx.Client(base_url=BASE_URL, timeout=20, follow_redirects=True) as c:
        yield c


@pytest.fixture(scope="session")
def victim_state(provisioned):
    """A が当事者でない B–C のマッチ/メッセージ/写真/通知を作り、その id を返す。"""
    b = provisioned["b"]
    c = provisioned["c"]
    state: dict = {"b_id": b["id"], "c_id": c["id"]}

    with _client(b["token"]) as cb, _client(c["token"]) as cc:
        # 相互いいね → detect_match DB トリガーで matches 自動成立
        # B(female)→C(male) は should_count=false（在庫不要）、先に送る
        r_bc = cb.post("/api/likes/", json={"liked_id": c["id"], "via_footprint": False})
        assert r_bc.status_code < 300, f"B→C いいね失敗: {r_bc.status_code} {r_bc.text}"
        # C(male)→B(female) は should_count=true（在庫消費）。
        # consume_like_stock は ensure を呼ばないため GET /api/likes/stock で先に初期行を作る
        cc.get("/api/likes/stock")
        r_cb = cc.post("/api/likes/", json={"liked_id": b["id"], "via_footprint": False})
        assert r_cb.status_code < 300, f"C→B いいね失敗: {r_cb.status_code} {r_cb.text}"

        # B 視点のマッチ一覧から C とのマッチを特定
        matches_r = cb.get("/api/matches/")
        assert matches_r.status_code == 200, f"GET /api/matches/ 失敗: {matches_r.status_code} {matches_r.text}"
        matches = matches_r.json()
        match_entry = next((m for m in matches if m["user_id"] == c["id"]), None)
        assert match_entry is not None, (
            f"B–C マッチが見つかりません。"
            f"c['id']={c['id']}, matches={matches}, "
            f"like_bc={r_bc.json()}, like_cb={r_cb.json()}"
        )
        match = match_entry
        state["match_id"] = match["match_id"]

        # B が1通送信 → message id
        msg = cb.post(
            "/api/messages/",
            json={"match_id": state["match_id"], "content": "victim-msg"},
        ).json()
        state["message_id"] = msg["id"]

        # 8×8 RGB PNG を PIL でその場生成（旧 75 バイト列は IDAT が壊れて PIL save() で 422 になったため差し替え）
        _buf = io.BytesIO()
        Image.new("RGB", (8, 8), (120, 120, 120)).save(_buf, format="PNG")
        png = _buf.getvalue()
        pr = cb.post("/api/profile/photos", files={"file": ("v.png", png, "image/png")})
        state["photo_id"] = pr.json().get("id") if pr.status_code < 300 else None

        # C 宛て通知を取得（like/match は push 通知のみで notifications テーブル不使用のため通常 None）
        notifs = cc.get("/api/notifications/").json()
        state["notification_id"] = notifs[0]["id"] if notifs else None

    return state
