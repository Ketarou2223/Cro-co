# 解説: このファイルは「運営お知らせ」のユーザー向けエンドポイントを定義する。
# 解説: 全エンドポイントは get_approved_user（承認済みユーザーのみ）。
# 解説: block_utils 不要（運営→approved ブロードキャストで個人情報露出経路なし）。
# 解説: エンドポイント一覧:
#   GET  /api/announcements              → 自分にマッチするお知らせ一覧（is_deleted=false・新しい順・既読フラグ付き）
#   GET  /api/announcements/unread-count → ベル赤点用 未読件数
#   POST /api/announcements/read         → 自分宛お知らせを全件既読化（パネルを開いた時点で呼ぶ）
# 解説: メンテ申し送り: これら3エンドポイントはメンテ中でも通す allowlist 対象（②メンテ機能実装時に exemption リストへ追加）。

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from supabase_auth.types import User

from app.auth.approved_user import get_approved_user
from app.core.limiter import limiter
from app.core.supabase_client import supabase
from app.schemas.announcements import AnnouncementUnreadCount, AnnouncementUserItem

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/announcements", tags=["announcements"])


def _matches_announcement(ann: dict, profile: dict) -> bool:
    """お知らせのセグメント条件がプロフィールにマッチするか判定する。
    target_all=true → 無条件マッチ。
    else: faculties/grades/genders が空なら該当軸は無条件・複数軸は AND 合成。
    """
    if ann.get('target_all'):
        return True
    faculties: list[str] = ann.get('target_faculties') or []
    grades: list[int] = ann.get('target_grades') or []
    genders: list[str] = ann.get('target_genders') or []
    faculty_ok = not faculties or profile.get('faculty') in faculties
    grade_ok = not grades or profile.get('year') in grades
    gender_ok = not genders or profile.get('gender') in genders
    return faculty_ok and grade_ok and gender_ok


def _fetch_matching_with_reads(my_id: str) -> tuple[list[dict], set[str]]:
    """マッチするお知らせ一覧と既読 ID セットを返す（3クエリ）。"""
    # 1. ユーザープロフィール（セグメント照合用）
    try:
        prof_res = (
            supabase.table("profiles")
            .select("faculty, year, gender")
            .eq("id", my_id)
            .single()
            .execute()
        )
        profile: dict = prof_res.data or {}
    except Exception:
        profile = {}

    # 2. 全非削除お知らせ（新しい順）
    try:
        ann_res = (
            supabase.table("announcements")
            .select("id, title, body, created_at, target_all, target_faculties, target_grades, target_genders")
            .eq("is_deleted", False)
            .order("created_at", desc=True)
            .execute()
        )
        all_anns: list[dict] = ann_res.data or []
    except Exception:
        return [], set()

    matching = [a for a in all_anns if _matches_announcement(a, profile)]
    if not matching:
        return [], set()

    # 3. 既読セット
    matching_ids = [a['id'] for a in matching]
    try:
        reads_res = (
            supabase.table("announcement_reads")
            .select("announcement_id")
            .eq("user_id", my_id)
            .in_("announcement_id", matching_ids)
            .execute()
        )
        read_ids: set[str] = {r['announcement_id'] for r in (reads_res.data or [])}
    except Exception:
        read_ids = set()

    return matching, read_ids


@router.get("/", response_model=list[AnnouncementUserItem])
@limiter.limit("60/min")
async def get_announcements(
    request: Request,
    current_user: User = Depends(get_approved_user),
) -> list[AnnouncementUserItem]:
    """自分にマッチするお知らせ一覧（新しい順・既読フラグ付き）。"""
    my_id = str(current_user.id)
    matching, read_ids = _fetch_matching_with_reads(my_id)
    return [
        AnnouncementUserItem(
            id=a['id'],
            title=a['title'],
            body=a['body'],
            created_at=a['created_at'],
            is_read=a['id'] in read_ids,
        )
        for a in matching
    ]


@router.get("/unread-count", response_model=AnnouncementUnreadCount)
@limiter.limit("120/min")
async def get_announcement_unread_count(
    request: Request,
    current_user: User = Depends(get_approved_user),
) -> AnnouncementUnreadCount:
    """ベル赤点用: 未読お知らせ件数。"""
    my_id = str(current_user.id)
    matching, read_ids = _fetch_matching_with_reads(my_id)
    unread = sum(1 for a in matching if a['id'] not in read_ids)
    return AnnouncementUnreadCount(unread_count=unread)


@router.post("/read")
@limiter.limit("10/min")
async def mark_all_read(
    request: Request,
    current_user: User = Depends(get_approved_user),
) -> dict:
    """自分宛の未読お知らせを全件既読化する（パネルを開いた時点で呼ぶ）。"""
    my_id = str(current_user.id)
    matching, read_ids = _fetch_matching_with_reads(my_id)
    unread = [a for a in matching if a['id'] not in read_ids]
    if not unread:
        return {"ok": True, "marked": 0}

    now_iso = datetime.now(timezone.utc).isoformat()
    rows = [
        {"announcement_id": a['id'], "user_id": my_id, "read_at": now_iso}
        for a in unread
    ]
    try:
        (
            supabase.table("announcement_reads")
            .upsert(rows, on_conflict="announcement_id,user_id")
            .execute()
        )
    except Exception as e:
        # fail-open: 既読化失敗でもアプリは動く（次回開いたとき再試行される）
        logger.error("お知らせ既読化に失敗しました: %s", e)
    return {"ok": True, "marked": len(rows)}
