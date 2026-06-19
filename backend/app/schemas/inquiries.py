# 解説: このファイルは「問い合わせ（お問い合わせ）API」で使う Pydantic スキーマを定義する。
# 解説: 呼ばれる場所: backend/app/routers/inquiries.py でインポートして使う
# 解説: admin.py にも同名クラスがある（InquiryItem）が、こちらはユーザー向け（admin_note 非公開）

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# 解説: InquiryCreateRequest = 問い合わせ作成リクエスト本文（カテゴリ・件名・本文）
class InquiryCreateRequest(BaseModel):
    # 解説: category = 問い合わせ種別（5択）。pattern = Pydantic の列挙値バリデーション
    category: str = Field(pattern="^(bug|feature|account|report|other)$")
    subject: str = Field(min_length=1, max_length=100)
    body: str = Field(min_length=1, max_length=2000)


# 解説: InquiryUserItem = ユーザーが自分の問い合わせを参照する用（admin_note は含まない）
class InquiryUserItem(BaseModel):
    """ユーザー自身が見る用（admin_note は含まない）"""
    id: UUID
    category: str
    subject: str
    body: str
    # 解説: status = unread / read / replied / closed
    status: str
    # 解説: admin_reply = 管理者からの返信（replied になると表示される）
    admin_reply: Optional[str] = None
    replied_at: Optional[datetime] = None
    created_at: datetime


# 解説: InquiryItem = 管理者が見る問い合わせ1件（全フィールド・user_id・admin_note 含む）
class InquiryItem(BaseModel):
    """管理者用（全フィールド）"""
    id: UUID
    user_id: UUID
    # 解説: user_email / user_name は routers/admin.py で profiles テーブルから付加する
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    category: str
    subject: str
    body: str
    status: str
    admin_reply: Optional[str] = None
    # 解説: admin_note = 管理者内部メモ（ユーザーには表示しない）
    admin_note: Optional[str] = None
    replied_at: Optional[datetime] = None
    replied_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
