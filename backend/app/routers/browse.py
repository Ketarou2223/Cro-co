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
from app.core.like_blur import blur_targets_for
from app.core.limiter import limiter
from app.core.realtime import notify_users
from app.core.supabase_client import supabase
from app.services.completeness import MISC_FIELDS
from app.schemas.browse import BrowseProfileItem, DailyTodayForProfile, ProfileDetail, ProfileViewItem, ProfileViewsResponse, RecommendedProfileItem
from app.schemas.profile import PhotoItem
from app.services.daily_logic import build_stats, fetch_active_questions, jst_today, pick_today_question

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["browse"])

# groups フィルタの定義: キー → (student_type, [year値リスト])
_GROUP_DEFINITIONS: dict[str, tuple[str, list[int]]] = {
    "u1":     ("undergrad", [1]),
    "u2":     ("undergrad", [2]),
    "u3":     ("undergrad", [3]),
    "u4plus": ("undergrad", [4, 5, 6]),
    "master": ("grad",      [7, 8]),
    "doctor": ("grad",      [9, 10, 11]),
}

# eq フィルタの有効値セット（未知値は無視・groups と同方針）
_VALID_BODY_TYPE = frozenset({"slim", "average", "muscular", "glamorous", "chubby"})
_VALID_BLOOD_TYPE = frozenset({"A", "B", "O", "AB"})
_VALID_ZODIAC = frozenset({"aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"})
_VALID_CAMPUS = frozenset({"toyonaka", "suita", "minoh"})
_VALID_HOUSING = frozenset({"alone", "family", "dorm", "share"})
_VALID_COMMUTE_TIME = frozenset({"le30", "le60", "le90", "le120", "le150", "gt150"})
_VALID_MBTI = frozenset({"INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP", "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP"})
_VALID_DRINKING = frozenset({"often", "sometimes", "no"})
_VALID_SMOKING = frozenset({"no", "yes", "vape", "not_around_others"})
_VALID_RELATIONSHIP_GOAL = frozenset({"marriage", "partner", "friend_first"})
_VALID_MARRIAGE_INTENT = frozenset({"someday", "not_now", "unsure"})
_VALID_PREFERRED_AGE_BAND = frozenset({"older", "younger", "same", "any"})
_VALID_SECOND_LANG = frozenset({"de", "fr", "zh", "es", "ru", "ko", "it", "other"})
_VALID_LANGUAGE = frozenset({"ja", "en", "zh", "ko", "fr", "de", "es", "other"})
_VALID_COMMUTE_MEANS = frozenset({"train", "bus", "bicycle", "walk", "motorbike", "car"})


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
    # 解説: groups = 学年×身分の複合グループフィルタ（u1/u2/u3/u4plus/master/doctor）複数指定可
    groups: list[str] | None = Query(None),
    # 解説: science_humanities = "humanities"（文系）または "sciences"（理系）で絞る
    science_humanities: str | None = Query(None, max_length=20),
    hometowns: list[str] | None = Query(None),
    bio_keyword: str | None = Query(None, max_length=100),
    # 解説: sort_by = "last_seen" / "year_asc" / "year_desc" / "created_desc"（新着順）
    sort_by: str | None = Query(None, max_length=20),
    body_type: str | None = Query(None, max_length=25),
    blood_type: str | None = Query(None, max_length=5),
    zodiac: str | None = Query(None, max_length=20),
    campus: str | None = Query(None, max_length=20),
    housing: str | None = Query(None, max_length=20),
    commute_time: str | None = Query(None, max_length=10),
    mbti: str | None = Query(None, max_length=5),
    drinking: str | None = Query(None, max_length=20),
    smoking: str | None = Query(None, max_length=25),
    relationship_goal: str | None = Query(None, max_length=20),
    marriage_intent: str | None = Query(None, max_length=20),
    preferred_age_band: str | None = Query(None, max_length=10),
    second_lang: str | None = Query(None, max_length=10),
    height_min: int | None = Query(None, ge=140, le=190),
    height_max: int | None = Query(None, ge=140, le=190),
    languages: list[str] | None = Query(None),
    commute_means: list[str] | None = Query(None),
    current_user: User = Depends(get_approved_user),
) -> list[BrowseProfileItem]:
    # groups の各要素を既知キーに限定する（未知キーは無視）
    if groups:
        groups = [g for g in groups if g in _GROUP_DEFINITIONS]
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
    # 未知値を無視（groups と同方針）
    if body_type and body_type not in _VALID_BODY_TYPE:
        body_type = None
    if blood_type and blood_type not in _VALID_BLOOD_TYPE:
        blood_type = None
    if zodiac and zodiac not in _VALID_ZODIAC:
        zodiac = None
    if campus and campus not in _VALID_CAMPUS:
        campus = None
    if housing and housing not in _VALID_HOUSING:
        housing = None
    if commute_time and commute_time not in _VALID_COMMUTE_TIME:
        commute_time = None
    if mbti and mbti not in _VALID_MBTI:
        mbti = None
    if drinking and drinking not in _VALID_DRINKING:
        drinking = None
    if smoking and smoking not in _VALID_SMOKING:
        smoking = None
    if relationship_goal and relationship_goal not in _VALID_RELATIONSHIP_GOAL:
        relationship_goal = None
    if marriage_intent and marriage_intent not in _VALID_MARRIAGE_INTENT:
        marriage_intent = None
    if preferred_age_band and preferred_age_band not in _VALID_PREFERRED_AGE_BAND:
        preferred_age_band = None
    if second_lang and second_lang not in _VALID_SECOND_LANG:
        second_lang = None
    # height range: min > max なら入れ替え
    if height_min is not None and height_max is not None and height_min > height_max:
        height_min, height_max = height_max, height_min
    # overlap: 無効値除去・件数上限
    if languages:
        languages = [v for v in languages if v in _VALID_LANGUAGE][:8] or None
    if commute_means:
        commute_means = [v for v in commute_means if v in _VALID_COMMUTE_MEANS][:6] or None
    try:
        # 解説: 自分のプロフィールを取得して身バレ防止・性別フィルタ・ボカし判定に使う
        _me_select = ("faculty, department, clubs, faculty_hide_level, hidden_clubs, gender, interest_in, "
                      "bio, " + ", ".join(MISC_FIELDS))
        me_res = (
            supabase.table("profiles")
            .select(_me_select)
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

    # viewer 写真数（ボカし判定用）
    _viewer_photo_count = 0
    try:
        _vp_res = (
            supabase.table("profile_images")
            .select("id")
            .eq("user_id", me)
            .neq("status", "rejected")
            .execute()
        )
        _viewer_photo_count = len(_vp_res.data or [])
    except Exception:
        pass

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
        # 学年×身分グループフィルタ（各グループは AND、グループ間は OR）
        if groups:
            or_parts: list[str] = []
            for g in groups:
                st, yrs = _GROUP_DEFINITIONS[g]
                if len(yrs) == 1:
                    or_parts.append(f"and(student_type.eq.{st},year.eq.{yrs[0]})")
                else:
                    year_list = ",".join(str(y) for y in yrs)
                    or_parts.append(f"and(student_type.eq.{st},year.in.({year_list}))")
            if or_parts:
                q = q.or_(",".join(or_parts))
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
        # eq フィルタ（13 項目）
        if body_type:
            q = q.eq("body_type", body_type)
        if blood_type:
            q = q.eq("blood_type", blood_type)
        if zodiac:
            q = q.eq("zodiac", zodiac)
        if campus:
            q = q.eq("campus", campus)
        if housing:
            q = q.eq("housing", housing)
        if commute_time:
            q = q.eq("commute_time", commute_time)
        if mbti:
            q = q.eq("mbti", mbti)
        if drinking:
            q = q.eq("drinking", drinking)
        if smoking:
            q = q.eq("smoking", smoking)
        if relationship_goal:
            q = q.eq("relationship_goal", relationship_goal)
        if marriage_intent:
            q = q.eq("marriage_intent", marriage_intent)
        if preferred_age_band:
            q = q.eq("preferred_age_band", preferred_age_band)
        if second_lang:
            q = q.eq("second_lang", second_lang)
        # 身長レンジ
        if height_min is not None:
            q = q.gte("height_cm", height_min)
        if height_max is not None:
            q = q.lte("height_cm", height_max)
        # 配列 overlap（ov: column && value、いずれか含む = OR。cs=AND と混同しないこと）
        if languages:
            q = q.filter("languages", "ov", "{" + ",".join(languages) + "}")
        if commute_means:
            q = q.filter("commute_means", "ov", "{" + ",".join(commute_means) + "}")
        if sort_by == "last_seen":
            # nullsfirst=False で last_seen_at.desc.nullslast が生成される（NULL を末尾へ）
            q = q.order("last_seen_at", desc=True, nullsfirst=False)
        elif sort_by == "year_asc":
            q = q.order("year", desc=False)
        elif sort_by == "year_desc":
            q = q.order("year", desc=True)
        elif sort_by == "created_desc":
            q = q.order("created_at", desc=True)
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

    # ボカし判定（女性・充実度80%未満の場合のみ active）
    blur = blur_targets_for(me, my_data, _viewer_photo_count)

    result: list[BrowseProfileItem] = []
    for p in filtered:
        approved_paths = approved_paths_by_user.get(p["id"], [])
        main_path: str | None = p.get("profile_image_path")
        # 解説: プロフィールのメイン写真が approved 一覧にあればそれを使い、なければ先頭を使う
        if main_path and main_path in approved_paths:
            path: str | None = main_path
        else:
            path = approved_paths[0] if approved_paths else None
        _blurred = bool(blur.get("active") and p["id"] in blur.get("liker_ids", set()))
        result.append(
            BrowseProfileItem(
                id=p["id"],
                name=p.get("name"),
                year=p.get("year"),
                faculty=p.get("faculty"),
                department=p.get("department"),
                bio=p.get("bio"),
                avatar_url=None if _blurred else (get_signed_image_url(path) if path else None),
                is_liked=p["id"] in liked_set,
                last_seen_at=p.get("last_seen_at"),
                online_status=calc_online_status(p.get("last_seen_at")),
                status_message=p.get("status_message"),
                clubs=p.get("clubs") or [],
                blurred=_blurred,
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
        _me_rec_select = "status, interests, gender, interest_in, bio, " + ", ".join(MISC_FIELDS)
        me_res = (
            supabase.table("profiles")
            .select(_me_rec_select)
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

    # viewer 写真数（ボカし判定用）
    _rec_viewer_photo_count = 0
    try:
        _rvp_res = (
            supabase.table("profile_images")
            .select("id")
            .eq("user_id", my_id)
            .neq("status", "rejected")
            .execute()
        )
        _rec_viewer_photo_count = len(_rvp_res.data or [])
    except Exception:
        pass

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

    # ボカし判定（女性・充実度80%未満の場合のみ active）
    rec_blur = blur_targets_for(my_id, me_res.data or {}, _rec_viewer_photo_count)

    result: list[RecommendedProfileItem] = []
    for s, p in scored[:5]:
        # profile_image_path は approved 写真のみ不変条件（W1〜W4 で担保・[8.3]）
        path: str | None = p.get("profile_image_path")
        _rec_blurred = bool(rec_blur.get("active") and p["id"] in rec_blur.get("liker_ids", set()))
        result.append(RecommendedProfileItem(
            id=p["id"],
            name=p.get("name"),
            year=p.get("year"),
            faculty=p.get("faculty"),
            bio=p.get("bio"),
            avatar_url=None if _rec_blurred else (get_signed_image_url(path) if path else None),
            is_liked=False,
            last_seen_at=p.get("last_seen_at"),
            show_online_status=p.get("show_online_status", True),
            status_message=p.get("status_message"),
            score=s,
            blurred=_rec_blurred,
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

    # 解説: 自分がこれらの閲覧者にいいね済みかどうかを一括取得する（N+1 防止）
    try:
        liked_res = (
            supabase.table("likes")
            .select("liked_id")
            .eq("liker_id", my_id)
            .in_("liked_id", viewer_ids)
            .execute()
        )
        liked_ids_set: set[str] = {r["liked_id"] for r in (liked_res.data or [])}
    except APIError:
        liked_ids_set = set()

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
            is_liked=r["viewer_id"] in liked_ids_set,
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
            _detail_me_select = "status, gender, bio, " + ", ".join(MISC_FIELDS)
            me_res = (
                supabase.table("profiles")
                .select(_detail_me_select)
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

        # viewer 写真数（ボカし判定用）
        _detail_viewer_photo_count = 0
        try:
            _dvp_res = (
                supabase.table("profile_images")
                .select("id")
                .eq("user_id", str(current_user.id))
                .neq("status", "rejected")
                .execute()
            )
            _detail_viewer_photo_count = len(_dvp_res.data or [])
        except Exception:
            pass
        _detail_blur = blur_targets_for(
            str(current_user.id), me_res.data or {}, _detail_viewer_photo_count
        )
    else:
        _detail_blur = {"active": False}
    try:
        # 解説: 対象ユーザーのプロフィールを取得する（SELECT * 禁止・カラム明示）
        target_res = (
            supabase.table("profiles")
            .select("id, name, year, faculty, department, bio, created_at, profile_image_path, status, interests, clubs, hometown, last_seen_at, status_message, free_slots, height_cm, body_type, blood_type, sibling_rank, languages, campus, housing, commute_time, commute_means, second_lang, relationship_goal, marriage_intent, preferred_age_band, drinking, smoking, mbti, love_type, zodiac")
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

    # 当日の2択情報（相手の回答 + 全体統計）を組み立てる
    daily_today: DailyTodayForProfile | None = None
    try:
        today = jst_today()
        today_q = pick_today_question(fetch_active_questions())
        if today_q is not None:
            their_ans_res = (
                supabase.table("daily_answers")
                .select("choice")
                .eq("user_id", uid_str)
                .eq("answer_date", today.isoformat())
                .limit(1)
                .execute()
            )
            their_rows = their_ans_res.data or []
            their_choice = their_rows[0]["choice"] if their_rows else None
            stats = build_stats(today_q, today)
            daily_today = DailyTodayForProfile(
                question={
                    "id": today_q["id"],
                    "body": today_q["body"],
                    "options": today_q["options"],
                },
                their_choice=their_choice,
                answered=their_choice is not None,
                stats=stats,
            )
    except Exception:
        pass

    # ボカし適用（閲覧者が女性・充実度<80 かつ対象がいいね関係にある場合）
    _target_blurred = bool(
        _detail_blur.get("active") and
        uid_str in (
            _detail_blur.get("liker_ids", set()) | _detail_blur.get("i_liked_ids", set())
        )
    )
    if _target_blurred:
        avatar_url = None
        photos = []

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
        free_slots=p.get("free_slots"),
        height_cm=p.get("height_cm"),
        body_type=p.get("body_type"),
        blood_type=p.get("blood_type"),
        sibling_rank=p.get("sibling_rank"),
        languages=p.get("languages"),
        campus=p.get("campus"),
        housing=p.get("housing"),
        commute_time=p.get("commute_time"),
        commute_means=p.get("commute_means"),
        second_lang=p.get("second_lang"),
        relationship_goal=p.get("relationship_goal"),
        marriage_intent=p.get("marriage_intent"),
        preferred_age_band=p.get("preferred_age_band"),
        drinking=p.get("drinking"),
        smoking=p.get("smoking"),
        mbti=p.get("mbti"),
        love_type=p.get("love_type"),
        zodiac=p.get("zodiac"),
        daily_today=daily_today,
        blurred=_target_blurred,
    )
