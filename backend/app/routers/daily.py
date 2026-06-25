from datetime import date, datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Request
from postgrest.exceptions import APIError
from pydantic import BaseModel
from supabase_auth.types import User

from app.auth.approved_user import get_approved_user
from app.core.limiter import limiter
from app.core.supabase_client import supabase

router = APIRouter(prefix="/api/daily", tags=["daily"])

_JST = ZoneInfo("Asia/Tokyo")


def jst_today() -> date:
    return datetime.now(_JST).date()


def jst_epoch_day() -> int:
    return jst_today().toordinal()


def pick_today_question(active_list: list[dict]) -> dict | None:
    if not active_list:
        return None
    return active_list[jst_epoch_day() % len(active_list)]


class AnswerBody(BaseModel):
    choice: str


def _fetch_active_questions() -> list[dict]:
    res = (
        supabase.table("daily_questions")
        .select("id, body, options, display_order")
        .eq("is_active", True)
        .order("display_order")
        .execute()
    )
    return res.data or []


@router.get("/today")
@limiter.limit("60/min")
async def get_today(
    request: Request,
    current_user: User = Depends(get_approved_user),
) -> dict:
    my_id = str(current_user.id)
    today_q = pick_today_question(_fetch_active_questions())
    if today_q is None:
        return {"question": None, "answered": False, "my_choice": None}

    ans_res = (
        supabase.table("daily_answers")
        .select("choice")
        .eq("user_id", my_id)
        .eq("answer_date", jst_today().isoformat())
        .execute()
    )
    rows = ans_res.data or []
    answered = len(rows) > 0
    return {
        "question": {
            "id": today_q["id"],
            "body": today_q["body"],
            "options": today_q["options"],
        },
        "answered": answered,
        "my_choice": rows[0]["choice"] if answered else None,
    }


@router.post("/answer")
@limiter.limit("10/min")
async def post_answer(
    body: AnswerBody,
    request: Request,
    current_user: User = Depends(get_approved_user),
) -> dict:
    my_id = str(current_user.id)
    today_q = pick_today_question(_fetch_active_questions())

    if today_q is None:
        raise HTTPException(status_code=400, detail="本日の質問がありません")

    valid_keys = {opt["key"] for opt in today_q["options"]}
    if body.choice not in valid_keys:
        raise HTTPException(status_code=400, detail="選択肢が正しくありません")

    try:
        supabase.table("daily_answers").insert({
            "user_id": my_id,
            "question_id": today_q["id"],
            "choice": body.choice,
            "answer_date": jst_today().isoformat(),
        }).execute()
    except APIError as e:
        # 23505 = unique_violation。当日の重複回答（UNIQUE user_id+answer_date）は409。
        if e.code == "23505":
            raise HTTPException(status_code=409, detail="本日は回答済みです")
        raise HTTPException(status_code=500, detail="回答の保存に失敗しました")

    return {"answered": True, "my_choice": body.choice}
