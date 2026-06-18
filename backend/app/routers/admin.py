# 解説: このファイルは「管理者専用」の API エンドポイントを定義する。
# 解説: 呼ばれる場所: main.py で app.include_router(admin.router) として登録される
# 解説: 全エンドポイントは Depends(require_admin) による管理者認証が必須
# 解説: エンドポイント一覧:
#   GET    /api/admin/pending                   → 審査待ちプロフィール一覧
#   GET    /api/admin/student-id/{id}           → 学生証の署名付き URL を返す
#   POST   /api/admin/approve/{id}              → ユーザーを承認する
#   POST   /api/admin/reject/{id}               → ユーザーを却下する
#   POST   /api/admin/suspend/{id}              → ユーザーを停止する（通報対応）
#   GET    /api/admin/stats                     → 統計情報を返す
#   POST   /api/admin/privacy-purge             → 個人情報削除バッチを手動実行する
#   GET    /api/admin/users                     → ユーザー一覧（フィルタ・検索・ページング）
#   GET    /api/admin/users/{id}                → ユーザー詳細を返す
#   POST   /api/admin/users/{id}/ban            → ユーザーを BAN する
#   POST   /api/admin/users/{id}/unban          → ユーザーの BAN を解除する
#   GET    /api/admin/reports                   → 通報一覧を返す
#   PATCH  /api/admin/reports/{id}              → 通報のステータスを更新する
#   GET    /api/admin/stats/timeseries          → 登録者・マッチ数の時系列データ
#   GET    /api/admin/stats/breakdown           → 学部・性別・学年別の内訳
#   GET    /api/admin/logs                      → 管理者操作ログ一覧
#   GET    /api/admin/inquiries                 → 問い合わせ一覧（管理者用）
#   POST   /api/admin/inquiries/{id}/reply      → 問い合わせに返信する
#   GET    /api/admin/photos/pending            → 審査待ち写真一覧
#   POST   /api/admin/photos/{id}/approve       → 写真を承認する
#   POST   /api/admin/photos/{id}/reject        → 写真を却下する
#   PATCH  /api/admin/inquiries/{id}            → 問い合わせのステータスを更新する
# 解説: 呼ぶ先:
#   Supabase: profiles / matches / messages / likes / reports / inquiries 等多数
#   admin_log.py: 管理者操作を audit log に記録する
#   image_utils.py: 署名付き URL 生成

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from supabase_auth.types import User
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

# 解説: 学生証署名付き URL の有効期限 = 5分（閲覧後すぐに期限切れになる）
_SIGNED_URL_EXPIRES = 300  # 5分


# 解説: GET /api/admin/pending = 審査待ち（pending_review）のプロフィール一覧を返す
@router.get("/pending", response_model=list[PendingProfileItem])
async def get_pending_profiles(
    current_user: User = Depends(require_admin),
) -> list[PendingProfileItem]:
    try:
        response = (
            supabase.table("profiles")
            .select("id, email, name, real_name, student_number, birth_date, year, faculty, department, bio, submitted_at, student_id_image_path, admission_year, identity_verified, gender, interest_in, profile_completed, clubs")
            .eq("status", "pending_review")
            # 解説: submitted_at が NULL でないもの = 学生証を提出済みのもの
            .not_.is_("submitted_at", "null")
            # 解説: 申請が古い順（submitted_at の昇順）に返す（先着順で審査するため）
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


# 解説: GET /api/admin/student-id/{user_id} = 学生証画像の5分限定署名付き URL を返す
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
        # 解説: student-ids バケットの指定パスに対して expires_in 秒有効な署名付き URL を生成する
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
    # 解説: SDK バージョンによってキー名が "signedURL" と "signed_url" で違う
    if isinstance(result, dict):
        signed_url = result.get("signedURL") or result.get("signed_url", "")
    else:
        signed_url = getattr(result, "signed_url", "") or getattr(result, "signedURL", "")

    if not signed_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="署名付きURLの取得に失敗しました",
        )

    # 解説: 管理者が学生証を閲覧したことを audit log に記録する
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


# 解説: プロフィールの現在の status を取得するヘルパ（承認・却下前に状態確認に使う）
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


# 解説: POST /api/admin/approve/{user_id} = ユーザーの審査を承認する
@router.post("/approve/{user_id}", response_model=ReviewResponse)
async def approve_user(
    user_id: UUID,
    request: Request,
    current_user: User = Depends(require_admin),
) -> ReviewResponse:
    current_status = _get_profile_status(user_id)
    # 解説: 既に審査済み（approved or rejected）のユーザーは再審査不可
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
                    # 解説: identity_verified = True = 身元確認済み（以降は学籍情報の変更不可）
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


# 解説: POST /api/admin/reject/{user_id} = ユーザーの審査を却下する
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
                    # 解説: rejection_reason = 却下理由（ユーザーに通知される）
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


# 解説: POST /api/admin/suspend/{user_id} = 通報対応でユーザーを停止する（rejected に変更）
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


# 解説: GET /api/admin/stats = ダッシュボード用の集計統計を返す
@router.get("/stats", response_model=AdminStats)
async def get_stats(
    current_user: User = Depends(require_admin),
) -> AdminStats:
    now = datetime.now(timezone.utc)
    # 解説: 今日の 0:00 UTC を計算する（当日アクティブ数の集計基準）
    cutoff = (now.replace(hour=0, minute=0, second=0, microsecond=0)).isoformat()

    # 解説: テーブル・条件を指定して件数を取得する共通ヘルパ（失敗時は 0 を返す）
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
    # 解説: 未処理（pending）の通報数のみカウントする
    total_reports = _count("reports", eq_status="pending")
    inquiry_unread_count = _count("inquiries", eq_status="unread")

    try:
        # 解説: 今日 cutoff 以降に last_seen_at が更新されたユーザー数 = 今日のアクティブ数
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


# 解説: POST /api/admin/privacy-purge = 個人情報削除バッチを手動実行する（緊急・テスト用）
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

# 解説: admin 検索キーワードから LIKE ワイルドカードを無効化するヘルパ
def _sanitize_admin_search(raw: str) -> str:
    """admin 検索キーワードから LIKE ワイルドカードを無効化する（値の意味を守る層）。
    構文注入は呼び出し側が .ilike() パラメータ化で防ぐため、ここでは値レイヤのみ。
    """
    kw = raw.strip()
    kw = kw.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    kw = kw.replace("*", "")
    return kw


# 解説: GET /api/admin/users = ユーザー一覧（フィルタ・検索・ページネーション対応）
@router.get("/users", response_model=UserListResponse)
async def list_users(
    # 解説: alias="status" = クエリパラメータ名が "status" でも受け取れる（Pythonの予約語回避）
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
    # 解説: offset = (page-1) * page_size で先頭何件をスキップするかを計算する
    offset = (page - 1) * page_size

    q = supabase.table("profiles").select(
        "id, email, name, status, gender, year, faculty, department, "
        "profile_image_path, last_seen_at, created_at, reviewed_at, "
        "banned_at, privacy_purged_at",
        # 解説: count="exact" = 件数を合わせて返す（ページネーション用）
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
        # 解説: name と email それぞれで検索して OR 合算する
        try:
            name_res = supabase.table("profiles").select("id").ilike("name", f"%{kw}%").execute()
            email_res = supabase.table("profiles").select("id").ilike("email", f"%{kw}%").execute()
        except APIError as e:
            logger.error("ユーザー検索失敗: %s", e.message)
            raise HTTPException(status_code=500, detail="ユーザー一覧の取得に失敗しました")
        # 解説: 2つの結果を set 演算で OR 合算した ID セット
        matched_ids = {r["id"] for r in (name_res.data or [])} | {r["id"] for r in (email_res.data or [])}
        if not matched_ids:
            return UserListResponse(users=[], total=0, page=page, page_size=page_size)
        q = q.in_("id", list(matched_ids))

    # 解説: sort パラメータに応じて並び順を変える
    if sort == "created_desc":
        q = q.order("created_at", desc=True)
    elif sort == "created_asc":
        q = q.order("created_at", desc=False)
    elif sort == "last_seen_desc":
        q = q.order("last_seen_at", desc=True, nullsfirst=False)
    elif sort == "name_asc":
        q = q.order("name", desc=False)

    # 解説: .range(start, end) = PostgreSQL の OFFSET/LIMIT に相当するページング
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


# 解説: GET /api/admin/users/{user_id} = ユーザー詳細（閲覧ログ記録あり）
@router.get("/users/{user_id}", response_model=UserDetailResponse)
async def get_user_detail(
    user_id: UUID,
    request: Request,
    current_user: User = Depends(require_admin),
) -> UserDetailResponse:
    """ユーザー詳細（閲覧ログ記録あり）"""
    try:
        # 解説: admin の単一取得は SELECT * 例外（CLAUDE.md §4）
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

    # 解説: 管理者がユーザー詳細を見たことを audit log に記録する
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
    # 解説: UserDetailResponse に存在するフィールドのみを辞書に絞り込む（余計なカラムを渡さないため）
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


# 解説: POST /api/admin/users/{user_id}/ban = ユーザーを BAN する（status = "banned"）
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


# 解説: POST /api/admin/users/{user_id}/unban = ユーザーの BAN を解除する（approved に戻す）
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
        # 解説: BAN 関連フィールドを全て NULL にして status を approved に戻す
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

# 解説: GET /api/admin/reports = 通報一覧を返す（ステータスフィルター対応）
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
    # 解説: 通報者と被通報者の ID をまとめて一括プロフィール取得する
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


# 解説: PATCH /api/admin/reports/{report_id} = 通報のステータス・対応メモ・実施アクションを更新する
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

    # 解説: resolved または dismissed になった場合は解決日時と担当者を記録する
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
    # 解説: action_taken = "warning" のとき被通報者に警告通知を送る
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

# 解説: GET /api/admin/stats/timeseries = 指定日数分の登録者数・マッチ数を日別時系列で返す
@router.get("/stats/timeseries", response_model=StatsTimeSeriesResponse)
async def get_stats_timeseries(
    # 解説: days = 取得する日数（デフォルト30日・最大365日）
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
        # 解説: 日付（YYYY-MM-DD）ごとに件数を集計する辞書を作る
        counts: dict[str, int] = {}
        for r in (res.data or []):
            d = r["created_at"][:10]
            counts[d] = counts.get(d, 0) + 1

        # 解説: start_iso より前の累計件数を取得して cumulative（累計）の起点にする
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


# 解説: GET /api/admin/stats/breakdown = 承認済みユーザーの学部・性別・学年別内訳
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

    # 解説: 学部ごとの合計・男女比を集計する辞書
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

    # 解説: 多い順に並べた学部内訳リストを作る
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

# 解説: GET /api/admin/logs = 管理者操作ログ一覧（ページネーション対応）
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
            # 解説: admin_logs は SELECT * 例外（admin 単一取得と同等の扱い）
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

# 解説: GET /api/admin/inquiries = 問い合わせ一覧を返す（ステータスフィルター対応）
@router.get("/inquiries", response_model=list[InquiryItem])
async def list_inquiries(
    status_filter: Optional[str] = Query(None, alias="status", pattern="^(unread|read|replied|closed)$"),
    current_user: User = Depends(require_admin),
) -> list[InquiryItem]:
    """問い合わせ一覧（管理者用）"""
    # 解説: admin の問い合わせ管理は SELECT * 例外
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
    # 解説: 問い合わせ送信者の email・name を一括取得して結果に付加する
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
            # 解説: InquiryItem に存在するフィールドのみ辞書から抽出して渡す
            **{k: v for k, v in r.items() if k in InquiryItem.model_fields},
            user_email=profiles_map.get(r["user_id"], {}).get("email"),
            user_name=profiles_map.get(r["user_id"], {}).get("name"),
        )
        for r in rows
    ]


# 解説: POST /api/admin/inquiries/{inquiry_id}/reply = 問い合わせに返信する
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


# 解説: GET /api/admin/photos/pending = 審査待ち写真一覧を返す（最大200件）
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
    # 解説: 写真を投稿したユーザーの名前を一括取得して付加する
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


# 解説: POST /api/admin/photos/{photo_id}/approve = 写真を承認する（status → "approved"）
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
            # 解説: .eq("status", "pending") = 審査待ちの写真のみ更新（冪等性）
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
    # 解説: profile_image_path = NULL の場合（まだメイン写真がない）に初回承認写真をメインに設定する
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


# 解説: POST /api/admin/photos/{photo_id}/reject = 写真を却下する（status → "rejected"）
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


# 解説: PATCH /api/admin/inquiries/{inquiry_id} = 問い合わせのステータスを更新する（既読・クローズ等）
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
