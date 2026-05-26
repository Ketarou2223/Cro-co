from typing import List

from app.core.supabase_client import supabase


def get_blocked_user_ids(user_id: str) -> List[str]:
    """
    指定ユーザーが関係するブロック相手の user_id 一覧を返す。
    自分がブロックした相手と自分をブロックした相手の両方を含む。
    """
    res = supabase.table("blocks").select("blocker_id, blocked_id").or_(
        f"blocker_id.eq.{user_id},blocked_id.eq.{user_id}"
    ).execute()

    blocked_ids: set[str] = set()
    for row in res.data or []:
        if row["blocker_id"] == user_id:
            blocked_ids.add(row["blocked_id"])
        else:
            blocked_ids.add(row["blocker_id"])
    return list(blocked_ids)
