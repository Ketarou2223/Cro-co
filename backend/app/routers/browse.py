# 解説: このファイルは「ユーザー検索・プロフィール閲覧・足跡」機能の API を定義する。
# 解説: 呼ばれる場所: main.py で app.include_router(browse.router) として登録される
# 解説: エンドポイント一覧:
#   GET  /api/profiles              → ユーザー検索一覧（フィルタ・ソート対応）
#   GET  /api/profiles/recommended  → おすすめユーザー（趣味スコアで上位5件）
#   GET  /api/profiles/views        → 自分のプロフィールを見た人の足跡
#   POST /api/profiles/views/confirm → 足跡を確認済みにする
#   GET  /api/profiles/completeness-rank → プロフィール充実度ランキング
#   GET  /api/profiles/hometowns    → 出身地候補一覧
#   GET  /api/profiles/{user_id}    → 特定ユーザーのプロフィール詳細
# 解説: 呼ぶ先:
#   Supabase: profiles / profile_views / profile_images / likes / hides / matches テーブル
#   block_utils.py: ブロック相手を除外
#   identity_hide.py: 同学部・同サークルの身バレを防止
#   image_utils.py: 署名付きURL 生成
#   faculty_classification.py: 学部名 → 文系/理系 分類

import logging
from datetime import datetime, timezone, timedelta
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from supabase_auth.types import User
from postgrest.exceptions import APIError

from app.auth.active_user import get_active_user
from app.auth.approved_user import get_approved_user
from app.core.block_utils import get_blocked_user_ids
from app.core.config import settings
from app.core.faculty_classification import HUMANITIES, SCIENCES, classify
from app.core.identity_hide import get_hidden_user_ids_for, is_hidden_between, is_hidden_from_viewer
from app.core.image_utils import get_signed_image_url
from app.core.limiter import limiter
from app.core.realtime import notify_users
from app.core.supabase_client import supabase
from app.schemas.browse import BrowseProfileItem, ProfileDetail, ProfileViewItem, ProfileViewsResponse, RecommendedProfileItem
from app.schemas.profile import PhotoItem

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["browse"])


# 解説: 検索キーワードから SQL LIKE の特殊文字をエスケープするヘルパ関数
def _sanitize_bio_keyword(raw: str | None) -> str | None:
    """自己紹介検索キーワードから LIKE/PostgREST のワイルドカードを無効化する。

    `%` `_` は SQL LIKE のワイルドカード、`*` は PostgREST が `%` に変換するため、
    そのまま渡すと「全件マッチ」や意図しない部分一致を許してしまう。これらを
    リテラル化（または除去）し、curl 直叩きでも検索条件を回避できないようにする。
    """
    if not raw:
        return None
    kw = raw.strip()
    if not kw:
        return None
    # 解説: バックスラッシュ自体を先にエスケープ（他のエスケープが意図せず連鎖しないよう）
    kw = kw.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    # 解説: PostgREST が `*` を `%` に変換するためそのまま削除する
    kw = kw.replace("*", "")
    return kw or None


# 解説: last_seen_at（最終アクセス日時）からオンライン状態を計算するヘルパ
def calc_online_status(last_seen_at) -> str:
    if not last_seen_at:
        return 'unknown'
    try:
        if isinstance(last_seen_at, str):
            # 解説: ISO 形式の文字列を datetime オブジェクトに変換する
            last_seen = datetime.fromisoformat(last_seen_at)
        else:
            last_seen = last_seen_at
        # 解説: タイムゾーン情報がない場合は UTC とみなして付与する
        if last_seen.tzinfo is None:
            last_seen = last_seen.replace(tzinfo=timezone.utc)
        delta = datetime.now(timezone.utc) - last_seen
        # 解説: 5分以内 = オンライン / 24時間以内 = 今日 / 7日以内 = 今週 / 30日以内 = 今月
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


# 解説: GET /api/profiles = フィルタ・ソート付きユーザー検索（最大50件）
@router.get("/profiles", response_model=list[BrowseProfileItem])
@limiter.limit("30/minute")
async def list_profiles(
    request: Request,
    # 解説: years = 学年フィルタ（複数指定可。4以上は「4年以上」にまとまる）
    years: list[int] | None = Query(None),
    # 解説: science_humanities = "humanities"（文系）または "sciences"（理系）で絞る
    science_humanities: str | None = Query(None, max_length=20),
    hometowns: list[str] | None = Query(None),
    bio_keyword: str | None = Query(None, max_length=100),
    # 解説: sort_by = "last_seen"（最終アクセス順）/ "year_asc" / "year_desc"
    sort_by: str | None = Query(None, max_length=20),
    current_user: User = Depends(get_approved_user),
) -> list[BrowseProfileItem]:
    # years の各要素を year の有効範囲（1〜11）に限定する
    if years:
        for y in years:
            if not (1 <= y <= 11):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="year は 1〜11 の整数で指定してください",
                )
    # hometowns の件数・要素長を制限（大量データ攻撃対策）
    if hometowns:
        if len(hometowns) > 20:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="hometowns は最大20件まで指定できます",
            )
        for ht in hometowns:
            if len(ht) > 50:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="hometown は各50文字以内で指定してください",
                )
    try:
        # 解説: 自分のプロフィールを取得して身バレ防止・性別フィルタに使う
        me_res = (
            supabase.table("profiles")
            .select("faculty, department, clubs, faculty_hide_level, hidden_clubs, gender, interest_in")
            .eq("id", str(current_user.id))
            .single()
            .execute()
        )
    except APIError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="プロフィールが見つかりません",
        )

    me = str(current_user.id)

    # 身バレ防止計算用の自分のデータ
    my_data = me_res.data
    my_gender: str | None = my_data.get("gender")
    my_interest: str | None = my_data.get("interest_in")

    # 解説: 性別・恋愛対象が未設定の場合はまだ使えない（空リストを返す）
    if not my_gender or not my_interest:
        return []

    # 1. ブロック・被ブロック・非表示・自分自身を DB 除外リストに収集
    # 解説: excluded_ids = クエリの NOT IN に渡す除外 ID セット。自分自身は必ず除く
    excluded_ids: set[str] = {me}
    # 解説: fail-closed: get_blocked_user_ids が失敗したら例外を上に伝播して 500 にする
    excluded_ids.update(get_blocked_user_ids(me))  # fail-closed: 失敗時は例外伝播 → 500

    try:
        # 解説: 非表示（hide）した相手を除外する
        h = supabase.table("hides").select("hidden_id").eq("hider_id", me).execute()
        excluded_ids.update(r["hidden_id"] for r in (h.data or []))
    except Exception:
        logger.warning("hides 取得失敗 user=%s・この回は非表示除外をスキップ", me, exc_info=True)

    # 2. メインクエリ: DB 側で性別・除外・枠フィルタを一括適用
    try:
        # 解説: approved 状態のユーザーだけを取得し、性別と恋愛対象を相互に一致させる
        q = (
            supabase.table("profiles")
            .select("id, name, year, faculty, department, bio, profile_image_path, last_seen_at, status_message, clubs, faculty_hide_level, hidden_clubs")
            .eq("status", "approved")
            # 解説: 相手の gender が自分の interest_in と一致するもの
            .eq("gender", my_interest)
            # 解説: 相手の interest_in が自分の gender と一致するもの
            .eq("interest_in", my_gender)
            .not_.in_("id", list(excluded_ids))
        )
        # ① BeReal型枠フィルタ: 男性が女性一覧を取得する場合のみ適用（LIKE_QUOTA_ENABLED=true 時）
        # 解説: BeReal 型枠 = 毎日一定時間だけ表示される枠。quota テーブルで管理
        if settings.like_quota_enabled and my_gender == "male" and my_interest == "female":
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
        # 学年フィルタ（「4年以上」は year>=4 のバケットとして合流）
        if years:
            # 解説: 1〜3年は個別、4年以上はまとめて year >= 4 で扱う
            explicit = sorted({y for y in years if 1 <= y < 4})
            has_senior = any(y >= 4 for y in years)
            if explicit and has_senior:
                in_list = ",".join(str(y) for y in explicit)
                q = q.or_(f"year.in.({in_list}),year.gte.4")
            elif explicit:
                q = q.in_("year", explicit)
            elif has_senior:
                q = q.gte("year", 4)
        # 文理フィルタ（faculty を直接見せず文理に変換して絞り込み）
        if science_humanities == "humanities":
            # 解説: HUMANITIES = 文系の学部名セット（faculty_classification.py）
            q = q.in_("faculty", list(HUMANITIES))
        elif science_humanities == "sciences":
            q = q.in_("faculty", list(SCIENCES))
        # 出身地フィルタ
        if hometowns:
            q = q.in_("hometown", hometowns)
        # 自己紹介キーワード部分一致（ワイルドカードは無効化済み）
        kw = _sanitize_bio_keyword(bio_keyword)
        if kw:
            # 解説: .ilike = case-insensitive LIKE（大文字小文字を区別しない部分一致）
            q = q.ilike("bio", f"%{kw}%")
        if sort_by == "last_seen":
            # nullsfirst=False で last_seen_at.desc.nullslast が生成される（NULL を末尾へ）
            q = q.order("last_seen_at", desc=True, nullsfirst=False)
        elif sort_by == "year_asc":
            q = q.order("year", desc=False)
        elif sort_by == "year_desc":
            q = q.order("year", desc=True)
        else:
            # デフォルト: アクティブな人を上に。last_seen 未書き込み（NULL）は末尾
            q = q.order("last_seen_at", desc=True, nullsfirst=False)
        response = q.limit(50).execute()
    except APIError as e:
        logger.error("ユーザー一覧の取得に失敗しました: %s", e.message)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ユーザー一覧の取得に失敗しました",
        )

    # 3. 身バレ防止フィルタ（返ってきた小規模セットのみ Python で処理・判定は identity_hide に集約）
    # 解説: is_hidden_between = 同学部・同サークルで身バレリスクがある場合に True
    filtered: list[dict] = [p for p in (response.data or []) if not is_hidden_between(my_data, p)]

    # 4. いいね済みID一括取得
    # 解説: 自分がいいね済みの相手 ID を一括取得してカードに is_liked フラグを立てる
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

    # 5. approved 写真を一括取得（display_order 昇順）。カードのサムネはメイン写真
    #    （profiles.profile_image_path）を優先し、承認済みでなければ display_order 先頭を使う
    approved_paths_by_user: dict[str, list[str]] = {}
    filtered_ids = [p["id"] for p in filtered]
    if filtered_ids:
        try:
            # 解説: approved 状態の写真のみを表示順に一括取得する
            imgs_res = (
                supabase.table("profile_images")
                .select("user_id, image_path, display_order")
                .in_("user_id", filtered_ids)
                .eq("status", "approved")
                .order("display_order")
                .execute()
            )
            for img in (imgs_res.data or []):
                # 解説: ユーザーごとに approved 写真のパスリストを辞書に集める
                approved_paths_by_user.setdefault(img["user_id"], []).append(img["image_path"])
        except Exception:
            pass

    result: list[BrowseProfileItem] = []
    for p in filtered:
        approved_paths = approved_paths_by_user.get(p["id"], [])
        main_path: str | None = p.get("profile_image_path")
        # 解説: プロフィールのメイン写真が approved 一覧にあればそれを使い、なければ先頭を使う
        if main_path and main_path in approved_paths:
            path: str | None = main_path
        else:
            path = approved_paths[0] if approved_paths else None
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


# 解説: GET /api/profiles/recommended = 趣味スコアで上位5件を返す「おすすめ」
@router.get("/profiles/recommended", response_model=list[RecommendedProfileItem])
@limiter.limit("30/minute")
async def get_recommended(
    request: Request,
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

    # 解説: ブロック相手を除外（fail-closed）
    excluded.update(get_blocked_user_ids(my_id))  # fail-closed: 失敗時は例外伝播 → 500

    try:
        h = supabase.table("hides").select("hidden_id").eq("hider_id", my_id).execute()
        excluded |= {r["hidden_id"] for r in (h.data or [])}
    except Exception:
        logger.warning("hides 取得失敗 user=%s・この回は非表示除外をスキップ", my_id, exc_info=True)

    try:
        # 解説: マッチ済みの相手はおすすめに出さない
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
        logger.warning("マッチ済み除外取得失敗 user=%s・推薦に紛れる可能性あり", my_id, exc_info=True)

    # 身バレ防止: 同じ学部・サークル等で隠すべき相手を除外
    excluded |= get_hidden_user_ids_for(my_id)

    try:
        q = (
            supabase.table("profiles")
            .select("id, name, year, faculty, bio, profile_image_path, interests, last_seen_at, show_online_status, status_message")
            .eq("status", "approved")
            .neq("id", my_id)
            .eq("gender", my_interest_in)
            .eq("interest_in", my_gender)
        )
        if excluded:
            q = q.not_.in_("id", list(excluded))
        # ① BeReal型枠フィルタ: 男性が女性一覧を取得する場合のみ適用（LIKE_QUOTA_ENABLED=true 時）
        if settings.like_quota_enabled and my_gender == "male" and my_interest_in == "female":
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
        profiles_res = q.order("last_seen_at", desc=True, nullsfirst=False).limit(20).execute()
    except APIError:
        return []

    # 解説: 趣味の一致数でスコアを計算する（多いほど上位）
    scored: list[tuple[int, dict]] = []
    for p in (profiles_res.data or []):
        their_interests: set[str] = set(p.get("interests") or [])
        score = len(my_interests & their_interests) if my_interests else 0
        scored.append((score, p))

    # 解説: スコアの高い順に並べて上位5件を取る
    scored.sort(key=lambda x: x[0], reverse=True)

    result: list[RecommendedProfileItem] = []
    for s, p in scored[:5]:
        # profile_image_path は approved 写真のみ不変条件（W1〜W4 で担保・[8.3]）
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


# 解説: GET /api/profiles/views = 自分のプロフィールを閲覧した人の足跡一覧を返す
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
        # 解説: profile_views テーブルから自分が見られた記録を取得する（最大50件・新しい順）
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

    # ブロック相手・身バレ防止対象の足跡を除外
    # 解説: ブロックした相手の足跡も身バレリスクのある相手の足跡も見せない
    blocked_ids: set[str] = set(get_blocked_user_ids(my_id))
    hidden_ids: set[str] = get_hidden_user_ids_for(my_id)
    raw_views = [r for r in raw_views if r["viewer_id"] not in blocked_ids and r["viewer_id"] not in hidden_ids]

    viewer_ids = [r["viewer_id"] for r in raw_views]
    if not viewer_ids:
        return ProfileViewsResponse(views=[], unread_count=0)

    # 解説: confirmed_at が None = まだ確認していない足跡の数
    unread_count = sum(1 for r in raw_views if r.get("confirmed_at") is None)

    try:
        # 解説: 閲覧者のプロフィールを一括取得する（N+1 防止）
        profiles_res = (
            supabase.table("profiles")
            .select("id, name, year, faculty, profile_image_path")
            .in_("id", viewer_ids)
            .execute()
        )
    except APIError:
        return ProfileViewsResponse(views=[], unread_count=0)

    # 解説: {viewer_id: profile行} に変換して高速参照できるようにする
    profiles_map = {p["id"]: p for p in (profiles_res.data or [])}

    result: list[ProfileViewItem] = []
    for r in raw_views:
        p = profiles_map.get(r["viewer_id"])
        if not p:
            continue
        # profile_image_path は approved 写真のみ不変条件（W1〜W4 で担保・[8.3]）
        path: str | None = p.get("profile_image_path")
        result.append(ProfileViewItem(
            viewer_id=r["viewer_id"],
            name=p.get("name"),
            year=p.get("year"),
            faculty=p.get("faculty"),
            avatar_url=get_signed_image_url(path) if path else None,
            viewed_at=r["viewed_at"],
            is_new=r.get("confirmed_at") is None,
        ))

    return ProfileViewsResponse(views=result, unread_count=unread_count)


# 解説: POST /api/profiles/views/confirm = 未確認の足跡を一括で確認済みにする
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
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="承認済みユーザーのみ操作できます")

    try:
        # 解説: confirmed_at が NULL のもの全てに現在時刻を設定する（一括既読）
        supabase.table("profile_views").update(
            {"confirmed_at": datetime.now(timezone.utc).isoformat()}
        ).eq("viewed_id", my_id).is_("confirmed_at", "null").execute()
    except Exception:
        pass


# 解説: GET /api/profiles/completeness-rank = プロフィール充実度ランキングを返す
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
        # 解説: 全 approved ユーザーの充実度に必要なフィールドを取得する（全件）
        res = (
            supabase.table("profiles")
            .select("id, name, bio, faculty, year, interests, clubs, hometown, profile_image_path")
            .eq("status", "approved")
            .execute()
        )
    except APIError:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="ランキングの取得に失敗しました")

    # 解説: プロフィール充実度を9点満点で計算する（各項目が埋まっていれば1点）
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
        if p.get("profile_image_path"): score += 1
        return score

    all_profiles = res.data or []
    # 解説: (id, score) のタプルリストを作り、スコアの高い順に並べる
    scored = [(p["id"], calc_score(p)) for p in all_profiles]
    scored.sort(key=lambda x: x[1], reverse=True)

    my_score = 0
    rank = len(scored)
    # 解説: 自分のスコアと順位を見つける
    for i, (pid, score) in enumerate(scored):
        if pid == my_id:
            my_score = score
            rank = i + 1
            break

    total = len(scored)
    # 解説: percentile = 上位何%か（100%なら1位）。(1 - (rank-1) / total) * 100 で計算
    percentile = round((1 - (rank - 1) / max(total, 1)) * 100) if total > 0 else 100
    return {"score": my_score, "rank": rank, "total": total, "percentile": percentile}


# 解説: GET /api/profiles/hometowns = 登録されている出身地の候補一覧を返す（検索フィルタ用）
@router.get("/profiles/hometowns", response_model=list[str])
async def list_used_hometowns(
    current_user: User = Depends(get_active_user),
) -> list[str]:
    """承認済みプロフィールに実際に登録されている出身地の一覧（重複なし）。

    詳細検索の出身地候補に使う。個人を特定しない集計値のみ返す。
    並び順はフロント側で都道府県の正準順（北→南）に整列する。
    """
    try:
        res = (
            supabase.table("profiles")
            .select("hometown")
            .eq("status", "approved")
            # 解説: .not_.is_("hometown", "null") = hometown が NULL でないもの
            .not_.is_("hometown", "null")
            .execute()
        )
    except APIError:
        return []
    # 解説: set で重複を除去して sorted でソートして返す
    return sorted({r["hometown"] for r in (res.data or []) if r.get("hometown")})


# 解説: GET /api/profiles/{user_id} = 特定ユーザーのプロフィール詳細を返す
@router.get("/profiles/{user_id}", response_model=ProfileDetail)
@limiter.limit("60/minute")
async def get_profile(
    request: Request,
    user_id: UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_active_user),
) -> ProfileDetail:
    uid_str = str(user_id)
    # 解説: 自分自身のプロフィールを見る場合は各種制限を緩める
    is_self = str(current_user.id) == uid_str

    if not is_self:
        # 他人のプロフィールを見るときは approved 必須
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
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="サービスに接続できませんでした",
            )
        if not me_res.data or me_res.data.get("status") != "approved":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="承認済みユーザーのみアクセスできます",
            )
    try:
        # 解説: 対象ユーザーのプロフィールを取得する（SELECT * 禁止・カラム明示）
        target_res = (
            supabase.table("profiles")
            .select("id, name, year, faculty, department, bio, created_at, profile_image_path, status, interests, clubs, hometown, last_seen_at, status_message")
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
    # 解説: 他人が見る場合、approved 以外（削除済み・審査中等）は 404 にする
    if not is_self and p.get("status") != "approved":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ユーザーが見つかりません",
        )

    # 身バレ防止チェック（ブロック判定より前。404 を先に返し「ブロックの有無」を漏らさない）
    # 解説: 身バレが 404、ブロックが 403 の順にすることで、ブロック存在を推測させない
    if not is_self and is_hidden_from_viewer(str(current_user.id), uid_str):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ユーザーが見つかりません",
        )

    # ブロックチェック（双方向）。fail-closed: 失敗時は例外伝播 → 500（足跡記録にも到達しない）
    if not is_self and uid_str in set(get_blocked_user_ids(str(current_user.id))):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="このユーザーのプロフィールは表示できません",
        )

    # 足跡記録（自分以外のプロフィールを閲覧した場合）
    # 解説: upsert = 既存レコードがあれば viewed_at を更新、なければ INSERT
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
        background_tasks.add_task(notify_users, [uid_str], "view")

    path: str | None = p.get("profile_image_path")
    avatar_url: str | None = get_signed_image_url(path) if path else None

    # 解説: 自分以外のプロフィールの場合、いいね済みかどうかを確認する
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

    # 解説: プロフィール写真一覧を取得する（自分の場合は全状態・他人の場合は approved のみ）
    photos: list[PhotoItem] = []
    try:
        photos_q = (
            supabase.table("profile_images")
            .select("id, image_path, display_order, status")
            .eq("user_id", uid_str)
            .order("display_order")
        )
        if not is_self:
            # 解説: 他人が見る場合は承認済み写真のみ表示する
            photos_q = photos_q.eq("status", "approved")
        photos_res = photos_q.execute()
        rows = list(photos_res.data or [])
        # メイン写真（profiles.profile_image_path）を必ず先頭に。残りは display_order 順を維持
        main_path = p.get("profile_image_path")
        if main_path:
            # 解説: メイン写真を先頭（0）に、それ以外を後ろ（1）に並べ替える
            rows.sort(key=lambda r: 0 if r["image_path"] == main_path else 1)
        for row in rows:
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

    # R4 二重防御: 不変条件（W1〜W4）で profile_image_path は approved のはずだが念のため照合
    # 追加 DB クエリ不要（photos は直上で取得済み）
    if not is_self:
        # 解説: approved 写真のパス集合を作って、プロフィールのメイン写真がその中にあるか確認する
        approved_paths = {row.image_path for row in photos}
        if path not in approved_paths:
            # 解説: メイン写真が approved でなければ先頭の approved 写真に差し替える
            path = photos[0].image_path if photos else None
            avatar_url = get_signed_image_url(path) if path else None

    return ProfileDetail(
        id=p["id"],
        name=p.get("name"),
        year=p.get("year"),
        faculty=p.get("faculty"),
        department=p.get("department"),
        # 解説: classify = 学部名を "humanities" / "sciences" / None に分類する
        science_humanities=classify(p.get("faculty")),
        bio=p.get("bio"),
        created_at=p["created_at"],
        avatar_url=avatar_url,
        is_liked=is_liked,
        photos=photos,
        interests=p.get("interests") or [],
        club=None,
        clubs=p.get("clubs") or [],
        hometown=p.get("hometown"),
        last_seen_at=p.get("last_seen_at"),
        online_status=calc_online_status(p.get("last_seen_at")),
        status_message=p.get("status_message"),
    )
