# 解説: このファイルは「いいね」機能の API エンドポイントを定義する。
# 解説: 呼ばれる場所: main.py で app.include_router(like.router) として登録される
# 解説: エンドポイント一覧:
#   POST /api/likes/                → いいねを送信する（在庫消費・マッチ成立判定）
#   GET  /api/likes/quota           → 今日の受信枠情報を返す
#   GET  /api/likes/stock           → 送信在庫を返す（男性のみ）
#   GET  /api/likes/today-count     → 今日送ったいいね数を返す
#   GET  /api/likes/received        → 受信したいいね一覧
#   POST /api/likes/dismiss/:id     → マッチタブから非表示にする
#   POST /api/likes/received/confirm → 受信いいねを既読にする
# 解説: 呼ぶ先:
#   Supabase: likes / matches / profiles / like_quota / user_inventory テーブル
#   push.py: いいね通知 / マッチ通知プッシュ
#   email.py: マッチ通知メール
#   block_utils.py: ブロック相手の除外
#   identity_hide.py: 身バレ防止の除外
#   inventory.py: いいね在庫の管理

import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, Response, status
from supabase_auth.types import User
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


# 解説: いいね受信プッシュ通知を送るバックグラウンドタスク関数
# 解説: BackgroundTasks から呼ばれるため同期関数（async def でない）
def _send_like_push_bg(liker_id: str, liked_id: str) -> None:
    """いいね受信プッシュ通知（BackgroundTask として実行）"""
    try:
        # 解説: いいねを送った人の名前を取得してプッシュ通知に使う
        res = supabase.table("profiles").select("name").eq("id", liker_id).single().execute()
        liker_name = (res.data or {}).get("name") or "誰か"
    except Exception:
        # 解説: 名前が取れなくても通知は送る（「誰か」で代替）
        liker_name = "誰か"
    # @copy CRO-push-like-title-01 Lv1 / CRO-push-like-body-01 Lv1
    send_push_to_user(liked_id, "いいねが届いた", f"{liker_name}さんからいいねが届きました", "/matches")


# 解説: マッチ成立プッシュ通知を両者に送るバックグラウンドタスク関数
def _send_match_push_bg(liker_id: str, liked_id: str) -> None:
    """マッチ成立プッシュ通知（BackgroundTask として実行）"""
    try:
        # 解説: いいねした人・された人の名前を1回のクエリで両方取得する
        res = supabase.table("profiles").select("id, name").in_("id", [liker_id, liked_id]).execute()
        # 解説: {id: name} の辞書を作る（辞書内包表記）
        profile_map = {p["id"]: (p.get("name") or "誰か") for p in (res.data or [])}
    except Exception:
        profile_map = {}
    liker_name = profile_map.get(liker_id, "誰か")
    liked_name = profile_map.get(liked_id, "誰か")
    # @copy CRO-push-match-title-01 Lv1 / CRO-push-match-body-01 Lv1
    # 解説: マッチした両者にそれぞれ通知を送る（相手の名前を入れた別メッセージ）
    send_push_to_user(liked_id, "マッチした！", f"{liker_name}さんとマッチしました。メッセージを送ってみてください。", "/matches")
    send_push_to_user(liker_id, "マッチした！", f"{liked_name}さんとマッチしました。メッセージを送ってみてください。", "/matches")


# 解説: マッチ成立通知メールを両者に送るバックグラウンドタスク関数
def _send_match_emails(liker_id: str, liked_id: str) -> None:
    """マッチ成立時の通知メールを両者に送信する（BackgroundTask として実行）"""
    try:
        # 解説: 両者のプロフィール（email・name）を1回のクエリで取得する
        profiles_res = (
            supabase.table("profiles")
            .select("id, email, name")
            .in_("id", [liker_id, liked_id])
            .execute()
        )
        # 解説: {id: profile辞書} の形に変換して参照しやすくする
        profiles_map = {p["id"]: p for p in (profiles_res.data or [])}
        liker_profile = profiles_map.get(liker_id, {})
        liked_profile = profiles_map.get(liked_id, {})
        # 解説: いいねを送った人のメールに「相手の名前」を添えてマッチ通知を送る
        if liker_profile.get("email"):
            send_match_notification(
                liker_profile["email"],
                liked_profile.get("name") or "相手",
            )
        # 解説: いいねを受け取った人のメールにも同様に送る
        if liked_profile.get("email"):
            send_match_notification(
                liked_profile["email"],
                liker_profile.get("name") or "相手",
            )
    except Exception as e:
        logger.error("マッチ通知メール送信失敗 liker=%s liked=%s: %s", liker_id, liked_id, e)


# 解説: POST /api/likes/ = いいねを送信するエンドポイント
# 解説: get_approved_user = 承認済みユーザーのみ利用可能（審査中は使えない）
@router.post("/", response_model=LikeResponse)
# 解説: 1分間に60回まで（連打スパム防止）
@limiter.limit("60/minute")
async def create_like(
    request: Request,
    body: LikeCreateRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_approved_user),
) -> LikeResponse:
    # 解説: liker_id = いいねを送る側（自分）の ID
    liker_id = str(current_user.id)
    # 解説: liked_id = いいねを受け取る側の ID（リクエストボディで指定）
    liked_id = str(body.liked_id)
    # 解説: via_footprint = 足跡（プロフィール閲覧）経由のいいねかどうか（在庫消費免除の判定に使う）
    via_footprint = body.via_footprint

    # チェック2: 自分自身へのいいね禁止
    if liker_id == liked_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="自分自身にいいねすることはできません",
        )

    # チェック2.4: 身バレ防止（ブロック判定より前。存在しないかのように 404）
    # 解説: 身バレ防止対象の相手には「存在しない（404）」として応答する（ブロックより先に判定）
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
    # 解説: 既にいいね済みなら重複 INSERT せず既存の結果を返す（冪等性の確保）
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
    # 解説: Supabase の RPC（ストアドファンクション）を呼んで「在庫・受信枠の消費対象か」を判定する
    try:
        count_res = supabase.rpc("should_count_quota", {
            "p_liker_id": liker_id,
            "p_liked_id": liked_id,
            "p_via_footprint": via_footprint,
        }).execute()
        should_count = bool(count_res.data)
    except Exception:
        # 解説: RPC 失敗時は安全側（should_count=True）にフォールバック
        logger.warning("should_count_quota RPC 失敗 liker=%s liked=%s・should_count=True で安全側フォールバック",
                       liker_id, liked_id, exc_info=True)
        should_count = True

    # 解説: 受信枠を実際に消費したかどうかのフラグ（失敗時の巻き戻しに使う）
    counted_to_quota = False

    # チェック5: ① BeReal型受信枠チェック（LIKE_QUOTA_ENABLED=true のときのみ作動）
    # 解説: LIKE_QUOTA_ENABLED は環境変数で制御できるフラグ。現在は基本 OFF
    if settings.like_quota_enabled and should_count:
        today_jst = datetime.now(timezone(timedelta(hours=9))).date()
        now_utc = datetime.now(timezone.utc)

        try:
            # 解説: 受信者の今日の受信枠情報を取得する
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

        # 解説: 今日の枠がまだ準備されていない
        if not quota:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="受信者の枠がまだ準備されていません",
            )

        # 解説: opens_at の文字列を datetime オブジェクトに変換（Z を +00:00 に置換して UTC 対応）
        opens_at_dt = datetime.fromisoformat(quota["opens_at"].replace("Z", "+00:00"))

        # 解説: まだ開放時刻になっていなければ受け取れない
        if now_utc < opens_at_dt:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="この相手は今は受信できない状態です",
            )

        # 解説: 1日の受信上限（5件）に達していれば拒否
        if quota["used_count"] >= 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="この相手は本日の受信上限に達しています",
            )

        # 解説: 受信枠の used_count をインクリメント（+1）する
        supabase.table("like_quota").update({
            "used_count": quota["used_count"] + 1
        }).eq("user_id", liked_id).eq("date", today_jst.isoformat()).execute()

        counted_to_quota = True

    # チェック6: ③ 男性送信在庫の消費（should_count=true 経路のみ・足跡経由は無料）
    # 解説: 在庫を消費したかどうかのフラグ（INSERT 失敗時に refund するため）
    consumed_stock = False
    if should_count:
        # 解説: consume_like_stock が False = 在庫0 = いいね不可
        if not consume_like_stock(liker_id):
            # @copy CRO-error-api-like-stock-01 Lv1
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="いいねが足りません。翌日ログインで補充されます。",
            )
        consumed_stock = True

    # INSERT（DBトリガー detect_match が裏で matches を自動更新する）
    # 解説: likes テーブルに新しいいいねを INSERT する
    # 解説: DB トリガー detect_match が両者の likes を検出して matches テーブルを自動更新する
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
        # 解説: 同時リクエストで重複した場合は在庫を返金して既存のいいねを返す
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
        # 解説: 重複以外のエラー時も在庫を返金してから 500 を返す
        if consumed_stock:
            refund_like_stock(liker_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="いいねの登録に失敗しました",
        )

    # 解説: INSERT の結果が空 = DB 側で何らかの原因で行が作られなかった
    if not insert_res.data:
        if consumed_stock:
            refund_like_stock(liker_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="いいねの登録に失敗しました",
        )

    # INSERT 後にマッチ成立を確認（トリガーが matches を更新済みのはず）
    # 解説: matches テーブルの user_a_id は小さい方の UUID で固定されている（一意キーのため）
    user_a = min(liker_id, liked_id)
    user_b = max(liker_id, liked_id)
    is_match = False
    try:
        # 解説: matches テーブルを確認してマッチが成立したか調べる
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

    # 解説: マッチ成立 → 両者に通知 / 未成立 → いいね通知のみ送る
    if is_match:
        background_tasks.add_task(_send_match_emails, liker_id=liker_id, liked_id=liked_id)
        background_tasks.add_task(_send_match_push_bg, liker_id=liker_id, liked_id=liked_id)
    else:
        background_tasks.add_task(_send_like_push_bg, liker_id=liker_id, liked_id=liked_id)

    # 解説: INSERT した行と is_match フラグを LikeResponse にして返す
    return LikeResponse(**insert_res.data[0], is_match=is_match)


# 解説: GET /api/likes/quota = 自分の今日の受信枠情報を返す
@router.get("/quota")
async def get_my_quota(
    current_user: User = Depends(get_active_user),
) -> dict:
    """自分の今日の受信枠情報を返す。男女マッチ志向の女性以外は is_target=false。
    LIKE_QUOTA_ENABLED=false の間は全員 is_target=false で返す（受信枠 UI を出さない）。
    """
    user_id = str(current_user.id)

    # ① OFF 時は受信枠 UI を出さない
    # 解説: 機能フラグが OFF の間は全員「受信枠対象外」として返す
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
        # 解説: 自分の gender と interest_in を取得して対象かどうか判定する
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
    # 解説: 受信枠の仕組みは「男性から女性（異性志向）へのいいね」のみに適用
    if not (profile.get("gender") == "female" and profile.get("interest_in") == "male"):
        return {
            "is_target": False,
            "opens_at": None,
            "used_count": 0,
            "max_count": 5,
            "is_open": True,
            "is_full": False,
        }

    # 解説: 今日の JST 日付を取得
    today_jst = datetime.now(timezone(timedelta(hours=9))).date()

    try:
        # 解説: like_quota テーブルから自分の今日の枠情報を取得
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

    # 解説: 今日の枠がまだ生成されていない場合
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
    # 解説: opens_at を datetime に変換して開放済みかどうか判定する
    opens_at_dt = datetime.fromisoformat(quota["opens_at"].replace("Z", "+00:00"))

    return {
        "is_target": True,
        "opens_at": quota["opens_at"],
        "used_count": quota["used_count"],
        "max_count": 5,
        # 解説: is_open = 現在時刻が開放時刻以降かどうか
        "is_open": now_utc >= opens_at_dt,
        # 解説: is_full = 今日の受信上限（5件）に達しているかどうか
        "is_full": quota["used_count"] >= 5,
    }


# 解説: GET /api/likes/stock = 自分の送信在庫を返す（男性のみ意味がある）
@router.get("/stock")
async def get_my_like_stock(
    current_user: User = Depends(get_active_user),
) -> dict:
    """男性の送信在庫を返す。male 以外は is_applicable=false。
    ensure を兼ねるためログイン報酬 +2 はこの GET で発火する。
    """
    user_id = str(current_user.id)

    try:
        # 解説: 自分の性別を確認する
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
    # 解説: 男性以外には在庫制限が適用されないため is_applicable=False で返す
    if profile.get("gender") != "male":
        return {
            "is_applicable": False,
            "quantity": 0,
            "initial": INITIAL_LIKE_STOCK,
            "daily_grant": 2,
            "cap": STOCK_CAP,
        }

    # 解説: ensure_like_stock を内包した get_like_stock で現在庫を取得（ログイン報酬も付与）
    qty = get_like_stock(user_id)
    return {
        "is_applicable": True,
        "quantity": qty,
        "initial": INITIAL_LIKE_STOCK,
        "daily_grant": 2,
        "cap": STOCK_CAP,
    }


# 解説: GET /api/likes/today-count = 今日送ったいいね数を返す
@router.get("/today-count")
async def get_today_like_count(
    current_user: User = Depends(get_active_user),
) -> dict[str, int]:
    my_id = str(current_user.id)
    # 解説: JST タイムゾーンを定義
    jst = timezone(timedelta(hours=9))
    # 解説: 今日 00:00:00 JST を UTC に変換してクエリの基準日時にする
    today_start_jst = datetime.now(jst).replace(hour=0, minute=0, second=0, microsecond=0)
    today_start_utc = today_start_jst.astimezone(timezone.utc).isoformat()
    try:
        # 解説: 自分が送ったいいねのうち today_start_utc 以降のものを取得してカウント
        res = (
            supabase.table("likes")
            .select("liker_id")
            .eq("liker_id", my_id)
            # 解説: .gte = greater than or equal（以上）
            .gte("created_at", today_start_utc)
            .execute()
        )
        count = len(res.data or [])
    except Exception:
        count = 0
    return {"count": count}


# 解説: GET /api/likes/pending-count = 未処理受信いいね件数を返す（/received と同じ除外基準）
# 解説: 未処理 = dismissed_from_match=False かつ マッチ未成立 かつ ブロック/身バレ対象外
@router.get("/pending-count")
async def get_pending_like_count(
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
        return {"count": 0}

    if not me_res.data or me_res.data.get("status") != "approved":
        return {"count": 0}

    # 解説: dismiss されていないいいねの liker_id を取得する
    likes_res = (
        supabase.table("likes")
        .select("liker_id")
        .eq("liked_id", my_id)
        .eq("dismissed_from_match", False)
        .execute()
    )
    liker_ids = [row["liker_id"] for row in (likes_res.data or [])]
    if not liker_ids:
        return {"count": 0}

    # 解説: マッチ済みの相手を除外する（マッチ一覧で表示するため）
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
        return {"count": 0}

    # 解説: ブロック・身バレ防止対象を除外する
    blocked_ids: set[str] = set(get_blocked_user_ids(my_id))
    hidden_ids: set[str] = get_hidden_user_ids_for(my_id)
    liker_ids = [lid for lid in liker_ids if lid not in blocked_ids and lid not in hidden_ids]
    if not liker_ids:
        return {"count": 0}

    # 解説: 退会済みユーザー（status='deleted'）をカウントから除外する（返いいね・マッチが不可能なため件数が永遠に残る問題を防ぐ）
    profiles_res = (
        supabase.table("profiles")
        .select("id, status")
        .in_("id", liker_ids)
        .execute()
    )
    deleted_ids: set[str] = {
        p["id"] for p in (profiles_res.data or []) if p.get("status") == "deleted"
    }
    liker_ids = [lid for lid in liker_ids if lid not in deleted_ids]

    return {"count": len(liker_ids)}


# 解説: GET /api/likes/received = 自分が受け取ったいいね一覧を返す
# 解説: for_match_tab=True の場合は「今はいい」で非表示にしたものを除外する
@router.get("/received", response_model=list[LikerItem])
async def get_received_likes(
    current_user: User = Depends(get_active_user),
    # 解説: Query(False) = クエリパラメータ。?for_match_tab=true で有効化できる
    for_match_tab: bool = Query(False),
) -> list[LikerItem]:
    my_id = str(current_user.id)

    try:
        # 解説: 自分が approved かどうかを確認する
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
        # @copy CRO-error-api-like-approval-01 Lv1
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="承認済みのアカウントが必要です")

    # 解説: 受け取ったいいね一覧を新しい順・最大50件で取得する
    q = (
        supabase.table("likes")
        .select("liker_id, receiver_read_at")
        .eq("liked_id", my_id)
        .order("created_at", desc=True)
        .limit(50)
    )
    # 解説: マッチタブ用の場合は「今はいい」で非表示にしていないものだけ取得
    if for_match_tab:
        q = q.eq("dismissed_from_match", False)
    likes_res = q.execute()

    likes_data = likes_res.data or []
    # 解説: {liker_id: is_new} の辞書を作る（receiver_read_at が NULL = 未読 = True）
    liker_is_new: dict[str, bool] = {
        row["liker_id"]: row.get("receiver_read_at") is None
        for row in likes_data
    }
    liker_ids = list(liker_is_new.keys())
    if not liker_ids:
        return []

    # マッチ済みを除外
    # 解説: 既にマッチしている相手はいいね一覧から除外する（マッチ一覧で表示するため）
    matches_res = (
        supabase.table("matches")
        .select("user_a_id, user_b_id")
        .or_(f"user_a_id.eq.{my_id},user_b_id.eq.{my_id}")
        .execute()
    )
    matched_ids: set[str] = set()
    for row in (matches_res.data or []):
        # 解説: 自分以外の方が「相手」なので、user_a と user_b のうち自分でない方を取る
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

    # 解説: フィルタ済みの liker_ids のプロフィールを一括取得する
    profiles_res = (
        supabase.table("profiles")
        .select("id, name, year, faculty, profile_image_path, status")
        .in_("id", liker_ids)
        .execute()
    )

    result: list[LikerItem] = []
    for p in (profiles_res.data or []):
        # profile_image_path は approved 写真のみ不変条件（W1〜W4 で担保・[8.3]）
        is_deleted = p.get("status") == "deleted"
        path: str | None = p.get("profile_image_path") if not is_deleted else None
        # 解説: 画像パスがあれば署名付き URL に変換する（なければ None）
        result.append(LikerItem(
            id=p["id"],
            name=None if is_deleted else p.get("name"),
            year=None if is_deleted else p.get("year"),
            faculty=None if is_deleted else p.get("faculty"),
            avatar_url=get_signed_image_url(path) if path else None,
            is_new=liker_is_new.get(p["id"], False),
            is_deleted=is_deleted,
        ))

    return result


# 解説: POST /api/likes/dismiss/{liker_id} = マッチタブからいいねを非表示にする
@router.post("/dismiss/{liker_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("30/minute")
async def dismiss_like(
    request: Request,
    liker_id: str,
    current_user: User = Depends(get_active_user),
) -> Response:
    """マッチタブの「今はいい」でいいねを永続的に非表示にする"""
    user_id = str(current_user.id)

    # 解説: 対象のいいねが存在するか確認する
    like_res = (
        supabase.table("likes")
        .select("liker_id")
        .eq("liker_id", liker_id)
        .eq("liked_id", user_id)
        .limit(1)
        .execute()
    )
    # 解説: いいねが存在しなければ 204（冪等な操作なのでエラーにしない）
    if not like_res.data:
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    # 解説: dismissed_from_match=True で非表示フラグを立て、receiver_read_at も更新する
    supabase.table("likes").update({
        "dismissed_from_match": True,
        "receiver_read_at": datetime.now(timezone.utc).isoformat(),
    }).eq("liker_id", liker_id).eq("liked_id", user_id).execute()

    return Response(status_code=status.HTTP_204_NO_CONTENT)


# 解説: POST /api/likes/received/confirm = 受信いいねを一括既読にする
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

    # 解説: approved でなければ何もしない（正常に return する）
    if not me_res.data or me_res.data.get("status") != "approved":
        return

    try:
        # 解説: receiver_read_at が NULL（未読）のいいねに現在時刻を入れて既読にする
        supabase.table("likes").update(
            {"receiver_read_at": datetime.now(timezone.utc).isoformat()}
        ).eq("liked_id", my_id).is_("receiver_read_at", "null").execute()
    except Exception:
        pass
