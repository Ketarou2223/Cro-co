"""いいね送信者ボカし判定ヘルパ（女性受け手・充実度<80のとき作動）。

ボカしが active なとき:
  liker_ids   = 自分にいいねした相手ID - マッチ済み  (全経路でボカす)
  i_liked_ids = 自分がいいねした相手ID - マッチ済み  (詳細ページのみ)

gender != 'female' または score >= 80 のときは {"active": False} を即返し、
以降のボカし処理を一切しない（男性・80%以上の女性は無加工）。
"""

from app.core.supabase_client import supabase
from app.services.completeness import compute_completeness


def blur_targets_for(
    viewer_id: str,
    viewer_profile: dict,
    viewer_photo_count: int,
) -> dict:
    """viewer に対するボカし対象集合を返す。active=False のとき全経路でボカしなし。"""
    if viewer_profile.get("gender") != "female":
        return {"active": False}

    score: float = compute_completeness(viewer_profile, viewer_photo_count)["score"]
    if score >= 80.0:
        return {"active": False}

    # マッチ済み相手ID（マッチ後はボカさない）
    try:
        m_res = (
            supabase.table("matches")
            .select("user_a_id, user_b_id")
            .or_(f"user_a_id.eq.{viewer_id},user_b_id.eq.{viewer_id}")
            .execute()
        )
        matched_ids: set[str] = set()
        for row in (m_res.data or []):
            other = row["user_b_id"] if row["user_a_id"] == viewer_id else row["user_a_id"]
            matched_ids.add(other)
    except Exception:
        matched_ids = set()

    # 自分にいいねした相手（マッチ除外）
    try:
        liker_res = (
            supabase.table("likes")
            .select("liker_id")
            .eq("liked_id", viewer_id)
            .execute()
        )
        liker_ids: set[str] = {
            row["liker_id"] for row in (liker_res.data or [])
            if row["liker_id"] not in matched_ids
        }
    except Exception:
        liker_ids = set()

    # 自分がいいねした相手（マッチ除外）―詳細ページでのみ使用
    try:
        i_liked_res = (
            supabase.table("likes")
            .select("liked_id")
            .eq("liker_id", viewer_id)
            .execute()
        )
        i_liked_ids: set[str] = {
            row["liked_id"] for row in (i_liked_res.data or [])
            if row["liked_id"] not in matched_ids
        }
    except Exception:
        i_liked_ids = set()

    return {
        "active": True,
        "liker_ids": liker_ids,
        "i_liked_ids": i_liked_ids,
    }
