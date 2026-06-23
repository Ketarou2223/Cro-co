"""
CSRF/CORS 実証スイート（[15.5]）
Cookie を一切発行しない Bearer 専用設計であるため CSRF は構造的に不成立。
それを 4 観点で実測固定する。

A. Set-Cookie 非発行（認証済み・未認証どちらでも）
B. 偽オリジン＋無トークン → 認証層で拒否（401/403）
C. 偽オリジンへの preflight に ACAO を返さない
D. 正規オリジン（localhost:5173）への preflight は許可される（ポジティブ対照）
"""
import pytest

EVIL_ORIGIN = "https://evil.example.com"


# ── A. Set-Cookie 非発行 ────────────────────────────────────────────────────

def test_no_set_cookie_on_auth_endpoints(client_a):
    """認証付きの代表エンドポイントを叩いても Set-Cookie が無いこと。"""
    for path in ["/api/profile/me", "/api/matches/", "/api/notifications/"]:
        r = client_a.get(path)
        assert "set-cookie" not in {k.lower() for k in r.headers.keys()}, \
            f"{path} が Set-Cookie を発行"


def test_no_set_cookie_unauth(client_noauth):
    """未認証経路でも Set-Cookie 無し。"""
    r = client_noauth.get("/health")
    assert "set-cookie" not in {k.lower() for k in r.headers.keys()}


# ── B. 偽オリジン＋無トークン → 認証層で拒否 ───────────────────────────────

@pytest.mark.parametrize("method,path,body", [
    ("POST",   "/api/safety/block",  {"blocked_id": "00000000-0000-0000-0000-000000000000"}),
    ("POST",   "/api/likes/",        {"liked_id":   "00000000-0000-0000-0000-000000000000"}),
    ("DELETE", "/api/profile/me",    None),
    ("POST",   "/api/messages/",     {"match_id":   "00000000-0000-0000-0000-000000000000", "content": "x"}),
])
def test_cross_origin_no_token_denied(client_noauth, method, path, body):
    """攻撃者サイト由来を模して Origin を偽装・トークン無し → 401/403 で弾かれること。"""
    r = client_noauth.request(method, path, json=body, headers={"Origin": EVIL_ORIGIN})
    assert r.status_code in (401, 403), \
        f"{method} {path} Origin偽装/無トークン → {r.status_code}"


# ── C. CORS: 偽オリジンには ACAO を返さない ────────────────────────────────

def test_preflight_evil_origin_not_allowed(client_noauth):
    """攻撃者オリジンからの preflight に対し、ACAO に evil を反映しないこと。"""
    r = client_noauth.request(
        "OPTIONS", "/api/likes/",
        headers={
            "Origin": EVIL_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )
    acao = r.headers.get("access-control-allow-origin")
    assert acao != EVIL_ORIGIN, f"偽オリジンが許可された: ACAO={acao}"
    assert acao != "*", "ワイルドカード ACAO は不可（credentials との併用禁止・情報漏れ）"


# ── D. CORS: 正規オリジンは許可される（ポジティブ対照） ─────────────────────

def test_preflight_legit_origin_allowed(client_noauth):
    """dev の正規オリジン（localhost:5173）からの preflight は許可されること。
    落ちた場合は dev の ALLOWED_ORIGINS 実値を確認し legit を実値に合わせる。
    """
    legit = "http://localhost:5173"
    r = client_noauth.request(
        "OPTIONS", "/api/likes/",
        headers={
            "Origin": legit,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )
    acao = r.headers.get("access-control-allow-origin")
    assert acao == legit, \
        f"正規オリジンが許可されない: ACAO={acao}（dev の ALLOWED_ORIGINS を確認）"
