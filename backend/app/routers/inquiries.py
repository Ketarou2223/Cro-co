# 解説: このファイルは「お問い合わせ機能」の API エンドポイントを定義する。
# 解説: 呼ばれる場所: main.py で app.include_router(inquiries.router) として登録される
# 解説: 呼ぶ先:
#   - Supabase の inquiries テーブル（INSERT / SELECT）
#   - email.py の send_inquiry_notification_to_admin（管理者へのメール通知）
# 解説: エンドポイント:
#   POST /api/inquiries/    → 問い合わせを送信する（認証必須・5回/時間 レート制限）
#   GET  /api/inquiries/me  → 自分の問い合わせ一覧を取得する（認証必須）
#
# 解説: 使用ライブラリ:
#   BackgroundTasks = レスポンスを返した後に非同期でタスクを実行する仕組み（メール送信に使う）
#   Request = slowapi のレート制限に必要（キーの取得に使う）

import logging

# 解説: BackgroundTasks = レスポンス後にバックグラウンドで処理を実行するクラス
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from supabase_auth.types import User
from postgrest.exceptions import APIError

from app.auth.active_user import get_active_user
from app.core.config import settings
# 解説: 管理者にメール通知を送る関数
from app.core.email import send_inquiry_notification_to_admin
from app.core.limiter import limiter
from app.core.supabase_client import supabase
# 解説: InquiryCreateRequest = 問い合わせ作成時のリクエスト body のスキーマ
# 解説: InquiryUserItem = 問い合わせ1件のレスポンス形式（ユーザー向け）
from app.schemas.inquiries import InquiryCreateRequest, InquiryUserItem

logger = logging.getLogger(__name__)
# 解説: prefix="/api/inquiries" = このルーターの全 URL は /api/inquiries で始まる
router = APIRouter(prefix="/api/inquiries", tags=["inquiries"])


# 解説: POST /api/inquiries/ = 問い合わせを新規送信するエンドポイント
# 解説: status_code=201 = 作成成功を表す HTTP ステータスコード（Created）
@router.post("/", status_code=status.HTTP_201_CREATED, response_model=InquiryUserItem)
# 解説: @limiter.limit("5/hour") = 同一ユーザーから1時間に5回までしか送れない
@limiter.limit("5/hour")
async def create_inquiry(
    # 解説: request = slowapi のレート制限キー取得に必要（デコレータが暗黙的に使う）
    request: Request,
    # 解説: body = リクエストボディ。FastAPI が InquiryCreateRequest の形式で自動パースする
    body: InquiryCreateRequest,
    # 解説: background_tasks = レスポンス後に実行するタスクを登録するオブジェクト
    background_tasks: BackgroundTasks,
    # 解説: current_user = 認証済みのアクティブユーザー（Depends で自動取得）
    current_user: User = Depends(get_active_user),
) -> InquiryUserItem:
    """問い合わせを送信"""
    try:
        # 解説: inquiries テーブルに問い合わせを1件 INSERT する
        res = supabase.table("inquiries").insert({
            "user_id": str(current_user.id),
            "category": body.category,
            "subject": body.subject,
            "body": body.body,
        }).execute()
        # 解説: res.data が空 = INSERT が失敗した（DB のポリシー違反等）
        if not res.data:
            raise HTTPException(status_code=500, detail="送信に失敗しました")

        # 解説: レスポンスを返した後にバックグラウンドで管理者へのメール通知を送る
        background_tasks.add_task(
            send_inquiry_notification_to_admin,
            admin_emails=settings.admin_emails,
            category=body.category,
            subject=body.subject,
            # 解説: current_user.email が None の場合は空文字に変換する
            user_email=current_user.email or "",
        )

        # 解説: 挿入された行（res.data[0]）を InquiryUserItem に変換して返す
        return InquiryUserItem(**res.data[0])
    # 解説: HTTPException は上で raise したものをそのまま伝播させる
    except HTTPException:
        raise
    # 解説: Supabase の DB エラー（APIError）はユーザー向けのメッセージに変換して返す
    except APIError as e:
        logger.error("問い合わせ作成失敗: %s", e.message)
        raise HTTPException(status_code=500, detail="送信に失敗しました")


# 解説: GET /api/inquiries/me = 自分が送った問い合わせ一覧を返すエンドポイント
@router.get("/me", response_model=list[InquiryUserItem])
async def list_my_inquiries(
    current_user: User = Depends(get_active_user),
) -> list[InquiryUserItem]:
    """自分の問い合わせ一覧"""
    try:
        # 解説: inquiries テーブルから自分の問い合わせを新しい順に全件取得する
        res = (supabase.table("inquiries")
            .select("id, category, subject, body, status, admin_reply, replied_at, created_at")
            .eq("user_id", str(current_user.id))
            # 解説: .order("created_at", desc=True) = 新しい順（降順）にソート
            .order("created_at", desc=True)
            .execute())
        # 解説: 取得した各行を InquiryUserItem に変換してリストで返す
        return [InquiryUserItem(**r) for r in (res.data or [])]
    # 解説: DB エラーの場合は空リストを返す（問い合わせが見えなくなるだけでアプリは止まらない）
    except APIError:
        return []
