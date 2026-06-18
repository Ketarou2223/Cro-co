# 解説: このファイルは「ブロック関係にあるユーザー ID を一括取得する」ユーティリティを定義する。
# 解説: 呼ばれる場所: browse.py / like.py / match.py / message.py / notifications.py / ws.py など
#       他ユーザーの情報を返す全エンドポイントが必ず呼ぶ（ブロック相手を結果から除外するため）。
# 解説: 呼ぶ先: Supabase の blocks テーブル（SELECT）
# 解説: データの流れ:
#       各ルーター → この関数（ブロック ID リスト取得）→ 結果フィルタリング → ユーザーへ返す
#
# 解説: 使用ライブラリ:
#   List = Python の「リスト型」を型ヒントに使うための書き方（typing モジュール）。
#          Python 3.9 以降は list[str] と直接書けるが、後方互換のために List を使っている
#   supabase = このアプリ全体で使う Supabase 接続クライアント（supabase_client.py で作成）

# 解説: List 型ヒントをインポート（戻り値の型 List[str] = 文字列のリスト、を表現するため）
from typing import List

# 解説: Supabase の Python クライアント（blocks テーブルの SELECT に使う）
from app.core.supabase_client import supabase


# 解説: ブロック関係にある全ユーザーの ID を文字列リストで返す関数
def get_blocked_user_ids(user_id: str) -> List[str]:
    """
    指定ユーザーが関係するブロック相手の user_id 一覧を返す。
    自分がブロックした相手と自分をブロックした相手の両方を含む。
    """
    # 解説: blocks テーブルから blocker_id と blocked_id の2列だけを取得する
    # 解説: .or_(...) = 「blocker_id が自分 OR blocked_id が自分」の行を全部取る
    #       つまり自分がブロックした行も、自分がブロックされた行も両方拾う
    res = supabase.table("blocks").select("blocker_id, blocked_id").or_(
        f"blocker_id.eq.{user_id},blocked_id.eq.{user_id}"
    ).execute()

    # 解説: set（集合）= 重複を自動で除去できるデータ構造。同じ ID が2度入っても1つになる
    blocked_ids: set[str] = set()
    # 解説: res.data が None の場合は空リスト [] でループ（.or_ で0件でもエラーにならないように）
    for row in res.data or []:
        # 解説: blocker_id が自分 = 自分がブロックした行 → 相手は blocked_id
        if row["blocker_id"] == user_id:
            blocked_ids.add(row["blocked_id"])
        # 解説: それ以外 = 自分がブロックされた行 → 相手は blocker_id
        else:
            blocked_ids.add(row["blocker_id"])
    # 解説: set を list に変換して返す（呼び出し元で .not_.in_(...) 等に使いやすい形式）
    return list(blocked_ids)
