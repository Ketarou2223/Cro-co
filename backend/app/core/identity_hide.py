# 解説: このファイルは「身バレ防止」のロジックを一本化したユーティリティ。
# 解説: 「身バレ防止」= 同じ学部・学科・サークルの相手に自分が表示されないようにする機能。
# 解説: 呼ばれる場所: browse.py（一覧表示）/ like.py（いいね送信）/ match.py / notifications.py など
#       他ユーザーを返す全エンドポイント。ブロックと並んで最重要のプライバシー制御。
# 解説: 呼ぶ先: Supabase の profiles テーブル（HIDE_FIELDS の列のみ取得）
# 解説: データの流れ:
#       ルーター → get_hidden_user_ids_for（一覧用）または is_hidden_from_viewer（単一用）
#       → is_hidden_between（判定コア）→ True/False を返す
#
# 解説: 身バレ防止の判定ルール（is_hidden_between が実装）:
#   viewer が "faculty" 設定 → 同じ学部の相手を隠す
#   viewer が "department" 設定 → 同じ学部かつ同じ学科の相手を隠す
#   target 側も同様に自分の設定で隠す（対称判定）
#   hidden_clubs に含まれるサークルに相手が入っていたら隠す
#
# 解説: 使用ライブラリ:
#   APIError = postgrest（Supabase DB 接続層）が出す例外の型

# 解説: Supabase の DB アクセス（postgrest）が出す例外の型
from postgrest.exceptions import APIError

# 解説: Supabase の Python クライアント（profiles テーブルの SELECT に使う）
from app.core.supabase_client import supabase

# 身バレ防止判定に必要なカラム（id + 学部/学科/サークル/隠す設定）
# 解説: SELECT する列名を定数にまとめておくことで、必要な列だけを取得できる（SELECT * を避ける）
HIDE_FIELDS = "id, faculty, department, clubs, faculty_hide_level, hidden_clubs"


# 解説: viewer（見る側）から見て target（見られる側）を身バレ防止で隠すべきか判定する
# 解説: この関数は2つのプロフィール辞書を引数に取り、True（隠す）/ False（見せる）を返す
def is_hidden_between(viewer: dict, target: dict) -> bool:
    """viewer から見て target を身バレ防止で隠すべきか（対称判定）。

    browse.py:165-176 の判定をそのまま関数化したもの。判定基準はここに一本化する。
    null/未設定はガードにより「隠さない」側へ倒れる（既存 list_profiles 踏襲）。
    """
    # 解説: viewer（見る側）のプロフィール情報を取り出す
    # 解説: .get("key") = キーが存在しない場合 None を返す（KeyError を起こさない安全な取得）
    v_faculty = viewer.get("faculty")
    v_dept = viewer.get("department")
    # 解説: faculty_hide_level が None の場合は "none"（非表示なし）として扱う
    v_hide = viewer.get("faculty_hide_level") or "none"
    # 解説: hidden_clubs が None の場合は空リストに変換してから set にする
    v_hidden_clubs: set[str] = set(viewer.get("hidden_clubs") or [])
    v_clubs: set[str] = set(viewer.get("clubs") or [])

    # 解説: target（見られる側）のプロフィール情報を取り出す（viewer と同じパターン）
    t_faculty = target.get("faculty")
    t_dept = target.get("department")
    t_hide = target.get("faculty_hide_level") or "none"
    t_hidden_clubs: set[str] = set(target.get("hidden_clubs") or [])
    t_clubs: set[str] = set(target.get("clubs") or [])

    # 解説: 判定1: viewer が「学部単位で隠す」設定かつ学部が一致 → 隠す
    if v_hide == "faculty" and v_faculty and t_faculty and t_faculty == v_faculty:
        return True
    # 解説: 判定2: viewer が「学科単位で隠す」設定かつ学部・学科が両方一致 → 隠す
    if v_hide == "department" and v_faculty and v_dept and t_faculty == v_faculty and t_dept == v_dept:
        return True
    # 解説: 判定3: target 側が「学部単位で隠す」設定かつ学部が一致 → 隠す（対称判定）
    if t_hide == "faculty" and t_faculty and v_faculty and t_faculty == v_faculty:
        return True
    # 解説: 判定4: target 側が「学科単位で隠す」設定かつ学部・学科が両方一致 → 隠す（対称判定）
    if t_hide == "department" and t_faculty and t_dept and t_faculty == v_faculty and t_dept == v_dept:
        return True
    # 解説: 判定5: v_hidden_clubs と t_clubs の「共通部分（&）」が存在 = viewer が target のサークルを隠す設定 → 隠す
    if v_hidden_clubs & t_clubs:
        return True
    # 解説: 判定6: t_hidden_clubs と v_clubs の共通部分が存在 = target が viewer のサークルを隠す設定 → 隠す（対称判定）
    if t_hidden_clubs & v_clubs:
        return True
    # 解説: 全条件が不成立なら隠さない（表示する）
    return False


# 解説: 一覧表示用: viewer に対して身バレ防止で隠すべき全 user_id の集合を返す関数
def get_hidden_user_ids_for(viewer_id: str) -> set[str]:
    """viewer に対して身バレ防止で隠すべき全 user_id を一括取得する。

    一覧系エンドポイント（recommended / views / received）で not_.in_ もしくは
    除外フィルタに使う。viewer profile を1回、approved profiles を1回の計2クエリ
    （ループ内クエリなし）。
    """
    # 解説: まず viewer 自身のプロフィールを取得する（判定に必要な設定情報を得るため）
    try:
        v_res = (
            supabase.table("profiles")
            # 解説: HIDE_FIELDS の列だけを取得（不要な列を取らない）
            .select(HIDE_FIELDS)
            .eq("id", viewer_id)
            .single()
            .execute()
        )
    except APIError:
        raise  # fail-closed: DB 取得失敗時は呼び出し側を 500 で止める（空 set で露出させない）

    # 解説: viewer のプロフィールデータを取り出す
    viewer = v_res.data
    # 解説: プロフィールが存在しない場合は隠すべき相手なし（空の set を返す）
    if not viewer:
        return set()

    # 自分が学部・サークル・隠す設定のいずれも未設定なら誰も隠れない（条件1〜6が全て不成立）
    # 解説: 早期リターン: viewer に何も設定されていなければ全員表示してよい（重い全件クエリをスキップ）
    if not viewer.get("faculty") and not (viewer.get("clubs") or []) and not (viewer.get("hidden_clubs") or []):
        return set()

    # 解説: 承認済みユーザー全員のプロフィールを一括取得（is_hidden_between で1件ずつ判定するため）
    try:
        res = (
            supabase.table("profiles")
            .select(HIDE_FIELDS)
            # 解説: status = "approved" の行だけ取得（審査中・退会ユーザーは対象外）
            .eq("status", "approved")
            .execute()
        )
    except APIError:
        raise  # fail-closed: DB 取得失敗時は呼び出し側を 500 で止める（空 set で露出させない）

    # 解説: 隠すべき user_id を集める set
    hidden: set[str] = set()
    # 解説: 全承認済みユーザーに対して1件ずつ身バレ判定を行う（ループ内 DB クエリなし）
    for t in res.data or []:
        # 解説: 自分自身は除外（自分が自分を隠すことはない）
        if t["id"] == viewer_id:
            continue
        # 解説: is_hidden_between で判定し、True なら hidden に追加
        if is_hidden_between(viewer, t):
            hidden.add(t["id"])
    # 解説: 隠すべき user_id の集合を返す（呼び出し元で .not_.in_() に使う）
    return hidden


# 解説: 単一判定用: viewer から target が身バレ防止対象か（True=隠す / False=見せる）を返す
def is_hidden_from_viewer(viewer_id: str, target_id: str) -> bool:
    """viewer から target が身バレ防止対象か（単一判定）。

    詳細取得 / いいね送信のような単一相手の判定に使う。両者を1クエリで取得。
    自分自身は常に対象外。
    """
    # 解説: 自分自身へのアクセスは身バレ防止対象外（常に False）
    if viewer_id == target_id:
        return False
    # 解説: viewer と target の2人分を1回のクエリで取得する（2回に分けると N+1 問題になる）
    try:
        res = (
            supabase.table("profiles")
            .select(HIDE_FIELDS)
            # 解説: .in_("id", [...]) = id が指定リストに含まれる行を取得（SQL の WHERE id IN (...)）
            .in_("id", [viewer_id, target_id])
            .execute()
        )
    except APIError:
        return True  # fail-closed: DB 取得失敗時は「隠す」側に倒す（身バレ防止を bypass させない）

    # 解説: リスト結果を {id: row} の辞書形式に変換して高速に参照できるようにする
    by_id = {r["id"]: r for r in (res.data or [])}
    # 解説: 辞書から viewer / target の情報を取り出す
    viewer = by_id.get(viewer_id)
    target = by_id.get(target_id)
    # 解説: どちらかが見つからなければ判定不能として「隠さない」（False）を返す
    if not viewer or not target:
        return False
    # 解説: 実際の身バレ判定を is_hidden_between に委譲する
    return is_hidden_between(viewer, target)
