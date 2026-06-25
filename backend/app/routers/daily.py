from fastapi import APIRouter, Depends, HTTPException, Request
from postgrest.exceptions import APIError
from pydantic import BaseModel
from supabase_auth.types import User

from app.auth.approved_user import get_approved_user
from app.core.limiter import limiter
from app.core.supabase_client import supabase
from app.services.daily_logic import (
    build_stats,
    fetch_active_questions,
    jst_today,
    pick_today_question,
)

router = APIRouter(prefix="/api/daily", tags=["daily"])


class AnswerBody(BaseModel):
    choice: str


@router.get("/today")
@limiter.limit("60/min")
async def get_today(
    request: Request,
    current_user: User = Depends(get_approved_user),
) -> dict:
    my_id = str(current_user.id)
    today_q = pick_today_question(fetch_active_questions())
    if today_q is None:
        return {"question": None, "answered": False, "my_choice": None, "stats": None}

    today = jst_today()
    ans_res = (
        supabase.table("daily_answers")
        .select("choice")
        .eq("user_id", my_id)
        .eq("answer_date", today.isoformat())
        .execute()
    )
    rows = ans_res.data or []
    answered = len(rows) > 0
    stats = build_stats(today_q, today)

    return {
        "question": {
            "id": today_q["id"],
            "body": today_q["body"],
            "options": today_q["options"],
        },
        "answered": answered,
        "my_choice": rows[0]["choice"] if answered else None,
        "stats": stats,
    }


@router.post("/answer")
@limiter.limit("10/min")
async def post_answer(
    body: AnswerBody,
    request: Request,
    current_user: User = Depends(get_approved_user),
) -> dict:
    my_id = str(current_user.id)
    today_q = pick_today_question(fetch_active_questions())

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
