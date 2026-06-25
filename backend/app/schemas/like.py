# 解説: このファイルは「いいね API」で使う Pydantic スキーマを定義する。
# 解説: 呼ばれる場所: backend/app/routers/like.py でインポートして使う

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


# 解説: LikeCreateRequest = いいね送信リクエスト本文
class LikeCreateRequest(BaseModel):
    # 解説: liked_id = いいね対象のユーザー ID
    liked_id: UUID
    # 解説: via_footprint = True のとき「足跡経由のいいね」として扱う（在庫消費なし）
    via_footprint: bool = False


# 解説: LikeResponse = いいね送信後のレスポンス（マッチしたかどうかを含む）
class LikeResponse(BaseModel):
    liker_id: UUID
    liked_id: UUID
    created_at: datetime
    # 解説: is_match = True のとき双方がいいね済み = マッチ成立（MatchModal を表示するために使う）
    is_match: bool = False


# 解説: LikerItem = 自分に「いいね」した相手の一覧の1件分
class LikerItem(BaseModel):
    id: UUID
    name: Optional[str] = None
    year: Optional[int] = None
    faculty: Optional[str] = None
    # 解説: avatar_url = 署名付き URL（image_utils.get_signed_image_url() で生成）
    avatar_url: Optional[str] = None
    # 解説: is_new = True のとき「まだ確認していない新着いいね」として強調表示する
    is_new: bool = True
    # 解説: is_deleted = True のとき退会済みユーザー（name 等は非表示・「退会済み」と表示する）
    is_deleted: bool = False
    # 解説: blurred = True のとき avatar_url は None・フロントでプレースホルダーを表示する
    blurred: bool = False
