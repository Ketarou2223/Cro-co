from postgrest.exceptions import APIError

from app.core.supabase_client import supabase

# 身バレ防止判定に必要なカラム（id + 学部/学科/サークル/隠す設定）
HIDE_FIELDS = "id, faculty, department, clubs, faculty_hide_level, hidden_clubs"


def is_hidden_between(viewer: dict, target: dict) -> bool:
    """viewer から見て target を身バレ防止で隠すべきか（対称判定）。

    browse.py:165-176 の判定をそのまま関数化したもの。判定基準はここに一本化する。
    null/未設定はガードにより「隠さない」側へ倒れる（既存 list_profiles 踏襲）。
    """
    v_faculty = viewer.get("faculty")
    v_dept = viewer.get("department")
    v_hide = viewer.get("faculty_hide_level") or "none"
    v_hidden_clubs: set[str] = set(viewer.get("hidden_clubs") or [])
    v_clubs: set[str] = set(viewer.get("clubs") or [])

    t_faculty = target.get("faculty")
    t_dept = target.get("department")
    t_hide = target.get("faculty_hide_level") or "none"
    t_hidden_clubs: set[str] = set(target.get("hidden_clubs") or [])
    t_clubs: set[str] = set(target.get("clubs") or [])

    if v_hide == "faculty" and v_faculty and t_faculty and t_faculty == v_faculty:
        return True
    if v_hide == "department" and v_faculty and v_dept and t_faculty == v_faculty and t_dept == v_dept:
        return True
    if t_hide == "faculty" and t_faculty and v_faculty and t_faculty == v_faculty:
        return True
    if t_hide == "department" and t_faculty and t_dept and t_faculty == v_faculty and t_dept == v_dept:
        return True
    if v_hidden_clubs & t_clubs:
        return True
    if t_hidden_clubs & v_clubs:
        return True
    return False


def get_hidden_user_ids_for(viewer_id: str) -> set[str]:
    """viewer に対して身バレ防止で隠すべき全 user_id を一括取得する。

    一覧系エンドポイント（recommended / views / received）で not_.in_ もしくは
    除外フィルタに使う。viewer profile を1回、approved profiles を1回の計2クエリ
    （ループ内クエリなし）。
    """
    try:
        v_res = (
            supabase.table("profiles")
            .select(HIDE_FIELDS)
            .eq("id", viewer_id)
            .single()
            .execute()
        )
    except APIError:
        raise  # fail-closed: DB 取得失敗時は呼び出し側を 500 で止める（空 set で露出させない）

    viewer = v_res.data
    if not viewer:
        return set()

    # 自分が学部・サークル・隠す設定のいずれも未設定なら誰も隠れない（条件1〜6が全て不成立）
    if not viewer.get("faculty") and not (viewer.get("clubs") or []) and not (viewer.get("hidden_clubs") or []):
        return set()

    try:
        res = (
            supabase.table("profiles")
            .select(HIDE_FIELDS)
            .eq("status", "approved")
            .execute()
        )
    except APIError:
        raise  # fail-closed: DB 取得失敗時は呼び出し側を 500 で止める（空 set で露出させない）

    hidden: set[str] = set()
    for t in res.data or []:
        if t["id"] == viewer_id:
            continue
        if is_hidden_between(viewer, t):
            hidden.add(t["id"])
    return hidden


def is_hidden_from_viewer(viewer_id: str, target_id: str) -> bool:
    """viewer から target が身バレ防止対象か（単一判定）。

    詳細取得 / いいね送信のような単一相手の判定に使う。両者を1クエリで取得。
    自分自身は常に対象外。
    """
    if viewer_id == target_id:
        return False
    try:
        res = (
            supabase.table("profiles")
            .select(HIDE_FIELDS)
            .in_("id", [viewer_id, target_id])
            .execute()
        )
    except APIError:
        return True  # fail-closed: DB 取得失敗時は「隠す」側に倒す（身バレ防止を bypass させない）

    by_id = {r["id"]: r for r in (res.data or [])}
    viewer = by_id.get(viewer_id)
    target = by_id.get(target_id)
    if not viewer or not target:
        return False
    return is_hidden_between(viewer, target)
