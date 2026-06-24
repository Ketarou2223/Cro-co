"""
横 IDOR テスト（[15.2]）: A が当事者でない B–C のオブジェクトを直叩き → 全て 403/404 を実証。
DENY テストが 2xx を返した場合は本物の IDOR 脆弱性。
"""
import pytest

DENY = (403, 404)


# ── IDOR テスト ──────────────────────────────────────────────────────────────

def test_idor_get_others_match(client_a, victim_state):
    r = client_a.get(f"/api/matches/{victim_state['match_id']}")
    assert r.status_code in DENY, f"他人マッチ GET → {r.status_code}: {r.text}"


def test_idor_get_others_messages(client_a, victim_state):
    r = client_a.get(f"/api/messages/{victim_state['match_id']}")
    assert r.status_code in DENY, f"他人メッセージ GET → {r.status_code}: {r.text}"


def test_idor_post_message_to_others_match(client_a, victim_state):
    r = client_a.post(
        "/api/messages/",
        json={"match_id": victim_state["match_id"], "content": "intrude"},
    )
    assert r.status_code in DENY, f"他人マッチへ送信 → {r.status_code}: {r.text}"


def test_idor_react_others_message(client_a, victim_state):
    r = client_a.post(f"/api/messages/{victim_state['message_id']}/react", json={})
    assert r.status_code in DENY, f"他人 message react → {r.status_code}: {r.text}"


def test_idor_read_others_match(client_a, victim_state):
    r = client_a.post(f"/api/messages/{victim_state['match_id']}/read", json={})
    assert r.status_code in DENY, f"他人マッチ read → {r.status_code}: {r.text}"


def test_idor_set_main_others_photo(client_a, victim_state):
    if not victim_state.get("photo_id"):
        pytest.skip("victim photo 未作成")
    r = client_a.post(f"/api/profile/photos/{victim_state['photo_id']}/set-main", json={})
    assert r.status_code in DENY, f"他人写真 set-main → {r.status_code}: {r.text}"


def test_idor_delete_others_photo(client_a, victim_state):
    if not victim_state.get("photo_id"):
        pytest.skip("victim photo 未作成")
    r = client_a.delete(f"/api/profile/photos/{victim_state['photo_id']}")
    assert r.status_code in DENY, f"他人写真 DELETE → {r.status_code}: {r.text}"


def test_idor_read_others_notification(client_a, victim_state):
    if not victim_state.get("notification_id"):
        pytest.skip("victim notification 未作成")
    r = client_a.post(f"/api/notifications/{victim_state['notification_id']}/read", json={})
    assert r.status_code in DENY, f"他人通知 read → {r.status_code}: {r.text}"


# ── ポジティブ対照（A 自身は自分のオブジェクトに 200 で触れる）───────────────

def test_positive_a_sees_own_matches(client_a):
    assert client_a.get("/api/matches/").status_code == 200


def test_positive_a_lists_notifications(client_a):
    assert client_a.get("/api/notifications/").status_code == 200
