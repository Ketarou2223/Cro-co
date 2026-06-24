"""
Race condition E2E テスト（[15.6]）
asyncio.gather で N 本同時着弾 → DB の不変条件を確認する。

実行:
  (b) uvicorn を 4 worker / port 8001 で先に起動してから実行:
      cd backend && .venv\\Scripts\\Activate.ps1
      uvicorn app.main:app --port 8001 --workers 4   # 別ターミナル・--reload 禁止
      pytest tests/e2e/test_race.py -v -s -k "not quota"
  (c) .env で LIKE_QUOTA_ENABLED=true に変更後 uvicorn 再起動、
      pytest tests/e2e/test_race.py::test_race_quota_used_count -v -s
      終わったら LIKE_QUOTA_ENABLED を false に戻す。

RACE_BASE_URL: race テスト専用の 4 worker uvicorn を向く（既定 http://localhost:8001）。
  シングルworker(8000) では async def + sync supabase がイベントループを直列化するため
  race が顕在化しない。4 worker で同一 supabase クライアントが並列プロセスから叩かれ
  read-modify-write が競合する本番相当の条件になる。
"""
import asyncio
import os
from datetime import datetime, timedelta, timezone

import httpx
import pytest
from supabase import create_client

BASE_URL = os.getenv("E2E_BASE_URL", "http://localhost:8000")
# race テスト専用: 4 worker uvicorn（直列化が外れる本番相当）を向く
RACE_BASE_URL = os.getenv("RACE_BASE_URL", "http://localhost:8001")
SUPABASE_URL = os.environ["SUPABASE_URL"]
ANON_KEY = os.environ["SUPABASE_ANON_KEY"]
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
E2E_PASSWORD = "e2e-Test-Pw-9f3k"

# race 専用ユーザー（provisioned の a/b/c と独立）
# rx: 攻撃者（male/female）
# ry: いいね・quota テスト対象（female/male）← block しない
# rz: block 専用の犠牲ターゲット（female/male）← 最後にブロックされる
_RACE_USERS = {
    "rx": {"email": "e2e-race-x@ecs.osaka-u.ac.jp", "gender": "male",   "interest_in": "female"},
    "ry": {"email": "e2e-race-y@ecs.osaka-u.ac.jp", "gender": "female", "interest_in": "male"},
    "rz": {"email": "e2e-race-z@ecs.osaka-u.ac.jp", "gender": "female", "interest_in": "male"},
}


# ── ヘルパー ────────────────────────────────────────────────────────────────────

def _svc():
    return create_client(SUPABASE_URL, SERVICE_KEY)


def _delete_by_email(svc, email: str) -> None:
    page = svc.auth.admin.list_users()
    users = page if isinstance(page, list) else getattr(page, "users", [])
    for u in users:
        if getattr(u, "email", None) == email:
            try:
                svc.auth.admin.delete_user(u.id)
            except Exception:
                pass


def _provision_race(svc, spec: dict) -> str:
    _delete_by_email(svc, spec["email"])
    created = svc.auth.admin.create_user(
        {"email": spec["email"], "password": E2E_PASSWORD, "email_confirm": True}
    )
    uid = created.user.id
    svc.table("profiles").update({
        "name": "Race_" + spec["email"][9:11],
        "gender": spec["gender"],
        "interest_in": spec["interest_in"],
        "year": 1,
        "faculty": "工学部",
        "department": "電子情報工学科",
        "hometown": "大阪府",
        "bio": "race-e2e",
        "status": "approved",
        "identity_verified": True,
        "student_id_submitted": True,
        "onboarding_completed": True,
        "profile_setup_completed": True,
    }).eq("id", uid).execute()
    # (b-2) complete-onboarding が UPDATE パスまで到達するよう approved 写真 1 行を直挿入
    # 既存行があれば ON CONFLICT DO NOTHING（再実行時の冪等性）
    svc.table("profile_images").upsert({
        "user_id": uid,
        "image_path": f"e2e-race/{spec['email']}.jpg",
        "display_order": 0,
        "status": "approved",
    }, on_conflict="user_id,image_path").execute()
    return uid


def _login(email: str) -> str:
    anon = create_client(SUPABASE_URL, ANON_KEY)
    res = anon.auth.sign_in_with_password({"email": email, "password": E2E_PASSWORD})
    return res.session.access_token


def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def _fire_parallel(method: str, path: str, token: str, n: int, json_body=None):
    """N 本を asyncio.gather で同時着弾。4 worker uvicorn (RACE_BASE_URL) を向く。"""
    async with httpx.AsyncClient(
        base_url=RACE_BASE_URL,
        headers=_headers(token),
        timeout=30,
        follow_redirects=True,
    ) as ac:
        async def one():
            return await ac.request(method, path, json=json_body)
        return await asyncio.gather(*[one() for _ in range(n)], return_exceptions=True)


# ── fixture ────────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def race_users():
    svc = _svc()
    users: dict = {}
    for key, spec in _RACE_USERS.items():
        uid = _provision_race(svc, spec)
        users[key] = {"id": uid, "email": spec["email"], "token": _login(spec["email"])}
    yield users
    for u in users.values():
        try:
            svc.auth.admin.delete_user(u["id"])
        except Exception:
            pass


# ── (b-1) 同一いいね 16 連射 → likes は厳密に 1 行 ───────────────────────────

@pytest.mark.asyncio
async def test_race_duplicate_like(race_users):
    svc = _svc()
    rx, ry = race_users["rx"], race_users["ry"]

    # 事前掃除: 前回テスト残留の rx→ry likes を削除
    svc.table("likes").delete().eq("liker_id", rx["id"]).eq("liked_id", ry["id"]).execute()

    # ensure_like_stock: GET /likes/stock が初期行生成を兼ねる（在庫 0 でいいねできない回避）
    async with httpx.AsyncClient(
        base_url=RACE_BASE_URL, headers=_headers(rx["token"]), timeout=30
    ) as ac:
        await ac.get("/api/likes/stock")

    results = await _fire_parallel(
        "POST", "/api/likes/", rx["token"], 16,
        json_body={"liked_id": ry["id"], "via_footprint": False},
    )
    codes = [r.status_code if hasattr(r, "status_code") else 999 for r in results]
    print(f"\n[b-1] codes: {codes}")

    # 期待: 全部 2xx。5xx が混じれば「UNIQUE 握りの穴」
    assert all(c < 500 for c in codes), f"5xx 混入（race hole）: {codes}"

    # 不変条件: likes(rx→ry) は厳密に 1 行
    count_res = (
        svc.table("likes")
        .select("liker_id", count="exact")
        .eq("liker_id", rx["id"])
        .eq("liked_id", ry["id"])
        .execute()
    )
    count = count_res.count
    print(f"[b-1] likes(rx→ry) COUNT: {count}")
    assert count == 1, f"race: likes が {count} 行（期待 1）"


# ── (b-2) complete-onboarding 16 連射 → UPDATE パスまで到達・204 のみ ──────────

@pytest.mark.asyncio
async def test_race_complete_onboarding(race_users):
    rx = race_users["rx"]

    # rx は student_id_submitted=True・name/bio 設定済み・profile_images 1行あり（provision で挿入）。
    # 全チェックを通過して UPDATE まで到達する → 全部 204 を期待。
    # 16 並列で SET True→True が競合しても冪等なので 500 は出ないはず。
    results = await _fire_parallel(
        "POST", "/api/profile/complete-onboarding", rx["token"], 16, json_body={},
    )
    codes = [r.status_code if hasattr(r, "status_code") else 999 for r in results]
    print(f"\n[b-2] codes: {codes}")

    # 500 が出たら冪等性の穴。profile_images 挿入後は全 204 が期待値。
    assert all(c in (204, 400) for c in codes), f"想定外コード（500 = 冪等性の穴）: {codes}"


# ── (b-3) block 16 連射 → 5xx なし・COUNT==1 厳密 assert ────────────────────────
# blocks: PRIMARY KEY (blocker_id, blocked_id) で UNIQUE 相当あり（migration 012 確認済み）。
# worker 並列で SELECT 素通り後に複数 INSERT が衝突 → PK 違反 → safety.py は catch なし → 500 予想。
# 5xx が出れば「block race hole（冪等の穴）確定」。

@pytest.mark.asyncio
async def test_race_block(race_users):
    svc = _svc()
    rx, rz = race_users["rx"], race_users["rz"]

    # 事前掃除: 前回残留ブロックを削除
    svc.table("blocks").delete().eq("blocker_id", rx["id"]).eq("blocked_id", rz["id"]).execute()

    results = await _fire_parallel(
        "POST", "/api/safety/block", rx["token"], 16,
        json_body={"blocked_id": rz["id"]},
    )
    codes = [r.status_code if hasattr(r, "status_code") else 999 for r in results]
    print(f"\n[b-3] codes: {codes}")

    # 5xx が出たら「PRIMARY KEY 違反を握っていない = race hole 確定」
    assert all(c < 500 for c in codes), f"block で 5xx（PK 違反 catch なし = 冪等の穴）: {codes}"

    # 不変条件: blocks(rx→rz) は厳密に 1 行（UNIQUE が砦なら COUNT==1 が保たれるはず）
    count_res = (
        svc.table("blocks")
        .select("blocker_id", count="exact")
        .eq("blocker_id", rx["id"])
        .eq("blocked_id", rz["id"])
        .execute()
    )
    count = count_res.count
    print(f"[b-3] blocks(rx→rz) COUNT: {count}")
    assert count == 1, f"race: blocks が {count} 行（期待 1）"


# ── (c) quota used_count race → xfail（LIKE_QUOTA_ENABLED=true 必須）──────────

@pytest.mark.asyncio
@pytest.mark.xfail(
    reason=(
        "like.py used_count は read-modify-write（[6.4]）。"
        "修正前は並列で枠超過しうる。アトミック UPDATE に直すと xpass へ転じる回帰テスト。"
    )
)
async def test_race_quota_used_count(race_users):
    if os.getenv("LIKE_QUOTA_ENABLED", "false").lower() != "true":
        pytest.skip(
            "LIKE_QUOTA_ENABLED=true が必要。"
            ".env を書き換えて uvicorn を再起動した後に単体実行すること: "
            "pytest tests/e2e/test_race.py::test_race_quota_used_count -v -s"
        )

    svc = _svc()
    rx, ry = race_users["rx"], race_users["ry"]

    # 事前掃除: rx→ry の既存いいねを削除（duplicate check を回避するため）
    svc.table("likes").delete().eq("liker_id", rx["id"]).eq("liked_id", ry["id"]).execute()

    # ry の当日枠を used_count=4（残り 1 枠）で upsert。opens_at を 1 分前に設定して即時開放。
    today_jst = datetime.now(timezone(timedelta(hours=9))).date().isoformat()
    opens_at = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
    svc.table("like_quota").upsert({
        "user_id": ry["id"],
        "date": today_jst,
        "opens_at": opens_at,
        "used_count": 4,
    }).execute()

    # ensure_like_stock（rx）
    async with httpx.AsyncClient(
        base_url=RACE_BASE_URL, headers=_headers(rx["token"]), timeout=30
    ) as ac:
        await ac.get("/api/likes/stock")

    # 残り 1 枠に 4 本同時着弾 → 1 本だけ通るべき
    # race hole: read-modify-write で 2 本以上が used_count+1 を同時計算 → 枠超過
    results = await _fire_parallel(
        "POST", "/api/likes/", rx["token"], 4,
        json_body={"liked_id": ry["id"], "via_footprint": False},
    )
    codes = [r.status_code if hasattr(r, "status_code") else 999 for r in results]
    print(f"\n[c] codes: {codes}")

    # 不変条件: used_count は 5 を超えない
    quota_res = (
        svc.table("like_quota")
        .select("used_count")
        .eq("user_id", ry["id"])
        .eq("date", today_jst)
        .single()
        .execute()
    )
    final_count = quota_res.data["used_count"] if quota_res.data else -1
    print(f"[c] like_quota used_count 最終値: {final_count}（期待 <=5）")

    # 修正前はここで final_count > 5 → テスト失敗 → xfail として記録される
    # アトミック UPDATE 修正後は final_count <= 5 → xpass（回帰が確認できた状態）
    assert final_count <= 5, f"race: used_count={final_count} > 5（枠超過確定）"
