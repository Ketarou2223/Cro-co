import logging
from datetime import datetime, timezone, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from gotrue.types import User
from postgrest.exceptions import APIError

from app.auth.active_user import get_active_user
from app.core.block_utils import get_blocked_user_ids
from app.core.image_utils import get_signed_image_url
from app.core.limiter import limiter
from app.core.supabase_client import supabase
from app.schemas.browse import BrowseProfileItem, ProfileDetail, ProfileViewItem, ProfileViewsResponse, RecommendedProfileItem
from app.schemas.profile import PhotoItem

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["browse"])


def calc_online_status(last_seen_at) -> str:
    if not last_seen_at:
        return 'unknown'
    try:
        if isinstance(last_seen_at, str):
            last_seen = datetime.fromisoformat(last_seen_at)
        else:
            last_seen = last_seen_at
        if last_seen.tzinfo is None:
            last_seen = last_seen.replace(tzinfo=timezone.utc)
        delta = datetime.now(timezone.utc) - last_seen
        if delta < timedelta(minutes=5):
            return 'online'
        elif delta < timedelta(hours=24):
            return 'today'
        elif delta < timedelta(days=7):
            return 'week'
        elif delta < timedelta(days=30):
            return 'month'
        else:
            return 'old'
    except Exception:
        return 'unknown'


@router.get("/profiles", response_model=list[BrowseProfileItem])
@limiter.limit("30/minute")
async def list_profiles(
    request: Request,
    year: int | None = Query(None, ge=1, le=6),
    faculty: str | None = Query(None, max_length=100),
    sort_by: str | None = Query(None, max_length=20),
    current_user: User = Depends(get_active_user),
) -> list[BrowseProfileItem]:
    try:
        me_res = (
            supabase.table("profiles")
            .select("profile_setup_completed, faculty, department, clubs, faculty_hide_level, hidden_clubs, gender, interest_in")
            .eq("id", str(current_user.id))
            .single()
            .execute()
        )
    except APIError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="プロフィールが見つかりません",
        )

    if not me_res.data or not me_res.data.get("profile_setup_completed"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="プロフィールを設定してから使えるよ。",
        )

    me = str(current_user.id)

    # 身バレ防止計算用の自分のデータ
    my_data = me_res.data
    my_faculty = my_data.get("faculty")
    my_dept = my_data.get("department")
    my_faculty_hide = my_data.get("faculty_hide_level") or "none"
    my_hidden_clubs: set[str] = set(my_data.get("hidden_clubs") or [])
    my_clubs: set[str] = set(my_data.get("clubs") or [])
    my_gender: str | None = my_data.get("gender")
    my_interest: str | None = my_data.get("interest_in")

    if not my_gender or not my_interest:
        return []

    # 1. ブロック・被ブロック・非表示・自分自身を DB 除外リストに収集
    excluded_ids: set[str] = {me}
    try:
        b1 = supabase.table("blocks").select("blocked_id").eq("blocker_id", me).execute()
        b2 = supabase.table("blocks").select("blocker_id").eq("blocked_id", me).execute()
        excluded_ids.update(r["blocked_id"] for r in (b1.data or []))
        excluded_ids.update(r["blocker_id"] for r in (b2.data or []))
    except Exception:
        pass

    try:
        h = supabase.table("hides").select("hidden_id").eq("hider_id", me).execute()
        excluded_ids.update(r["hidden_id"] for r in (h.data or []))
    except Exception:
        pass

    # 2. メインクエリ: DB 側で性別・除外・枠フィルタを一括適用
    try:
        q = (
            supabase.table("profiles")
            .select("id, name, year, faculty, department, bio, profile_image_path, last_seen_at, status_message, clubs, faculty_hide_level, hidden_clubs")
            .eq("status", "approved")
            .eq("gender", my_interest)
            .eq("interest_in", my_gender)
            .not_.in_("id", list(excluded_ids))
        )
        # BeReal型枠フィルタ: 男性が女性一覧を取得する場合のみ適用
        if my_gender == "male" and my_interest == "female":
            today_jst = datetime.now(timezone(timedelta(hours=9))).date()
            now_utc_str = datetime.now(timezone.utc).isoformat()
            try:
                avail_res = (
                    supabase.table("like_quota")
                    .select("user_id")
                    .eq("date", today_jst.isoformat())
                    .lt("used_count", 5)
                    .lte("opens_at", now_utc_str)
                    .execute()
                )
                available_ids = [r["user_id"] for r in (avail_res.data or [])]
            except Exception:
                available_ids = []
            if not available_ids:
                return []
            q = q.in_("id", available_ids)
        if year is not None:
            q = q.eq("year", year)
        if faculty:
            q = q.ilike("faculty", f"%{faculty}%")
        if sort_by == "last_seen":
            q = q.order("last_seen_at", desc=True)
        elif sort_by == "year_asc":
            q = q.order("year", desc=False)
        elif sort_by == "year_desc":
            q = q.order("year", desc=True)
        else:
            q = q.order("created_at", desc=True)
        response = q.limit(50).execute()
    except APIError as e:
        logger.error("ユーザー一覧の取得に失敗しました: %s", e.message)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ユーザー一覧の取得に失敗しました",
        )

    # 3. 身バレ防止フィルタ（返ってきた小規模セットのみ Python で処理）
    filtered: list[dict] = []
    for p in response.data or []:
        p_faculty = p.get("faculty")
        p_dept = p.get("department")
        p_faculty_hide = p.get("faculty_hide_level") or "none"
        p_hidden_clubs: set[str] = set(p.get("hidden_clubs") or [])
        p_clubs: set[str] = set(p.get("clubs") or [])

        if my_faculty_hide == "faculty" and my_faculty and p_faculty and p_faculty == my_faculty:
            continue
        if my_faculty_hide == "department" and my_faculty and my_dept and p_faculty == my_faculty and p_dept == my_dept:
            continue
        if p_faculty_hide == "faculty" and p_faculty and my_faculty and p_faculty == my_faculty:
            continue
        if p_faculty_hide == "department" and p_faculty and p_dept and p_faculty == my_faculty and p_dept == my_dept:
            continue
        if my_hidden_clubs & p_clubs:
            continue
        if p_hidden_clubs & my_clubs:
            continue

        filtered.append(p)

    # 4. いいね済みID一括取得
    liked_set: set[str] = set()
    try:
        likes_res = (
            supabase.table("likes")
            .select("liked_id")
            .eq("liker_id", me)
            .execute()
        )
        liked_set = {row["liked_id"] for row in (likes_res.data or [])}
    except Exception:
        pass

    # 5. approved 写真を一括取得（display_order 昇順・ユーザーごとの先頭1枚を使用）
    approved_image_map: dict[str, str] = {}
    filtered_ids = [p["id"] for p in filtered]
    if filtered_ids:
        try:
            imgs_res = (
                supabase.table("profile_images")
                .select("user_id, image_path, display_order")
                .in_("user_id", filtered_ids)
                .eq("status", "approved")
                .order("display_order")
                .execute()
            )
            for img in (imgs_res.data or []):
                uid = img["user_id"]
                if uid not in approved_image_map:
                    approved_image_map[uid] = img["image_path"]
        except Exception:
            pass

    result: list[BrowseProfileItem] = []
    for p in filtered:
        path: str | None = approved_image_map.get(p["id"])
        result.append(
            BrowseProfileItem(
                id=p["id"],
                name=p.get("name"),
                year=p.get("year"),
                faculty=p.get("faculty"),
                department=p.get("department"),
                bio=p.get("bio"),
                avatar_url=get_signed_image_url(path) if path else None,
                is_liked=p["id"] in liked_set,
                last_seen_at=p.get("last_seen_at"),
                online_status=calc_online_status(p.get("last_seen_at")),
                status_message=p.get("status_message"),
                clubs=p.get("clubs") or [],
            )
        )

    return result


@router.get("/profiles/recommended", response_model=list[RecommendedProfileItem])
async def get_recommended(
    current_user: User = Depends(get_active_user),
) -> list[RecommendedProfileItem]:
    my_id = str(current_user.id)

    try:
        me_res = (
            supabase.table("profiles")
            .select("status, interests, gender, interest_in")
            .eq("id", my_id)
            .single()
            .execute()
        )
    except APIError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="プロフィールが見つかりません")

    if not me_res.data or me_res.data.get("status") != "approved":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="承認済みユーザーのみアクセスできます")

    my_interests: set[str] = set(me_res.data.get("interests") or [])
    my_gender: str | None = me_res.data.get("gender")
    my_interest_in: str | None = me_res.data.get("interest_in")

    if not my_gender or not my_interest_in:
        return []

    excluded: set[str] = set()

    try:
        b1 = supabase.table("blocks").select("blocked_id").eq("blocker_id", my_id).execute()
        b2 = supabase.table("blocks").select("blocker_id").eq("blocked_id", my_id).execute()
        excluded |= {r["blocked_id"] for r in (b1.data or [])}
        excluded |= {r["blocker_id"] for r in (b2.data or [])}
    except Exception:
        pass

    try:
        h = supabase.table("hides").select("hidden_id").eq("hider_id", my_id).execute()
        excluded |= {r["hidden_id"] for r in (h.data or [])}
    except Exception:
        pass

    try:
        m = (
            supabase.table("matches")
            .select("user_a_id, user_b_id")
            .or_(f"user_a_id.eq.{my_id},user_b_id.eq.{my_id}")
            .execute()
        )
        for row in (m.data or []):
            other = row["user_b_id"] if row["user_a_id"] == my_id else row["user_a_id"]
            excluded.add(other)
    except Exception:
        pass

    try:
        q = (
            supabase.table("profiles")
            .select("id, name, year, faculty, bio, profile_image_path, interests, looking_for, last_seen_at, show_online_status, status_message")
            .eq("status", "approved")
            .neq("id", my_id)
            .eq("gender", my_interest_in)
            .eq("interest_in", my_gender)
        )
        if excluded:
            q = q.not_.in_("id", list(excluded))
        # BeReal型枠フィルタ: 男性が女性一覧を取得する場合のみ適用
        if my_gender == "male" and my_interest_in == "female":
            today_jst = datetime.now(timezone(timedelta(hours=9))).date()
            now_utc_str = datetime.now(timezone.utc).isoformat()
            try:
                avail_res = (
                    supabase.table("like_quota")
                    .select("user_id")
                    .eq("date", today_jst.isoformat())
                    .lt("used_count", 5)
                    .lte("opens_at", now_utc_str)
                    .execute()
                )
                available_ids = [r["user_id"] for r in (avail_res.data or [])]
            except Exception:
                available_ids = []
            if not available_ids:
                return []
            q = q.in_("id", available_ids)
        profiles_res = q.order("created_at", desc=True).limit(20).execute()
    except APIError:
        return []

    scored: list[tuple[int, dict]] = []
    for p in (profiles_res.data or []):
        their_interests: set[str] = set(p.get("interests") or [])
        score = len(my_interests & their_interests) if my_interests else 0
        scored.append((score, p))

    scored.sort(key=lambda x: x[0], reverse=True)

    result: list[RecommendedProfileItem] = []
    for s, p in scored[:5]:
        path: str | None = p.get("profile_image_path")
        result.append(RecommendedProfileItem(
            id=p["id"],
            name=p.get("name"),
            year=p.get("year"),
            faculty=p.get("faculty"),
            bio=p.get("bio"),
            avatar_url=get_signed_image_url(path) if path else None,
            is_liked=False,
            last_seen_at=p.get("last_seen_at"),
            show_online_status=p.get("show_online_status", True),
            status_message=p.get("status_message"),
            score=s,
        ))

    return result


@router.get("/profiles/views", response_model=ProfileViewsResponse)
async def get_profile_views(
    current_user: User = Depends(get_active_user),
) -> ProfileViewsResponse:
    my_id = str(current_user.id)

    try:
        me_res = (
            supabase.table("profiles")
            .select("status")
            .eq("id", my_id)
            .single()
            .execute()
        )
    except APIError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="プロフィールが見つかりません")

    if not me_res.data or me_res.data.get("status") != "approved":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="承認済みユーザーのみアクセスできます")

    try:
        views_res = (
            supabase.table("profile_views")
            .select("viewer_id, viewed_at, confirmed_at")
            .eq("viewed_id", my_id)
            .order("viewed_at", desc=True)
            .limit(50)
            .execute()
        )
    except APIError:
        return ProfileViewsResponse(views=[], unread_count=0)

    raw_views = views_res.data or []

    # ブロック相手の足跡を除外
    blocked_ids: set[str] = set(get_blocked_user_ids(my_id))
    raw_views = [r for r in raw_views if r["viewer_id"] not in blocked_ids]

    viewer_ids = [r["viewer_id"] for r in raw_views]
    if not viewer_ids:
        return ProfileViewsResponse(views=[], unread_count=0)

    unread_count = sum(1 for r in raw_views if r.get("confirmed_at") is None)

    try:
        profiles_res = (
            supabase.table("profiles")
            .select("id, name, year, faculty, profile_image_path")
            .in_("id", viewer_ids)
            .execute()
        )
    except APIError:
        return ProfileViewsResponse(views=[], unread_count=0)

    profiles_map = {p["id"]: p for p in (profiles_res.data or [])}

    result: list[ProfileViewItem] = []
    for r in raw_views:
        p = profiles_map.get(r["viewer_id"])
        if not p:
            continue
        path: str | None = p.get("profile_image_path")
        result.append(ProfileViewItem(
            viewer_id=r["viewer_id"],
            name=p.get("name"),
            year=p.get("year"),
            faculty=p.get("faculty"),
            avatar_url=get_signed_image_url(path) if path else None,
            viewed_at=r["viewed_at"],
        ))

    return ProfileViewsResponse(views=result, unread_count=unread_count)


@router.post("/profiles/views/confirm", status_code=status.HTTP_204_NO_CONTENT)
async def confirm_profile_views(
    current_user: User = Depends(get_active_user),
) -> None:
    my_id = str(current_user.id)

    try:
        me_res = (
            supabase.table("profiles")
            .select("status")
            .eq("id", my_id)
            .single()
            .execute()
        )
    except APIError:
        return

    if not me_res.data or me_res.data.get("status") != "approved":
        return

    try:
        supabase.table("profile_views").update(
            {"confirmed_at": datetime.now(timezone.utc).isoformat()}
        ).eq("viewed_id", my_id).is_("confirmed_at", "null").execute()
    except Exception:
        pass


@router.get("/profiles/completeness-rank")
async def get_completeness_rank(
    current_user: User = Depends(get_active_user),
) -> dict:
    my_id = str(current_user.id)
    try:
        me_res = (
            supabase.table("profiles")
            .select("status")
            .eq("id", my_id)
            .single()
            .execute()
        )
    except APIError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="プロフィールが見つかりません")

    if not me_res.data or me_res.data.get("status") != "approved":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="承認済みユーザーのみアクセスできます")

    try:
        res = (
            supabase.table("profiles")
            .select("id, name, bio, faculty, year, interests, clubs, hometown, looking_for, profile_image_path")
            .eq("status", "approved")
            .execute()
        )
    except APIError:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="ランキングの取得に失敗しました")

    def calc_score(p: dict) -> int:
        score = 0
        if p.get("name"): score += 1
        if p.get("bio"): score += 1
        if p.get("faculty"): score += 1
        if p.get("year") is not None: score += 1
        interests = p.get("interests")
        if interests and len(interests) > 0: score += 1
        clubs = p.get("clubs")
        if clubs and len(clubs) > 0: score += 1
        if p.get("hometown"): score += 1
        if p.get("looking_for"): score += 1
        if p.get("profile_image_path"): score += 1
        return score

    all_profiles = res.data or []
    scored = [(p["id"], calc_score(p)) for p in all_profiles]
    scored.sort(key=lambda x: x[1], reverse=True)

    my_score = 0
    rank = len(scored)
    for i, (pid, score) in enumerate(scored):
        if pid == my_id:
            my_score = score
            rank = i + 1
            break

    total = len(scored)
    percentile = round((1 - (rank - 1) / max(total, 1)) * 100) if total > 0 else 100
    return {"score": my_score, "rank": rank, "total": total, "percentile": percentile}


@router.get("/profiles/{user_id}", response_model=ProfileDetail)
async def get_profile(
    user_id: UUID,
    current_user: User = Depends(get_active_user),
) -> ProfileDetail:
    try:
        me_res = (
            supabase.table("profiles")
            .select("profile_setup_completed")
            .eq("id", str(current_user.id))
            .single()
            .execute()
        )
    except APIError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="プロフィールが見つかりません",
        )

    if not me_res.data or not me_res.data.get("profile_setup_completed"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="プロフィールを設定してから使えるよ。",
        )

    uid_str = str(user_id)
    is_self = str(current_user.id) == uid_str
    try:
        target_res = (
            supabase.table("profiles")
            .select("id, name, year, faculty, department, bio, created_at, profile_image_path, status, interests, clubs, hometown, looking_for, last_seen_at, status_message")
            .eq("id", uid_str)
            .single()
            .execute()
        )
    except APIError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ユーザーが見つかりません",
        )

    if not target_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ユーザーが見つかりません",
        )

    p = target_res.data
    if not is_self and p.get("status") != "approved":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ユーザーが見つかりません",
        )

    # ブロックチェック（双方向）
    if not is_self:
        try:
            b1 = (
                supabase.table("blocks")
                .select("blocker_id")
                .eq("blocker_id", str(current_user.id))
                .eq("blocked_id", uid_str)
                .limit(1)
                .execute()
            )
            b2 = (
                supabase.table("blocks")
                .select("blocker_id")
                .eq("blocker_id", uid_str)
                .eq("blocked_id", str(current_user.id))
                .limit(1)
                .execute()
            )
            if (b1.data and len(b1.data) > 0) or (b2.data and len(b2.data) > 0):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="このユーザーのプロフィールは表示できません",
                )
        except HTTPException:
            raise
        except Exception:
            pass

    # 足跡記録（自分以外のプロフィールを閲覧した場合）
    if not is_self:
        try:
            supabase.table("profile_views").upsert(
                {
                    "viewer_id": str(current_user.id),
                    "viewed_id": uid_str,
                    "viewed_at": datetime.now(timezone.utc).isoformat(),
                },
                on_conflict="viewer_id,viewed_id",
            ).execute()
        except Exception:
            pass

    path: str | None = p.get("profile_image_path")
    avatar_url: str | None = get_signed_image_url(path) if path else None

    is_liked = False
    if not is_self:
        try:
            like_res = (
                supabase.table("likes")
                .select("liked_id")
                .eq("liker_id", str(current_user.id))
                .eq("liked_id", uid_str)
                .limit(1)
                .execute()
            )
            is_liked = len(like_res.data or []) > 0
        except Exception:
            pass

    photos: list[PhotoItem] = []
    try:
        photos_q = (
            supabase.table("profile_images")
            .select("id, image_path, display_order, status")
            .eq("user_id", uid_str)
            .order("display_order")
        )
        if not is_self:
            photos_q = photos_q.eq("status", "approved")
        photos_res = photos_q.execute()
        for row in photos_res.data or []:
            photos.append(
                PhotoItem(
                    id=row["id"],
                    image_path=row["image_path"],
                    display_order=row["display_order"],
                    signed_url=get_signed_image_url(row["image_path"]),
                    status=row.get("status", "approved"),
                )
            )
    except Exception:
        pass

    return ProfileDetail(
        id=p["id"],
        name=p.get("name"),
        year=p.get("year"),
        faculty=p.get("faculty"),
        department=p.get("department"),
        bio=p.get("bio"),
        created_at=p["created_at"],
        avatar_url=avatar_url,
        is_liked=is_liked,
        photos=photos,
        interests=p.get("interests") or [],
        club=None,
        clubs=p.get("clubs") or [],
        hometown=p.get("hometown"),
        looking_for=p.get("looking_for"),
        last_seen_at=p.get("last_seen_at"),
        online_status=calc_online_status(p.get("last_seen_at")),
        status_message=p.get("status_message"),
    )
