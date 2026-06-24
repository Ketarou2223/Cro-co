import pytest
from .routes import AUTHED_ROUTES

ADMIN_ROUTES = [r for r in AUTHED_ROUTES if r["auth"] == "admin"]


def test_token_works(client_a):
    # 土台確認: 一般ユーザートークンが有効
    assert client_a.get("/api/profile/me").status_code == 200


@pytest.mark.parametrize("r", ADMIN_ROUTES, ids=lambda r: f'{r["method"]} {r["path"]}')
def test_admin_only_blocks_non_admin(client_a, r):
    resp = client_a.request(r["method"], r["path"], json=r.get("body"))
    # 一般ユーザートークンで admin ルート → require_admin が 403。
    # 403 以外（特に 2xx）は権限昇格＝重大。dev 限定実行なので副作用が出ても dev のみ。
    assert resp.status_code == 403, (
        f'{r["method"]} {r["path"]} → {resp.status_code}（期待 403=権限昇格防止）'
    )
