from collections import Counter
from datetime import date, datetime
from zoneinfo import ZoneInfo

from app.core.supabase_client import supabase

_JST = ZoneInfo("Asia/Tokyo")


def jst_today() -> date:
    return datetime.now(_JST).date()


def jst_epoch_day() -> int:
    return jst_today().toordinal()


def fetch_active_questions() -> list[dict]:
    res = (
        supabase.table("daily_questions")
        .select("id, body, options, display_order")
        .eq("is_active", True)
        .order("display_order")
        .execute()
    )
    return res.data or []


def pick_today_question(active_list: list[dict]) -> dict | None:
    if not active_list:
        return None
    return active_list[jst_epoch_day() % len(active_list)]


def build_stats(question: dict, answer_date: date) -> dict:
    """question_id + 日付で daily_answers を集計して stats dict を返す。"""
    rows_res = (
        supabase.table("daily_answers")
        .select("choice")
        .eq("question_id", question["id"])
        .eq("answer_date", answer_date.isoformat())
        .execute()
    )
    counts = Counter(r["choice"] for r in (rows_res.data or []))
    total = sum(counts.values())
    option_keys = [opt["key"] for opt in question["options"]]
    raw_counts = {k: counts.get(k, 0) for k in option_keys}
    percentages = {
        k: (round(raw_counts[k] / total * 100) if total > 0 else 0)
        for k in option_keys
    }
    return {"total": total, "counts": raw_counts, "percentages": percentages}
