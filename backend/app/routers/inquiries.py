import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from supabase_auth.types import User
from postgrest.exceptions import APIError

from app.auth.active_user import get_active_user
from app.core.config import settings
from app.core.email import send_inquiry_notification_to_admin
from app.core.limiter import limiter
from app.core.supabase_client import supabase
from app.schemas.inquiries import InquiryCreateRequest, InquiryUserItem

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/inquiries", tags=["inquiries"])


@router.post("/", status_code=status.HTTP_201_CREATED, response_model=InquiryUserItem)
@limiter.limit("5/hour")
async def create_inquiry(
    request: Request,
    body: InquiryCreateRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_active_user),
) -> InquiryUserItem:
    """問い合わせを送信"""
    try:
        res = supabase.table("inquiries").insert({
            "user_id": str(current_user.id),
            "category": body.category,
            "subject": body.subject,
            "body": body.body,
        }).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="送信に失敗しました")

        background_tasks.add_task(
            send_inquiry_notification_to_admin,
            admin_emails=settings.admin_emails,
            category=body.category,
            subject=body.subject,
            user_email=current_user.email or "",
        )

        return InquiryUserItem(**res.data[0])
    except HTTPException:
        raise
    except APIError as e:
        logger.error("問い合わせ作成失敗: %s", e.message)
        raise HTTPException(status_code=500, detail="送信に失敗しました")


@router.get("/me", response_model=list[InquiryUserItem])
async def list_my_inquiries(
    current_user: User = Depends(get_active_user),
) -> list[InquiryUserItem]:
    """自分の問い合わせ一覧"""
    try:
        res = (supabase.table("inquiries")
            .select("id, category, subject, body, status, admin_reply, replied_at, created_at")
            .eq("user_id", str(current_user.id))
            .order("created_at", desc=True)
            .execute())
        return [InquiryUserItem(**r) for r in (res.data or [])]
    except APIError:
        return []
