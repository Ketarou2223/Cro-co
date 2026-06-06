import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from gotrue.types import User
from postgrest.exceptions import APIError

from app.auth.dependencies import require_admin
from app.core.admin_log import log_admin_action
from app.core.image_utils import get_signed_image_url
from app.core.supabase_client import supabase
from app.schemas.admin import (
    AdminStats,
    BanRequest,
    FacultyBreakdown,
    InquiryItem,
    InquiryReplyRequest,
    InquiryStatusUpdateRequest,
    PendingPhotoItem,
    PendingProfileItem,
    RejectRequest,
    ReportItemExtended,
    ReportUpdateRequest,
    ReviewResponse,
    SignedUrlResponse,
    StatsBreakdownResponse,
    StatsTimeSeriesResponse,
    StudentIdDetailResponse,
    TimeSeriesPoint,
    UnbanRequest,
    UserDetailResponse,
    UserListItem,
    UserListResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin", tags=["admin"])

_SIGNED_URL_EXPIRES = 300  # 5分


@router.get("/pending", response_model=list[PendingProfileItem])
async def get_pending_profiles(
    current_user: User = Depends(require_admin),
) -> list[PendingProfileItem]:
    try:
        response = (
            supabase.table("profiles")
            .select("id, email, name, real_name, student_number, birth_date, year, faculty, department, bio, submitted_at, student_id_image_path, admission_year, identity_verified, gender, interest_in, profile_completed, clubs")
            .eq("status", "pending_review")
            .not_.is_("submitted_at", "null")
            .order("submitted_at", desc=False)
            .execute()
        )
    except APIError as e:
        logger.error("審査待ちプロフィール取得に失敗しました: %s", e.message)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="データの取得に失敗しました",
        )
    return [PendingProfileItem(**item) for item in response.data]


@router.get("/student-id/{user_id}", response_model=StudentIdDetailResponse)
async def get_student_id_signed_url(
    user_id: UUID,
    request: Request,
    current_user: User = Depends(require_admin),
) -> StudentIdDetailResponse:
    try:
        response = (
            supabase.table("profiles")
            .select("student_id_image_path, faculty, department, admission_year")
            .eq("id", str(user_id))
            .single()
            .execute()
        )
    except APIError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ユーザーが見つかりません",
        )

    if not response.data or not response.data.get("student_id_image_path"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="学生証画像が未提出です",
        )

    image_path: str = response.data["student_id_image_path"]

    try:
        result = supabase.storage.from_("student-ids").create_signed_url(
            path=image_path,
            expires_in=_SIGNED_URL_EXPIRES,
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="署名付きURLの生成に失敗しました",
        )

    # supabase-py v2 は dict {"signedURL": "..."} を返す
    if isinstance(result, dict):
        signed_url = result.get("signedURL") or result.get("signed_url", "")
    else:
        signed_url = getattr(result, "signed_url", "") or getattr(result, "signedURL", "")

    if not signed_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="署名付きURLの取得に失敗しました",
        )

    log_admin_action(
        admin_id=str(current_user.id),
        admin_email=current_user.email or "",
        action="view_student_id",
        target_type="user",
        target_id=str(user_id),
        request=request,
    )

    return StudentIdDetailResponse(
        signed_url=signed_url,
        faculty=response.data.get("faculty"),
        department=response.data.get("department"),
        admission_year=response.data.get("admission_year"),
    )


def _get_profile_status(user_id: str) -> str:
    """プロフィールの status を取得。存在しなければ 404 を raise。"""
    try:
        response = (
            supabase.table("profiles")
            .select("status")
            .eq("id", str(user_id))
            .single()
            .execute()
        )
    except APIError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ユーザーが見つかりません",
        )
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ユーザーが見つかりません",
        )
    return response.data["status"]


@router.post("/approve/{user_id}", response_model=ReviewResponse)
async def approve_user(
    user_id: UUID,
    request: Request,
    current_user: User = Depends(require_admin),
) -> ReviewResponse:
    current_status = _get_profile_status(user_id)
    if current_status in ("approved", "rejected"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"このユーザーは既に審査済みです（現在のステータス: {current_status}）",
        )

    now = datetime.now(timezone.utc)
    try:
        response = (
            supabase.table("profiles")
            .update(
                {
                    "status": "approved",
                    "reviewed_at": now.isoformat(),
                    "rejection_reason": None,
                    "identity_verified": True,
                }
            )
            .eq("id", str(user_id))
            .execute()
        )
    except APIError as e:
        logger.error("承認処理に失敗しました: %s", e.message)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="承認処理に失敗しました",
        )

    log_admin_action(
        admin_id=str(current_user.id),
        admin_email=current_user.email or "",
        action="approve_user",
        target_type="user",
        target_id=str(user_id),
        details={"previous_status": current_status},
        request=request,
    )

    updated = response.data[0] if response.data else {}
    return ReviewResponse(
        id=str(user_id),
        status=updated.get("status", "approved"),
        reviewed_at=updated.get("reviewed_at", now),
    )


@router.post("/reject/{user_id}", response_model=ReviewResponse)
async def reject_user(
    user_id: str,
    body: RejectRequest,
    request: Request,
    current_user: User = Depends(require_admin),
) -> ReviewResponse:
    current_status = _get_profile_status(user_id)
    if current_status in ("approved", "rejected"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"このユーザーは既に審査済みです（現在のステータス: {current_status}）",
        )

    now = datetime.now(timezone.utc)
    try:
        response = (
            supabase.table("profiles")
            .update(
                {
                    "status": "rejected",
                    "reviewed_at": now.isoformat(),
                    "rejection_reason": body.reason,
                }
            )
            .eq("id", str(user_id))
            .execute()
        )
    except APIError as e:
        logger.error("却下処理に失敗しました: %s", e.message)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="却下処理に失敗しました",
        )

    log_admin_action(
        admin_id=str(current_user.id),
        admin_email=current_user.email or "",
        action="reject_user",
        target_type="user",
        target_id=str(user_id),
        details={"reason": body.reason},
        request=request,
    )

    updated = response.data[0] if response.data else {}
    return ReviewResponse(
        id=str(user_id),
        status=updated.get("status", "rejected"),
        reviewed_at=updated.get("reviewed_at", now),
    )


@router.post("/suspend/{user_id}", response_model=ReviewResponse)
async def suspend_user_by_report(
    user_id: UUID,
    request: Request,
    current_user: User = Depends(require_admin),
) -> ReviewResponse:
    """通報による停止（ステータスを rejected に変更）。既に rejected でも上書き可。"""
    try:
        _get_profile_status(user_id)
    except HTTPException:
        raise

    now = datetime.now(timezone.utc)
    try:
        response = (
            supabase.table("profiles")
            .update(
                {
                    "status": "rejected",
                    "reviewed_at": now.isoformat(),
                    "rejection_reason": "通報による停止",
                }
            )
            .eq("id", str(user_id))
            .execute()
        )
    except APIError as e:
        logger.error("停止処理に失敗しました: %s", e.message)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="停止処理に失敗しました",
        )

    log_admin_action(
        admin_id=str(current_user.id),
        admin_email=current_user.email or "",
        action="suspend_user",
        target_type="user",
        target_id=str(user_id),
        request=request,
    )

    updated = response.data[0] if response.data else {}
    return ReviewResponse(
        id=str(user_id),
        status=updated.get("status", "rejected"),
        reviewed_at=updated.get("reviewed_at", now),
    )


@router.get("/stats", response_model=AdminStats)
async def get_stats(
    current_user: User = Depends(require_admin),
) -> AdminStats:
    now = datetime.now(timezone.utc)
    cutoff = (now.replace(hour=0, minute=0, second=0, microsecond=0)).isoformat()

    def _count(table: str, filters: dict | None = None, eq_status: str | None = None) -> int:
        try:
            q = supabase.table(table).select("id", count="exact")
            if eq_status:
                q = q.eq("status", eq_status)
            if filters:
                for k, v in filters.items():
                    q = q.eq(k, v)
            res = q.execute()
            return res.count or 0
        except Exception:
            return 0

    total_users = _count("profiles")
    pending_count = _count("profiles", eq_status="pending_review")
    approved_count = _count("profiles", eq_status="approved")
    rejected_count = _count("profiles", eq_status="rejected")
    total_matches = _count("matches")
    total_messages = _count("messages")
    total_reports = _count("reports", eq_status="pending")
    inquiry_unread_count = _count("inquiries", eq_status="unread")

    try:
        active_res = (
            supabase.table("profiles")
            .select("id", count="exact")
            .gte("last_seen_at", cutoff)
            .execute()
        )
        active_today = active_res.count or 0
    except Exception:
        active_today = 0

    return AdminStats(
        total_users=total_users,
        pending_count=pending_count,
        approved_count=approved_count,
        rejected_count=rejected_count,
        total_matches=total_matches,
        total_messages=total_messages,
        total_reports=total_reports,
        active_today=active_today,
        inquiry_unread_count=inquiry_unread_count,
    )


@router.post("/privacy-purge")
async def trigger_privacy_purge(
    request: Request,
    current_user: User = Depends(require_admin),
) -> dict:
    """個人情報削除バッチを手動実行する（テスト・緊急用）。"""
    from app.core.privacy_purge import run_purge_batch
    result = run_purge_batch()
    log_admin_action(
        admin_id=str(current_user.id),
        admin_email=current_user.email or "",
        action="manual_privacy_purge",
        target_type="system",
        details={
            "purged_approved": result.get("purged_approved"),
            "purged_rejected": result.get("purged_rejected"),
            "purged_hashes": result.get("purged_hashes"),
            "failed": result.get("failed"),
        },
        request=request,
    )
    return result


# ---------- ユーザー管理 ----------

def _sanitize_admin_search(raw: str) -> str:
    """admin 検索キーワードから LIKE ワイルドカードを無効化する（値の意味を守る層）。
    構文注入は呼び出し側が .ilike() パラメータ化で防ぐため、ここでは値レイヤのみ。
    """
    kw = raw.strip()
    kw = kw.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    kw = kw.replace("*", "")
    return kw


@router.get("/users", response_model=UserListResponse)
async def list_users(
    status_filter: Optional[str] = Query(None, alias="status", pattern="^(pending_review|approved|rejected|banned)$"),
    gender: Optional[str] = Query(None, pattern="^(male|female)$"),
    faculty: Optional[str] = None,
    search: Optional[str] = Query(None, max_length=100),
    sort: str = Query("created_desc", pattern="^(created_desc|created_asc|last_seen_desc|name_asc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_admin),
) -> UserListResponse:
    """ユーザー一覧（フィルター・検索・ページネーション）"""
    offset = (page - 1) * page_size

    q = supabase.table("profiles").select(
        "id, email, name, status, gender, year, faculty, department, "
        "profile_image_path, last_seen_at, created_at, reviewed_at, "
        "banned_at, privacy_purged_at",
        count="exact",
    )

    if status_filter:
        q = q.eq("status", status_filter)
    if gender:
        q = q.eq("gender", gender)
    if faculty:
        q = q.eq("faculty", faculty)

    if search:
        kw = _sanitize_admin_search(search)
        # .or_() による生フィルタ文字列組み立てを廃し、カラム別 .ilike() をアプリ側で合流させる。
        # 各 .ilike() は supabase-py がパラメータ化するため PostgREST フィルタ注入余地がゼロ。
        try:
            name_res = supabase.table("profiles").select("id").ilike("name", f"%{kw}%").execute()
            email_res = supabase.table("profiles").select("id").ilike("email", f"%{kw}%").execute()
        except APIError as e:
            logger.error("ユーザー検索失敗: %s", e.message)
            raise HTTPException(status_code=500, detail="ユーザー一覧の取得に失敗しました")
        matched_ids = {r["id"] for r in (name_res.data or [])} | {r["id"] for r in (email_res.data or [])}
        if not matched_ids:
            return UserListResponse(users=[], total=0, page=page, page_size=page_size)
        q = q.in_("id", list(matched_ids))

    if sort == "created_desc":
        q = q.order("created_at", desc=True)
    elif sort == "created_asc":
        q = q.order("created_at", desc=False)
    elif sort == "last_seen_desc":
        q = q.order("last_seen_at", desc=True, nullsfirst=False)
    elif sort == "name_asc":
        q = q.order("name", desc=False)

    q = q.range(offset, offset + page_size - 1)

    try:
        res = q.execute()
    except APIError as e:
        logger.error("ユーザー一覧取得失敗: %s", e.message)
        raise HTTPException(status_code=500, detail="ユーザー一覧の取得に失敗しました")

    users = []
    for row in (res.data or []):
        path = row.get("profile_image_path")
        users.append(UserListItem(
            **row,
            profile_image_url=get_signed_image_url(path) if path else None,
        ))

    return UserListResponse(
        users=users,
        total=res.count or 0,
        page=page,
        page_size=page_size,
    )


@router.get("/users/{user_id}", response_model=UserDetailResponse)
async def get_user_detail(
    user_id: UUID,
    request: Request,
    current_user: User = Depends(require_admin),
) -> UserDetailResponse:
    """ユーザー詳細（閲覧ログ記録あり）"""
    try:
        res = (
            supabase.table("profiles")
            .select("*")
            .eq("id", str(user_id))
            .single()
            .execute()
        )
    except APIError:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")

    p = res.data
    if not p:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")

    log_admin_action(
        admin_id=str(current_user.id),
        admin_email=current_user.email or "",
        action="view_user_detail",
        target_type="user",
        target_id=str(user_id),
        request=request,
    )

    # 統計取得
    try:
        match_count = (supabase.table("matches").select("id", count="exact")
            .or_(f"user_a_id.eq.{user_id},user_b_id.eq.{user_id}").execute()).count or 0
    except Exception:
        match_count = 0

    try:
        sent_likes = (supabase.table("likes").select("liker_id", count="exact")
            .eq("liker_id", str(user_id)).execute()).count or 0
    except Exception:
        sent_likes = 0

    try:
        received_likes = (supabase.table("likes").select("liked_id", count="exact")
            .eq("liked_id", str(user_id)).execute()).count or 0
    except Exception:
        received_likes = 0

    try:
        report_count = (supabase.table("reports").select("id", count="exact")
            .eq("reported_id", str(user_id)).execute()).count or 0
    except Exception:
        report_count = 0

    # 写真取得
    photos = []
    try:
        photos_res = (supabase.table("profile_images")
            .select("id, image_path, display_order")
            .eq("user_id", str(user_id))
            .order("display_order")
            .execute())
        for ph in (photos_res.data or []):
            photos.append({
                "id": ph["id"],
                "url": get_signed_image_url(ph["image_path"]),
                "display_order": ph["display_order"],
            })
    except Exception:
        pass

    path = p.get("profile_image_path")
    detail_fields = {
        k: v for k, v in p.items()
        if k in UserDetailResponse.model_fields
    }

    return UserDetailResponse(
        **detail_fields,
        profile_image_url=get_signed_image_url(path) if path else None,
        photos=photos,
        match_count=match_count,
        sent_likes=sent_likes,
        received_likes=received_likes,
        report_count=report_count,
    )


@router.post("/users/{user_id}/ban", response_model=ReviewResponse)
async def ban_user(
    user_id: UUID,
    body: BanRequest,
    request: Request,
    current_user: User = Depends(require_admin),
) -> ReviewResponse:
    """ユーザーをBAN（status='banned'）"""
    target_status = _get_profile_status(user_id)
    if target_status == "banned":
        raise HTTPException(status_code=409, detail="既にBAN済みです")

    now = datetime.now(timezone.utc)
    try:
        supabase.table("profiles").update({
            "status": "banned",
            "banned_at": now.isoformat(),
            "banned_by": str(current_user.id),
            "ban_reason": body.reason,
        }).eq("id", str(user_id)).execute()
    except APIError as e:
        logger.error("BAN処理失敗: %s", e.message)
        raise HTTPException(status_code=500, detail="BAN処理に失敗しました")

    log_admin_action(
        admin_id=str(current_user.id),
        admin_email=current_user.email or "",
        action="ban_user",
        target_type="user",
        target_id=str(user_id),
        details={"reason": body.reason, "previous_status": target_status},
        request=request,
    )

    return ReviewResponse(id=str(user_id), status="banned", reviewed_at=now)


@router.post("/users/{user_id}/unban", response_model=ReviewResponse)
async def unban_user(
    user_id: UUID,
    body: UnbanRequest,
    request: Request,
    current_user: User = Depends(require_admin),
) -> ReviewResponse:
    """ユーザーのBAN解除（status='approved'に戻す）"""
    target_status = _get_profile_status(user_id)
    if target_status != "banned":
        raise HTTPException(status_code=409, detail="BAN状態ではありません")

    now = datetime.now(timezone.utc)
    try:
        supabase.table("profiles").update({
            "status": "approved",
            "banned_at": None,
            "banned_by": None,
            "ban_reason": None,
        }).eq("id", str(user_id)).execute()
    except APIError as e:
        logger.error("BAN解除失敗: %s", e.message)
        raise HTTPException(status_code=500, detail="BAN解除に失敗しました")

    log_admin_action(
        admin_id=str(current_user.id),
        admin_email=current_user.email or "",
        action="unban_user",
        target_type="user",
        target_id=str(user_id),
        details={"note": body.note},
        request=request,
    )

    return ReviewResponse(id=str(user_id), status="approved", reviewed_at=now)


# ---------- 通報管理 ----------

@router.get("/reports", response_model=list[ReportItemExtended])
async def get_reports(
    status_filter: Optional[str] = Query(None, alias="status", pattern="^(pending|investigating|resolved|dismissed)$"),
    current_user: User = Depends(require_admin),
) -> list[ReportItemExtended]:
    """通報一覧（ステータスフィルター対応）"""
    q = (supabase.table("reports")
        .select("id, reporter_id, reported_id, reason, detail, created_at, "
                "status, resolved_at, resolved_by, resolution_note, action_taken")
        .order("created_at", desc=True)
        .limit(200))

    if status_filter:
        q = q.eq("status", status_filter)

    try:
        res = q.execute()
    except APIError as e:
        logger.error("通報一覧取得失敗: %s", e.message)
        raise HTTPException(status_code=500, detail="通報一覧の取得に失敗しました")

    rows = res.data or []
    user_ids = list({r["reporter_id"] for r in rows} | {r["reported_id"] for r in rows})

    profiles_map: dict[str, dict] = {}
    if user_ids:
        try:
            p_res = (supabase.table("profiles")
                .select("id, name, status")
                .in_("id", user_ids).execute())
            profiles_map = {p["id"]: p for p in (p_res.data or [])}
        except Exception:
            pass

    return [
        ReportItemExtended(
            id=r["id"],
            reporter_id=r["reporter_id"],
            reporter_name=profiles_map.get(r["reporter_id"], {}).get("name"),
            reported_id=r["reported_id"],
            reported_name=profiles_map.get(r["reported_id"], {}).get("name"),
            reason=r["reason"],
            detail=r.get("detail"),
            created_at=r["created_at"],
            status=r.get("status", "pending"),
            resolved_at=r.get("resolved_at"),
            resolved_by=r.get("resolved_by"),
            resolution_note=r.get("resolution_note"),
            action_taken=r.get("action_taken"),
            reported_user_status=profiles_map.get(r["reported_id"], {}).get("status"),
        )
        for r in rows
    ]


@router.patch("/reports/{report_id}", response_model=ReportItemExtended)
async def update_report(
    report_id: UUID,
    body: ReportUpdateRequest,
    request: Request,
    current_user: User = Depends(require_admin),
) -> ReportItemExtended:
    """通報のステータス・対応メモ・実施アクションを更新"""
    now = datetime.now(timezone.utc)

    # 通知送信のために通報対象ユーザーを先取得
    reported_id: str | None = None
    try:
        rpt_res = (
            supabase.table("reports")
            .select("reported_id")
            .eq("id", str(report_id))
            .single()
            .execute()
        )
        reported_id = rpt_res.data.get("reported_id") if rpt_res.data else None
    except Exception:
        pass

    update_data: dict = {"status": body.status}

    if body.status in ("resolved", "dismissed"):
        update_data["resolved_at"] = now.isoformat()
        update_data["resolved_by"] = str(current_user.id)

    if body.resolution_note is not None:
        update_data["resolution_note"] = body.resolution_note
    if body.action_taken is not None:
        update_data["action_taken"] = body.action_taken

    try:
        supabase.table("reports").update(update_data).eq("id", str(report_id)).execute()
    except APIError as e:
        logger.error("通報更新失敗: %s", e.message)
        raise HTTPException(status_code=500, detail="通報の更新に失敗しました")

    # 警告アクション時: 通報対象ユーザーにシステム通知を送信
    if body.action_taken == "warning" and body.status == "resolved" and reported_id:
        try:
            supabase.table("notifications").insert({
                "user_id": reported_id,
                "type": "admin_warning",
                "from_user_id": None,
                "message_preview": (
                    "あなたのプロフィール・行動について通報がありました。"
                    "利用規約をご確認の上、適切なご利用をお願いします。"
                    "繰り返される場合、アカウント停止の対象となります。"
                ),
            }).execute()
        except Exception as e:
            logger.warning("管理者警告通知の送信に失敗しました report=%s: %s", report_id, e)

    log_admin_action(
        admin_id=str(current_user.id),
        admin_email=current_user.email or "",
        action="update_report",
        target_type="report",
        target_id=str(report_id),
        details={
            "status": body.status,
            "action_taken": body.action_taken,
            "note": body.resolution_note,
        },
        request=request,
    )

    # 更新後のレコードを取得して返す
    try:
        upd_res = (supabase.table("reports")
            .select("id, reporter_id, reported_id, reason, detail, created_at, "
                    "status, resolved_at, resolved_by, resolution_note, action_taken")
            .eq("id", str(report_id))
            .single()
            .execute())
        r = upd_res.data
        if not r:
            raise HTTPException(status_code=404, detail="通報が見つかりません")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("通報再取得失敗: %s", e)
        raise HTTPException(status_code=500, detail="更新後のデータ取得に失敗しました")

    profiles_map: dict[str, dict] = {}
    try:
        p_res = (supabase.table("profiles")
            .select("id, name, status")
            .in_("id", [r["reporter_id"], r["reported_id"]])
            .execute())
        profiles_map = {p["id"]: p for p in (p_res.data or [])}
    except Exception:
        pass

    return ReportItemExtended(
        id=r["id"],
        reporter_id=r["reporter_id"],
        reporter_name=profiles_map.get(r["reporter_id"], {}).get("name"),
        reported_id=r["reported_id"],
        reported_name=profiles_map.get(r["reported_id"], {}).get("name"),
        reason=r["reason"],
        detail=r.get("detail"),
        created_at=r["created_at"],
        status=r.get("status", "pending"),
        resolved_at=r.get("resolved_at"),
        resolved_by=r.get("resolved_by"),
        resolution_note=r.get("resolution_note"),
        action_taken=r.get("action_taken"),
        reported_user_status=profiles_map.get(r["reported_id"], {}).get("status"),
    )


# ---------- 統計 ----------

@router.get("/stats/timeseries", response_model=StatsTimeSeriesResponse)
async def get_stats_timeseries(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(require_admin),
) -> StatsTimeSeriesResponse:
    """登録者・マッチ数の時系列データ"""
    from datetime import date as date_type

    end = datetime.now(timezone.utc).date()
    start = end - timedelta(days=days - 1)
    start_iso = start.isoformat()

    # 登録者時系列
    reg_data: list[TimeSeriesPoint] = []
    try:
        res = (supabase.table("profiles")
            .select("created_at")
            .gte("created_at", start_iso)
            .execute())
        counts: dict[str, int] = {}
        for r in (res.data or []):
            d = r["created_at"][:10]
            counts[d] = counts.get(d, 0) + 1

        prev_total_res = (supabase.table("profiles")
            .select("id", count="exact")
            .lt("created_at", start_iso)
            .execute())
        cumulative = prev_total_res.count or 0

        for i in range(days):
            d = (start + timedelta(days=i)).isoformat()
            c = counts.get(d, 0)
            cumulative += c
            reg_data.append(TimeSeriesPoint(date=d, count=c, cumulative=cumulative))
    except Exception as e:
        logger.error("登録者時系列取得失敗: %s", e)

    # マッチ時系列
    match_data: list[TimeSeriesPoint] = []
    try:
        res = (supabase.table("matches")
            .select("created_at")
            .gte("created_at", start_iso)
            .execute())
        match_counts: dict[str, int] = {}
        for r in (res.data or []):
            d = r["created_at"][:10]
            match_counts[d] = match_counts.get(d, 0) + 1

        prev_total_res = (supabase.table("matches")
            .select("id", count="exact")
            .lt("created_at", start_iso)
            .execute())
        cumulative = prev_total_res.count or 0

        for i in range(days):
            d = (start + timedelta(days=i)).isoformat()
            c = match_counts.get(d, 0)
            cumulative += c
            match_data.append(TimeSeriesPoint(date=d, count=c, cumulative=cumulative))
    except Exception as e:
        logger.error("マッチ時系列取得失敗: %s", e)

    return StatsTimeSeriesResponse(registrations=reg_data, matches=match_data)


@router.get("/stats/breakdown", response_model=StatsBreakdownResponse)
async def get_stats_breakdown(
    current_user: User = Depends(require_admin),
) -> StatsBreakdownResponse:
    """学部・性別・学年別の内訳（approved ユーザーのみ）"""
    try:
        res = (supabase.table("profiles")
            .select("faculty, gender, year")
            .eq("status", "approved")
            .execute())
    except APIError as e:
        logger.error("内訳取得失敗: %s", e.message)
        return StatsBreakdownResponse(by_faculty=[], by_gender={}, by_year={})

    rows = res.data or []

    faculty_map: dict[str, dict] = {}
    for r in rows:
        f = r.get("faculty") or "未設定"
        if f not in faculty_map:
            faculty_map[f] = {"count": 0, "male": 0, "female": 0}
        faculty_map[f]["count"] += 1
        g = r.get("gender")
        if g == "male":
            faculty_map[f]["male"] += 1
        elif g == "female":
            faculty_map[f]["female"] += 1

    by_faculty = [
        FacultyBreakdown(faculty=k, count=v["count"], male=v["male"], female=v["female"])
        for k, v in sorted(faculty_map.items(), key=lambda x: -x[1]["count"])
    ]

    by_gender: dict[str, int] = {"male": 0, "female": 0}
    for r in rows:
        g = r.get("gender")
        if g in by_gender:
            by_gender[g] += 1

    by_year: dict[str, int] = {}
    for r in rows:
        y = r.get("year")
        if y is not None:
            key = str(y)
            by_year[key] = by_year.get(key, 0) + 1

    return StatsBreakdownResponse(by_faculty=by_faculty, by_gender=by_gender, by_year=by_year)


# ---------- 監査ログ ----------

@router.get("/logs")
async def get_admin_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_admin),
) -> dict:
    """管理者操作ログ一覧"""
    offset = (page - 1) * page_size
    try:
        res = (supabase.table("admin_logs")
            .select("*", count="exact")
            .order("created_at", desc=True)
            .range(offset, offset + page_size - 1)
            .execute())
    except APIError as e:
        logger.error("ログ取得失敗: %s", e.message)
        raise HTTPException(status_code=500, detail="ログ取得に失敗しました")

    return {
        "logs": res.data or [],
        "total": res.count or 0,
        "page": page,
        "page_size": page_size,
    }


# ---------- 問い合わせ管理 ----------

@router.get("/inquiries", response_model=list[InquiryItem])
async def list_inquiries(
    status_filter: Optional[str] = Query(None, alias="status", pattern="^(unread|read|replied|closed)$"),
    current_user: User = Depends(require_admin),
) -> list[InquiryItem]:
    """問い合わせ一覧（管理者用）"""
    q = (supabase.table("inquiries")
        .select("*")
        .order("created_at", desc=True)
        .limit(200))
    if status_filter:
        q = q.eq("status", status_filter)

    try:
        res = q.execute()
    except APIError as e:
        logger.error("問い合わせ一覧取得失敗: %s", e.message)
        raise HTTPException(status_code=500, detail="一覧取得に失敗しました")

    rows = res.data or []
    user_ids = list({r["user_id"] for r in rows})

    profiles_map: dict[str, dict] = {}
    if user_ids:
        try:
            p_res = (supabase.table("profiles")
                .select("id, email, name")
                .in_("id", user_ids).execute())
            profiles_map = {p["id"]: p for p in (p_res.data or [])}
        except Exception:
            pass

    return [
        InquiryItem(
            **{k: v for k, v in r.items() if k in InquiryItem.model_fields},
            user_email=profiles_map.get(r["user_id"], {}).get("email"),
            user_name=profiles_map.get(r["user_id"], {}).get("name"),
        )
        for r in rows
    ]


@router.post("/inquiries/{inquiry_id}/reply")
async def reply_inquiry(
    inquiry_id: UUID,
    body: InquiryReplyRequest,
    request: Request,
    current_user: User = Depends(require_admin),
) -> dict:
    """問い合わせに返信"""
    now = datetime.now(timezone.utc)
    try:
        supabase.table("inquiries").update({
            "admin_reply": body.reply,
            "admin_note": body.note,
            "status": "replied",
            "replied_at": now.isoformat(),
            "replied_by": str(current_user.id),
            "updated_at": now.isoformat(),
        }).eq("id", str(inquiry_id)).execute()
    except APIError as e:
        logger.error("問い合わせ返信失敗: %s", e.message)
        raise HTTPException(status_code=500, detail="返信に失敗しました")

    log_admin_action(
        admin_id=str(current_user.id),
        admin_email=current_user.email or "",
        action="reply_inquiry",
        target_type="inquiry",
        target_id=str(inquiry_id),
        request=request,
    )
    return {"ok": True}


@router.get("/photos/pending", response_model=list[PendingPhotoItem])
async def get_pending_photos(
    current_user: User = Depends(require_admin),
) -> list[PendingPhotoItem]:
    """審査待ち写真一覧"""
    try:
        res = (
            supabase.table("profile_images")
            .select("id, user_id, image_path, display_order, created_at")
            .eq("status", "pending")
            .order("created_at")
            .limit(200)
            .execute()
        )
    except APIError as e:
        logger.error("審査待ち写真取得失敗: %s", e.message)
        raise HTTPException(status_code=500, detail="写真一覧の取得に失敗しました")

    rows = res.data or []
    user_ids = list({r["user_id"] for r in rows})

    profiles_map: dict[str, str | None] = {}
    if user_ids:
        try:
            p_res = (supabase.table("profiles")
                .select("id, name")
                .in_("id", user_ids)
                .execute())
            profiles_map = {p["id"]: p.get("name") for p in (p_res.data or [])}
        except Exception:
            pass

    return [
        PendingPhotoItem(
            id=r["id"],
            user_id=r["user_id"],
            image_path=r["image_path"],
            display_order=r["display_order"],
            created_at=r["created_at"],
            photo_url=get_signed_image_url(r["image_path"]),
            user_name=profiles_map.get(r["user_id"]),
        )
        for r in rows
    ]


@router.post("/photos/{photo_id}/approve")
async def approve_photo(
    photo_id: UUID,
    request: Request,
    current_user: User = Depends(require_admin),
) -> dict:
    """写真を承認"""
    try:
        res = (
            supabase.table("profile_images")
            .update({"status": "approved"})
            .eq("id", str(photo_id))
            .eq("status", "pending")
            .execute()
        )
    except APIError as e:
        logger.error("写真承認失敗: %s", e.message)
        raise HTTPException(status_code=500, detail="写真の承認に失敗しました")

    if not res.data:
        raise HTTPException(status_code=404, detail="写真が見つかりません（または既に審査済み）")

    row = res.data[0]

    # 承認済み写真がない場合は profile_image_path を設定
    try:
        uid = row["user_id"]
        profile_res = (supabase.table("profiles")
            .select("profile_image_path")
            .eq("id", uid)
            .single()
            .execute())
        if profile_res.data and not profile_res.data.get("profile_image_path"):
            supabase.table("profiles").update(
                {"profile_image_path": row["image_path"]}
            ).eq("id", uid).execute()
    except Exception:
        pass

    log_admin_action(
        admin_id=str(current_user.id),
        admin_email=current_user.email or "",
        action="approve_photo",
        target_type="photo",
        target_id=str(photo_id),
        request=request,
    )
    return {"ok": True, "photo_id": str(photo_id)}


@router.post("/photos/{photo_id}/reject")
async def reject_photo(
    photo_id: UUID,
    request: Request,
    current_user: User = Depends(require_admin),
) -> dict:
    """写真を却下"""
    try:
        res = (
            supabase.table("profile_images")
            .update({"status": "rejected"})
            .eq("id", str(photo_id))
            .eq("status", "pending")
            .execute()
        )
    except APIError as e:
        logger.error("写真却下失敗: %s", e.message)
        raise HTTPException(status_code=500, detail="写真の却下に失敗しました")

    if not res.data:
        raise HTTPException(status_code=404, detail="写真が見つかりません（または既に審査済み）")

    log_admin_action(
        admin_id=str(current_user.id),
        admin_email=current_user.email or "",
        action="reject_photo",
        target_type="photo",
        target_id=str(photo_id),
        request=request,
    )
    return {"ok": True, "photo_id": str(photo_id)}


@router.patch("/inquiries/{inquiry_id}")
async def update_inquiry_status(
    inquiry_id: UUID,
    body: InquiryStatusUpdateRequest,
    request: Request,
    current_user: User = Depends(require_admin),
) -> dict:
    """問い合わせのステータス更新（既読・クローズなど）"""
    now = datetime.now(timezone.utc)
    update_data: dict = {
        "status": body.status,
        "updated_at": now.isoformat(),
    }
    if body.note is not None:
        update_data["admin_note"] = body.note

    try:
        supabase.table("inquiries").update(update_data).eq("id", str(inquiry_id)).execute()
    except APIError as e:
        logger.error("問い合わせ更新失敗: %s", e.message)
        raise HTTPException(status_code=500, detail="更新に失敗しました")

    log_admin_action(
        admin_id=str(current_user.id),
        admin_email=current_user.email or "",
        action="update_inquiry_status",
        target_type="inquiry",
        target_id=str(inquiry_id),
        details={"status": body.status},
        request=request,
    )
    return {"ok": True}
