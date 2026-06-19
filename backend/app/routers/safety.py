# 解説: このファイルは「安全機能」（ブロック / 通報 / 非表示）の API エンドポイントを定義する。
# 解説: 呼ばれる場所: main.py で app.include_router(safety.router) として登録される
# 解説: エンドポイント一覧:
#   POST   /api/safety/block             → ユーザーをブロックする（解除不可）
#   DELETE /api/safety/block/{id}        → ブロック解除（常に 403: 解除不可仕様）
#   POST   /api/safety/report            → ユーザーを通報する（自動で非表示にもなる）
#   POST   /api/safety/hide              → ユーザーを非表示にする（おすすめから除外）
#   DELETE /api/safety/hide/{id}         → 非表示を解除する
#   GET    /api/safety/blocks            → ブロックリストを返す
#   GET    /api/safety/hides             → 非表示リストを返す
#   GET    /api/safety/blocked-ids       → ブロック済み ID リストを返す（フロント用）
#   GET    /api/safety/hidden-ids        → 非表示 ID リストを返す（フロント用）
# 解説: 「ブロック」= 双方向で完全に見えなくなる。解除不可（仕様）
# 解説: 「非表示」= 自分のおすすめ・検索から除外するだけ。解除可能
# 解説: 「通報」= 管理者が確認する。通報と同時に相手を自動で非表示にする

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from supabase_auth.types import User
from postgrest.exceptions import APIError

from app.auth.active_user import get_active_user
from app.core.image_utils import get_signed_image_url
from app.core.limiter import limiter
from app.core.supabase_client import supabase
# 解説: ws_manager = ブロック時に相手との WebSocket 接続を強制切断するために使う
from app.core.ws_manager import manager as ws_manager
from app.schemas.safety import (
    REPORT_REASONS,
    BlockRequest,
    BlockedUserItem,
    HiddenUserItem,
    HideRequest,
    ReportRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/safety", tags=["safety"])


# 解説: 承認済みユーザーかどうかを確認するヘルパ（安全機能は approved のみ使える）
def _require_approved(current_user: User) -> None:
    """自分のステータスが approved でなければ 403 を raise する。"""
    try:
        res = (
            supabase.table("profiles")
            .select("status")
            .eq("id", str(current_user.id))
            .single()
            .execute()
        )
    except APIError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="承認済みユーザーのみ操作できます")
    if not res.data or res.data.get("status") != "approved":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="承認済みユーザーのみ操作できます")


# ---------- Block ----------

# 解説: POST /api/safety/block = 指定ユーザーをブロックする
@router.post("/block", status_code=status.HTTP_204_NO_CONTENT)
# 解説: 20回/分 = 連打防止
@limiter.limit("20/minute")
async def block_user(
    request: Request,
    body: BlockRequest,
    current_user: User = Depends(get_active_user),
) -> None:
    _require_approved(current_user)
    me = str(current_user.id)
    target = str(body.blocked_id)

    # 解説: 自分自身はブロックできない
    if me == target:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="自分自身をブロックできません")

    # 冪等: 既にブロック済みなら何もしない
    # 解説: 冪等（べきとう）= 何回実行しても同じ結果になること。2回押しても1回と同じ
    existing = (
        supabase.table("blocks")
        .select("blocker_id")
        .eq("blocker_id", me)
        .eq("blocked_id", target)
        .limit(1)
        .execute()
    )
    if existing.data:
        return

    # 解説: blocks テーブルに blocker_id と blocked_id を INSERT する
    supabase.table("blocks").insert({"blocker_id": me, "blocked_id": target}).execute()

    # 互いにマッチしていたら matches を削除（messages は CASCADE で連動削除）
    # ブロック自体（blocks レコード）は成功済みのため、match 削除失敗時は巻き戻し不要。
    # ただし match が孤立すると blocks 両側 API フィルタで除外されるため表示漏洩は防げるが、
    # DB 上の不整合として残るため fail-open を許容せずログに記録する。
    try:
        # 解説: 自分と相手が user_a / user_b の組み合わせで一致するマッチを探す
        match_res = (
            supabase.table("matches")
            .select("id")
            .or_(
                f"and(user_a_id.eq.{me},user_b_id.eq.{target}),and(user_a_id.eq.{target},user_b_id.eq.{me})"
            )
            .limit(1)
            .execute()
        )
        if match_res.data:
            match_id = match_res.data[0]["id"]
            # 解説: マッチを削除する（messages は ON DELETE CASCADE で連動削除）
            supabase.table("matches").delete().eq("id", match_id).execute()
            # ブロック完了と同時に WS 接続も強制切断（タイピング通知の流出を防ぐ）
            # 解説: disconnect_all = そのマッチの WebSocket 接続を全て強制切断する
            await ws_manager.disconnect_all(match_id)
    except Exception as e:
        logger.error("ブロック後の match 削除に失敗（孤立 match の可能性）blocker=%s blocked=%s: %s", me, target, e)


# 解説: DELETE /api/safety/block/{blocked_id} = ブロック解除 API（常に 403 を返す仕様）
# 解説: エンドポイントは残すが常に 403。解除は管理者が DB を直接操作して行う
@router.delete("/block/{blocked_id}", status_code=status.HTTP_403_FORBIDDEN)
async def unblock_user(
    blocked_id: UUID,
    current_user: User = Depends(get_active_user),
) -> dict:
    # ブロックは解除不可の仕様。誤ブロックはサポート（管理者による DB 直接操作）で対応。
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="ブロックは取り消せません。誤ブロックの場合はサポートまでご連絡ください。",
    )


# ---------- Report ----------

# 解説: POST /api/safety/report = ユーザーを通報する（10回/分）
@router.post("/report", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("10/minute")
async def report_user(
    request: Request,
    body: ReportRequest,
    current_user: User = Depends(get_active_user),
) -> None:
    _require_approved(current_user)
    me = str(current_user.id)
    target = str(body.reported_id)

    if me == target:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="自分自身を通報できません")

    # 解説: REPORT_REASONS = 許可された通報理由のリスト（外れた値は 400 エラー）
    if body.reason not in REPORT_REASONS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="無効な通報理由です")

    try:
        # 解説: reports テーブルに通報を INSERT する
        supabase.table("reports").insert(
            {
                "reporter_id": me,
                "reported_id": target,
                "reason": body.reason,
                "detail": body.detail,
            }
        ).execute()
    except APIError as e:
        logger.error("通報の記録に失敗しました: %s", e.message)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="通報の記録に失敗しました",
        )

    # 通報したら自動的に非表示に（冪等）
    # 解説: 通報した相手を自動で非表示にする（おすすめに出ないようにする）
    try:
        # 解説: upsert = INSERT するが既に存在するなら何もしない（on_conflict 指定）
        supabase.table("hides").upsert(
            {"hider_id": me, "hidden_id": target},
            on_conflict="hider_id,hidden_id",
        ).execute()
    except Exception:
        pass


# ---------- Hide ----------

# 解説: POST /api/safety/hide = 指定ユーザーを非表示にする（おすすめ・検索から除外）
@router.post("/hide", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("30/minute")
async def hide_user(
    request: Request,
    body: HideRequest,
    current_user: User = Depends(get_active_user),
) -> None:
    _require_approved(current_user)
    me = str(current_user.id)
    target = str(body.hidden_id)

    if me == target:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="自分自身を非表示にできません")

    # 冪等: 既に非表示済みなら何もしない
    existing = (
        supabase.table("hides")
        .select("hider_id")
        .eq("hider_id", me)
        .eq("hidden_id", target)
        .limit(1)
        .execute()
    )
    if existing.data:
        return

    # 解説: hides テーブルに hider_id と hidden_id を INSERT する
    supabase.table("hides").insert({"hider_id": me, "hidden_id": target}).execute()


# 解説: DELETE /api/safety/hide/{hidden_id} = 非表示を解除する（30回/分）
@router.delete("/hide/{hidden_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("30/minute")
async def unhide_user(
    request: Request,
    hidden_id: UUID,
    current_user: User = Depends(get_active_user),
) -> None:
    _require_approved(current_user)
    me = str(current_user.id)
    # 解説: hider_id が自分かつ hidden_id が指定 ID のレコードを削除する
    supabase.table("hides").delete().eq("hider_id", me).eq("hidden_id", str(hidden_id)).execute()


# ---------- Query ----------

# 解説: GET /api/safety/blocks = 自分がブロックしたユーザーの一覧を返す（閲覧のみ・解除不可）
@router.get("/blocks", response_model=list[BlockedUserItem])
async def get_blocked_users(
    current_user: User = Depends(get_active_user),
) -> list[BlockedUserItem]:
    _require_approved(current_user)
    me = str(current_user.id)

    # 解説: 自分が blocker_id のレコードを全て取得する
    blocks_res = (
        supabase.table("blocks")
        .select("blocked_id")
        .eq("blocker_id", me)
        .execute()
    )

    blocked_ids = [row["blocked_id"] for row in (blocks_res.data or [])]
    if not blocked_ids:
        return []

    # 解説: ブロック相手のプロフィールを一括取得する（N+1 防止）
    profiles_res = (
        supabase.table("profiles")
        .select("id, name, profile_image_path")
        .in_("id", blocked_ids)
        .execute()
    )

    result: list[BlockedUserItem] = []
    for p in (profiles_res.data or []):
        path: str | None = p.get("profile_image_path")
        result.append(BlockedUserItem(
            id=p["id"],
            name=p.get("name"),
            avatar_url=get_signed_image_url(path) if path else None,
        ))

    return result


# 解説: GET /api/safety/hides = 自分が非表示にしたユーザーの一覧を返す
@router.get("/hides", response_model=list[HiddenUserItem])
async def get_hidden_users(
    current_user: User = Depends(get_active_user),
) -> list[HiddenUserItem]:
    _require_approved(current_user)
    me = str(current_user.id)

    # 解説: 自分が hider_id のレコードを新しい順に全て取得する
    hides_res = (
        supabase.table("hides")
        .select("hidden_id, created_at")
        .eq("hider_id", me)
        .order("created_at", desc=True)
        .execute()
    )

    hidden_ids = [row["hidden_id"] for row in (hides_res.data or [])]
    if not hidden_ids:
        return []

    # 解説: 非表示相手のプロフィールを一括取得する
    profiles_res = (
        supabase.table("profiles")
        .select("id, name, profile_image_path")
        .in_("id", hidden_ids)
        .execute()
    )

    # 解説: {id: profile行} の辞書を作る（並び順を保持するため）
    by_id = {p["id"]: p for p in (profiles_res.data or [])}

    # 解説: hidden_ids の順番（hides 取得時の順番）を保ってリストを組み立てる
    result: list[HiddenUserItem] = []
    for hid in hidden_ids:
        p = by_id.get(hid)
        if not p:
            continue
        path: str | None = p.get("profile_image_path")
        result.append(HiddenUserItem(
            id=p["id"],
            name=p.get("name"),
            avatar_url=get_signed_image_url(path) if path else None,
        ))

    return result


# 解説: GET /api/safety/blocked-ids = ブロック済み ID リストだけを返す（フロント用軽量版）
@router.get("/blocked-ids")
async def get_blocked_ids(
    current_user: User = Depends(get_active_user),
) -> dict[str, list[str]]:
    _require_approved(current_user)
    me = str(current_user.id)
    res = (
        supabase.table("blocks")
        .select("blocked_id")
        .eq("blocker_id", me)
        .execute()
    )
    return {"blocked_ids": [row["blocked_id"] for row in (res.data or [])]}


# 解説: GET /api/safety/hidden-ids = 非表示 ID リストだけを返す（フロント用軽量版）
@router.get("/hidden-ids")
async def get_hidden_ids(
    current_user: User = Depends(get_active_user),
) -> dict[str, list[str]]:
    _require_approved(current_user)
    me = str(current_user.id)
    res = (
        supabase.table("hides")
        .select("hidden_id")
        .eq("hider_id", me)
        .execute()
    )
    return {"hidden_ids": [row["hidden_id"] for row in (res.data or [])]}
