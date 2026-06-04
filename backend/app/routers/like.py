import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, Response, status
from gotrue.types import User
from postgrest.exceptions import APIError

from app.auth.active_user import get_active_user
from app.auth.approved_user import get_approved_user
from app.core.block_utils import get_blocked_user_ids
from app.core.config import settings
from app.core.identity_hide import get_hidden_user_ids_for, is_hidden_from_viewer
from app.core.email import send_match_notification
from app.core.image_utils import get_signed_image_url
from app.core.inventory import (
    INITIAL_LIKE_STOCK,
    STOCK_CAP,
    consume_like_stock,
    get_like_stock,
    refund_like_stock,
)
from app.core.limiter import limiter
from app.core.push import send_push_to_user
from app.core.supabase_client import supabase
from app.schemas.like import LikeCreateRequest, LikeResponse, LikerItem

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/likes", tags=["likes"])


def _send_like_push_bg(liker_id: str, liked_id: str) -> None:
    """いいね受信プッシュ通知（BackgroundTask として実行）"""
    try:
        res = supabase.table("profiles").select("name").eq("id", liker_id).single().execute()
        liker_name = (res.data or {}).get("name") or "誰か"
    except Exception:
        liker_name = "誰か"
    send_push_to_user(liked_id, "いいねが届いた", f"{liker_name}さんからいいねが届きました", "/matches")


def _send_match_push_bg(liker_id: str, liked_id: str) -> None:
    """マッチ成立プッシュ通知（BackgroundTask として実行）"""
    try:
        res = supabase.table("profiles").select("id, name").in_("id", [liker_id, liked_id]).execute()
        profile_map = {p["id"]: (p.get("name") or "誰か") for p in (res.data or [])}
    except Exception:
        profile_map = {}
    liker_name = profile_map.get(liker_id, "誰か")
    liked_name = profile_map.get(liked_id, "誰か")
    send_push_to_user(liked_id, "マッチした！", f"{liker_name}さんとマッチしました。メッセージを送ってみよう", "/matches")
    send_push_to_user(liker_id, "マッチした！", f"{liked_name}さんとマッチしました。メッセージを送ってみよう", "/matches")


def _send_match_emails(liker_id: str, liked_id: str) -> None:
    """マッチ成立時の通知メールを両者に送信する（BackgroundTask として実行）"""
    try:
        profiles_res = (
            supabase.table("profiles")
            .select("id, email, name")
            .in_("id", [liker_id, liked_id])
            .execute()
        )
        profiles_map = {p["id"]: p for p in (profiles_res.data or [])}
        liker_profile = profiles_map.get(liker_id, {})
        liked_profile = profiles_map.get(liked_id, {})
        if liker_profile.get("email"):
            send_match_notification(
                liker_profile["email"],
                liked_profile.get("name") or "相手",
            )
        if liked_profile.get("email"):
            send_match_notification(
                liked_profile["email"],
                liker_profile.get("name") or "相手",
            )
    except Exception as e:
        logger.error("マッチ通知メール送信失敗 liker=%s liked=%s: %s", liker_id, liked_id, e)


@router.post("/", response_model=LikeResponse)
@limiter.limit("60/minute")
async def create_like(
    request: Request,
    body: LikeCreateRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_approved_user),
) -> LikeResponse:
    liker_id = str(current_user.id)
    liked_id = str(body.liked_id)
    via_footprint = body.via_footprint

    # チェック2: 自分自身へのいいね禁止
    if liker_id == liked_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="自分自身にいいねすることはできません",
        )

    # チェック2.4: 身バレ防止（ブロック判定より前。存在しないかのように 404）
    if is_hidden_from_viewer(liker_id, liked_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ユーザーが見つかりません",
        )

    # チェック2.5: ブロック関係（双方向）。ブロック判明を相手に伝えないため中立メッセージ
    blocked_ids = set(get_blocked_user_ids(liker_id))
    if liked_id in blocked_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="このユーザーにはいいねを送れません",
        )

    # チェック3: 相手が存在かつ approved か
    try:
        target_res = (
            supabase.table("profiles")
            .select("status")
            .eq("id", liked_id)
            .single()
            .execute()
        )
    except APIError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ユーザーが見つかりません",
        )

    if not target_res.data or target_res.data.get("status") != "approved":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ユーザーが見つかりません",
        )

    # チェック4: 既存のいいねを確認（冪等な動作）→ 新規マッチ成立ではないので is_match=False
    try:
        existing_res = (
            supabase.table("likes")
            .select("liker_id, liked_id, created_at")
            .eq("liker_id", liker_id)
            .eq("liked_id", liked_id)
            .single()
            .execute()
        )
        if existing_res.data:
            return LikeResponse(**existing_res.data, is_match=False)
    except APIError:
        pass  # 行が存在しない場合は APIError → そのまま INSERT へ

    # should_count_quota: 「男→女・双方向異性志向・非足跡」のとき true。
    # ① OFF 時は受信枠チェックを skip するが、③ 在庫消費の判定にこの値を流用する。
    try:
        count_res = supabase.rpc("should_count_quota", {
            "p_liker_id": liker_id,
            "p_liked_id": liked_id,
            "p_via_footprint": via_footprint,
        }).execute()
        should_count = bool(count_res.data)
    except Exception:
        logger.warning("should_count_quota RPC 失敗 liker=%s liked=%s・should_count=False でフォールバック",
                       liker_id, liked_id, exc_info=True)
        should_count = False

    counted_to_quota = False

    # チェック5: ① BeReal型受信枠チェック（LIKE_QUOTA_ENABLED=true のときのみ作動）
    if settings.like_quota_enabled and should_count:
        today_jst = datetime.now(timezone(timedelta(hours=9))).date()
        now_utc = datetime.now(timezone.utc)

        try:
            quota_res = (
                supabase.table("like_quota")
                .select("user_id, date, opens_at, used_count")
                .eq("user_id", liked_id)
                .eq("date", today_jst.isoformat())
                .single()
                .execute()
            )
            quota = quota_res.data
        except APIError:
            quota = None

        if not quota:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="受信者の枠がまだ準備されていません",
            )

        opens_at_dt = datetime.fromisoformat(quota["opens_at"].replace("Z", "+00:00"))

        if now_utc < opens_at_dt:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="この相手は今は受信できない状態です",
            )

        if quota["used_count"] >= 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="この相手は本日の受信上限に達しています",
            )

        supabase.table("like_quota").update({
            "used_count": quota["used_count"] + 1
        }).eq("user_id", liked_id).eq("date", today_jst.isoformat()).execute()

        counted_to_quota = True

    # チェック6: ③ 男性送信在庫の消費（should_count=true 経路のみ・足跡経由は無料）
    consumed_stock = False
    if should_count:
        if not consume_like_stock(liker_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="いいねが足りない。明日ログインで補充される。",
            )
        consumed_stock = True

    # INSERT（DBトリガー detect_match が裏で matches を自動更新する）
    try:
        insert_res = (
            supabase.table("likes")
            .insert({
                "liker_id": liker_id,
                "liked_id": liked_id,
                "via_footprint": via_footprint,
                "counted_to_quota": counted_to_quota,
            })
            .execute()
        )
    except APIError as e:
        # 重複キーエラーの場合は既存行を返す（競合状態への対応・在庫は戻す）
        if "duplicate" in str(e).lower() or "unique" in str(e).lower():
            if consumed_stock:
                refund_like_stock(liker_id)
                consumed_stock = False
            try:
                fallback_res = (
                    supabase.table("likes")
                    .select("liker_id, liked_id, created_at")
                    .eq("liker_id", liker_id)
                    .eq("liked_id", liked_id)
                    .single()
                    .execute()
                )
                return LikeResponse(**fallback_res.data, is_match=False)
            except APIError:
                pass
        if consumed_stock:
            refund_like_stock(liker_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="いいねの登録に失敗しました",
        )

    if not insert_res.data:
        if consumed_stock:
            refund_like_stock(liker_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="いいねの登録に失敗しました",
        )

    # INSERT 後にマッチ成立を確認（トリガーが matches を更新済みのはず）
    user_a = min(liker_id, liked_id)
    user_b = max(liker_id, liked_id)
    is_match = False
    try:
        match_res = (
            supabase.table("matches")
            .select("user_a_id")
            .eq("user_a_id", user_a)
            .eq("user_b_id", user_b)
            .single()
            .execute()
        )
        is_match = match_res.data is not None
    except APIError:
        pass  # matches 行なし → is_match=False のまま

    if is_match:
        background_tasks.add_task(_send_match_emails, liker_id=liker_id, liked_id=liked_id)
        background_tasks.add_task(_send_match_push_bg, liker_id=liker_id, liked_id=liked_id)
    else:
        background_tasks.add_task(_send_like_push_bg, liker_id=liker_id, liked_id=liked_id)

    return LikeResponse(**insert_res.data[0], is_match=is_match)


@router.get("/quota")
async def get_my_quota(
    current_user: User = Depends(get_active_user),
) -> dict:
    """自分の今日の受信枠情報を返す。男女マッチ志向の女性以外は is_target=false。
    LIKE_QUOTA_ENABLED=false の間は全員 is_target=false で返す（受信枠 UI を出さない）。
    """
    user_id = str(current_user.id)

    # ① OFF 時は受信枠 UI を出さない
    if not settings.like_quota_enabled:
        return {
            "is_target": False,
            "opens_at": None,
            "used_count": 0,
            "max_count": 5,
            "is_open": True,
            "is_full": False,
        }

    try:
        profile_res = (
            supabase.table("profiles")
            .select("gender, interest_in")
            .eq("id", user_id)
            .single()
            .execute()
        )
    except APIError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="プロフィールが見つかりません",
        )

    profile = profile_res.data
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="プロフィールが見つかりません",
        )

    # 対象外（男女マッチ志向の女性以外）
    if not (profile.get("gender") == "female" and profile.get("interest_in") == "male"):
        return {
            "is_target": False,
            "opens_at": None,
            "used_count": 0,
            "max_count": 5,
            "is_open": True,
            "is_full": False,
        }

    today_jst = datetime.now(timezone(timedelta(hours=9))).date()

    try:
        quota_res = (
            supabase.table("like_quota")
            .select("user_id, date, opens_at, used_count")
            .eq("user_id", user_id)
            .eq("date", today_jst.isoformat())
            .single()
            .execute()
        )
        quota = quota_res.data
    except APIError:
        quota = None

    if not quota:
        return {
            "is_target": True,
            "opens_at": None,
            "used_count": 0,
            "max_count": 5,
            "is_open": False,
            "is_full": False,
        }

    now_utc = datetime.now(timezone.utc)
    opens_at_dt = datetime.fromisoformat(quota["opens_at"].replace("Z", "+00:00"))

    return {
        "is_target": True,
        "opens_at": quota["opens_at"],
        "used_count": quota["used_count"],
        "max_count": 5,
        "is_open": now_utc >= opens_at_dt,
        "is_full": quota["used_count"] >= 5,
    }


@router.get("/stock")
async def get_my_like_stock(
    current_user: User = Depends(get_active_user),
) -> dict:
    """男性の送信在庫を返す。male 以外は is_applicable=false。
    ensure を兼ねるためログイン報酬 +2 はこの GET で発火する。
    """
    user_id = str(current_user.id)

    try:
        profile_res = (
            supabase.table("profiles")
            .select("gender")
            .eq("id", user_id)
            .single()
            .execute()
        )
    except APIError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="プロフィールが見つかりません",
        )

    profile = profile_res.data or {}
    if profile.get("gender") != "male":
        return {
            "is_applicable": False,
            "quantity": 0,
            "initial": INITIAL_LIKE_STOCK,
            "daily_grant": 2,
            "cap": STOCK_CAP,
        }

    qty = get_like_stock(user_id)
    return {
        "is_applicable": True,
        "quantity": qty,
        "initial": INITIAL_LIKE_STOCK,
        "daily_grant": 2,
        "cap": STOCK_CAP,
    }


@router.get("/today-count")
async def get_today_like_count(
    current_user: User = Depends(get_active_user),
) -> dict[str, int]:
    my_id = str(current_user.id)
    jst = timezone(timedelta(hours=9))
    today_start_jst = datetime.now(jst).replace(hour=0, minute=0, second=0, microsecond=0)
    today_start_utc = today_start_jst.astimezone(timezone.utc).isoformat()
    try:
        res = (
            supabase.table("likes")
            .select("liker_id")
            .eq("liker_id", my_id)
            .gte("created_at", today_start_utc)
            .execute()
        )
        count = len(res.data or [])
    except Exception:
        count = 0
    return {"count": count}


@router.get("/received", response_model=list[LikerItem])
async def get_received_likes(
    current_user: User = Depends(get_active_user),
    for_match_tab: bool = Query(False),
) -> list[LikerItem]:
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

    q = (
        supabase.table("likes")
        .select("liker_id, receiver_read_at")
        .eq("liked_id", my_id)
        .order("created_at", desc=True)
        .limit(50)
    )
    if for_match_tab:
        q = q.eq("dismissed_from_match", False)
    likes_res = q.execute()

    likes_data = likes_res.data or []
    liker_is_new: dict[str, bool] = {
        row["liker_id"]: row.get("receiver_read_at") is None
        for row in likes_data
    }
    liker_ids = list(liker_is_new.keys())
    if not liker_ids:
        return []

    # マッチ済みを除外
    matches_res = (
        supabase.table("matches")
        .select("user_a_id, user_b_id")
        .or_(f"user_a_id.eq.{my_id},user_b_id.eq.{my_id}")
        .execute()
    )
    matched_ids: set[str] = set()
    for row in (matches_res.data or []):
        other = row["user_b_id"] if row["user_a_id"] == my_id else row["user_a_id"]
        matched_ids.add(other)

    liker_ids = [lid for lid in liker_ids if lid not in matched_ids]
    if not liker_ids:
        return []

    # ブロック相手・身バレ防止対象を除外
    blocked_ids: set[str] = set(get_blocked_user_ids(my_id))
    hidden_ids: set[str] = get_hidden_user_ids_for(my_id)
    liker_ids = [lid for lid in liker_ids if lid not in blocked_ids and lid not in hidden_ids]
    if not liker_ids:
        return []

    profiles_res = (
        supabase.table("profiles")
        .select("id, name, year, faculty, profile_image_path")
        .in_("id", liker_ids)
        .execute()
    )

    result: list[LikerItem] = []
    for p in (profiles_res.data or []):
        # profile_image_path は approved 写真のみ不変条件（W1〜W4 で担保・[8.3]）
        path: str | None = p.get("profile_image_path")
        result.append(LikerItem(
            id=p["id"],
            name=p.get("name"),
            year=p.get("year"),
            faculty=p.get("faculty"),
            avatar_url=get_signed_image_url(path) if path else None,
            is_new=liker_is_new.get(p["id"], False),
        ))

    return result


@router.post("/dismiss/{liker_id}", status_code=status.HTTP_204_NO_CONTENT)
async def dismiss_like(
    liker_id: str,
    current_user: User = Depends(get_active_user),
) -> Response:
    """マッチタブの「今はいい」でいいねを永続的に非表示にする"""
    user_id = str(current_user.id)

    like_res = (
        supabase.table("likes")
        .select("liker_id")
        .eq("liker_id", liker_id)
        .eq("liked_id", user_id)
        .limit(1)
        .execute()
    )
    if not like_res.data:
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    supabase.table("likes").update({
        "dismissed_from_match": True,
        "receiver_read_at": datetime.now(timezone.utc).isoformat(),
    }).eq("liker_id", liker_id).eq("liked_id", user_id).execute()

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/received/confirm", status_code=status.HTTP_204_NO_CONTENT)
async def confirm_received_likes(
    current_user: User = Depends(get_active_user),
) -> None:
    """自分が受け取ったいいねを既読にする"""
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
        supabase.table("likes").update(
            {"receiver_read_at": datetime.now(timezone.utc).isoformat()}
        ).eq("liked_id", my_id).is_("receiver_read_at", "null").execute()
    except Exception:
        pass
