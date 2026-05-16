import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from gotrue.types import User
from postgrest.exceptions import APIError

from app.auth.dependencies import get_current_user
from app.core.config import settings
from app.core.supabase_client import supabase
from app.schemas.browse import BrowseProfileItem, ProfileDetail, ProfileViewItem, RecommendedProfileItem
from app.schemas.profile import PhotoItem

logger = logging.getLogger(__name__)


def _public_image_url(path: str) -> str:
    return f"{settings.supabase_url}/storage/v1/object/public/profile-images/{path}"

router = APIRouter(prefix="/api", tags=["browse"])


@router.get("/profiles", response_model=list[BrowseProfileItem])
async def list_profiles(
    year: int | None = Query(None, ge=1, le=6),
    faculty: str | None = Query(None, max_length=100),
    looking_for: str | None = Query(None),
    sort_by: str | None = Query(None, max_length=20),
    current_user: User = Depends(get_current_user),
) -> list[BrowseProfileItem]:
    try:
        me_res = (
            supabase.table("profiles")
            .select("status, faculty, department, clubs, faculty_hide_level, hidden_clubs")
            .eq("id", str(current_user.id))
            .single()
            .execute()
        )
    except APIError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="プロフィールが見つかりません",
        )

    if not me_res.data or me_res.data.get("status") != "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="承認済みユーザーのみアクセスできます",
        )

    me = str(current_user.id)

    blocked_ids: set[str] = set()
    try:
        b1 = supabase.table("blocks").select("blocked_id").eq("blocker_id", me).execute()
        b2 = supabase.table("blocks").select("blocker_id").eq("blocked_id", me).execute()
        blocked_ids = {r["blocked_id"] for r in (b1.data or [])} | {r["blocker_id"] for r in (b2.data or [])}
    except Exception:
        pass

    hidden_ids: set[str] = set()
    try:
        h = supabase.table("hides").select("hidden_id").eq("hider_id", me).execute()
        hidden_ids = {r["hidden_id"] for r in (h.data or [])}
    except Exception:
        pass

    exclude_ids = blocked_ids | hidden_ids

    # 身バレ防止による除外を計算
    my_data = me_res.data
    my_faculty = my_data.get("faculty")
    my_dept = my_data.get("department")
    my_faculty_hide = my_data.get("faculty_hide_level") or "none"
    my_hidden_clubs: set[str] = set(my_data.get("hidden_clubs") or [])
    my_clubs: set[str] = set(my_data.get("clubs") or [])

    try:
        candidates_res = (
            supabase.table("profiles")
            .select("id, faculty, department, clubs, faculty_hide_level, hidden_clubs")
            .eq("status", "approved")
            .neq("id", me)
            .execute()
        )
        candidates = candidates_res.data or []
    except Exception:
        candidates = []

    for p in candidates:
        pid: str = p["id"]
        p_faculty = p.get("faculty")
        p_dept = p.get("department")
        p_faculty_hide = p.get("faculty_hide_level") or "none"
        p_hidden_clubs: set[str] = set(p.get("hidden_clubs") or [])
        p_clubs: set[str] = set(p.get("clubs") or [])

        # 自分が学部/学科で非表示設定している場合
        if my_faculty_hide == "faculty" and my_faculty and p_faculty and p_faculty == my_faculty:
            exclude_ids.add(pid)
        elif my_faculty_hide == "department" and my_faculty and my_dept and p_faculty == my_faculty and p_dept == my_dept:
            exclude_ids.add(pid)

        # 相手が学部/学科で非表示設定している場合（双方向）
        if p_faculty_hide == "faculty" and p_faculty and my_faculty and p_faculty == my_faculty:
            exclude_ids.add(pid)
        elif p_faculty_hide == "department" and p_faculty and p_dept and p_faculty == my_faculty and p_dept == my_dept:
            exclude_ids.add(pid)

        # サークルによる双方向除外
        if my_hidden_clubs & p_clubs:
            exclude_ids.add(pid)
        if p_hidden_clubs & my_clubs:
            exclude_ids.add(pid)

    try:
        q = (
            supabase.table("profiles")
            .select("id, name, year, faculty, department, bio, profile_image_path, looking_for, last_seen_at, show_online_status, status_message, clubs")
            .eq("status", "approved")
            .neq("id", me)
        )
        if exclude_ids:
            q = q.not_.in_("id", list(exclude_ids))
        if year is not None:
            q = q.eq("year", year)
        if faculty:
            q = q.ilike("faculty", f"%{faculty}%")
        if looking_for:
            q = q.eq("looking_for", looking_for)
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

    result: list[BrowseProfileItem] = []
    for p in response.data or []:
        path: str | None = p.get("profile_image_path")
        result.append(
            BrowseProfileItem(
                id=p["id"],
                name=p.get("name"),
                year=p.get("year"),
                faculty=p.get("faculty"),
                department=p.get("department"),
                bio=p.get("bio"),
                avatar_url=_public_image_url(path) if path else None,
                is_liked=p["id"] in liked_set,
                last_seen_at=p.get("last_seen_at"),
                show_online_status=p.get("show_online_status", True),
                status_message=p.get("status_message"),
                clubs=p.get("clubs") or [],
            )
        )

    return result


@router.get("/profiles/recommended", response_model=list[RecommendedProfileItem])
async def get_recommended(
    current_user: User = Depends(get_current_user),
) -> list[RecommendedProfileItem]:
    my_id = str(current_user.id)

    try:
        me_res = (
            supabase.table("profiles")
            .select("status, interests")
            .eq("id", my_id)
            .single()
            .execute()
        )
    except APIError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="プロフィールが見つかりません")

    if not me_res.data or me_res.data.get("status") != "approved":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="承認済みユーザーのみアクセスできます")

    my_interests: set[str] = set(me_res.data.get("interests") or [])

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
        )
        if excluded:
            q = q.not_.in_("id", list(excluded))
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
            avatar_url=_public_image_url(path) if path else None,
            is_liked=False,
            last_seen_at=p.get("last_seen_at"),
            show_online_status=p.get("show_online_status", True),
            status_message=p.get("status_message"),
            score=s,
        ))

    return result


@router.get("/profiles/views", response_model=list[ProfileViewItem])
async def get_profile_views(
    current_user: User = Depends(get_current_user),
) -> list[ProfileViewItem]:
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
            .select("viewer_id, viewed_at")
            .eq("viewed_id", my_id)
            .order("viewed_at", desc=True)
            .limit(50)
            .execute()
        )
    except APIError:
        return []

    viewer_ids = [r["viewer_id"] for r in (views_res.data or [])]
    if not viewer_ids:
        return []

    try:
        profiles_res = (
            supabase.table("profiles")
            .select("id, name, year, faculty, profile_image_path")
            .in_("id", viewer_ids)
            .execute()
        )
    except APIError:
        return []

    profiles_map = {p["id"]: p for p in (profiles_res.data or [])}

    result: list[ProfileViewItem] = []
    for r in (views_res.data or []):
        p = profiles_map.get(r["viewer_id"])
        if not p:
            continue
        path: str | None = p.get("profile_image_path")
        result.append(ProfileViewItem(
            viewer_id=r["viewer_id"],
            name=p.get("name"),
            year=p.get("year"),
            faculty=p.get("faculty"),
            avatar_url=_public_image_url(path) if path else None,
            viewed_at=r["viewed_at"],
        ))

    return result


@router.get("/profiles/completeness-rank")
async def get_completeness_rank(
    current_user: User = Depends(get_current_user),
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
            .select("id, name, bio, faculty, year, interests, club, hometown, looking_for, profile_image_path")
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
        if p.get("club"): score += 1
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
    current_user: User = Depends(get_current_user),
) -> ProfileDetail:
    try:
        me_res = (
            supabase.table("profiles")
            .select("status")
            .eq("id", str(current_user.id))
            .single()
            .execute()
        )
    except APIError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="プロフィールが見つかりません",
        )

    if not me_res.data or me_res.data.get("status") != "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="承認済みユーザーのみアクセスできます",
        )

    uid_str = str(user_id)
    is_self = str(current_user.id) == uid_str
    try:
        target_res = (
            supabase.table("profiles")
            .select("id, name, year, faculty, department, bio, created_at, profile_image_path, status, interests, club, clubs, hometown, looking_for, last_seen_at, show_online_status, status_message")
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
    avatar_url: str | None = _public_image_url(path) if path else None

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
        photos_res = (
            supabase.table("profile_images")
            .select("id, image_path, display_order")
            .eq("user_id", uid_str)
            .order("display_order")
            .execute()
        )
        for row in photos_res.data or []:
            photos.append(
                PhotoItem(
                    id=row["id"],
                    image_path=row["image_path"],
                    display_order=row["display_order"],
                    signed_url=_public_image_url(row["image_path"]),
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
        club=p.get("club"),
        clubs=p.get("clubs") or [],
        hometown=p.get("hometown"),
        looking_for=p.get("looking_for"),
        last_seen_at=p.get("last_seen_at"),
        show_online_status=p.get("show_online_status", True),
        status_message=p.get("status_message"),
    )
