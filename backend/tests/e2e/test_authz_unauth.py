import pytest
from .routes import AUTHED_ROUTES


@pytest.mark.parametrize("r", AUTHED_ROUTES, ids=lambda r: f'{r["method"]} {r["path"]}')
def test_requires_auth(client_noauth, r):
    resp = client_noauth.request(r["method"], r["path"], json=r.get("body"))
    # 認証必須ルートはトークン無しで 401。
    # 422 が返るならボディ検証が認証より先＝順序の指摘事項（脆弱性ではない）として個別記録。
    assert resp.status_code == 401, (
        f'{r["method"]} {r["path"]} → {resp.status_code}（期待 401）'
    )
