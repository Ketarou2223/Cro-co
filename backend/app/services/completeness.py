"""充実度スコア（いいね経済の中核）。
SSoT は本ファイルと frontend/src/lib/completeness.ts の二重実装。
数式を変える時は必ず両方を同時に変更すること。
スコア = 写真(最大15) + 自己紹介(最大25) + 雑多(最大60) = 最大100。"""

MISC_FIELDS: tuple[str, ...] = (
    "height_cm", "body_type", "blood_type", "sibling_rank", "languages",
    "campus", "housing", "commute_time", "commute_means", "second_lang",
    "marriage_intent", "preferred_age_band", "drinking", "smoking", "mbti",
    "hometown", "free_slots",
)
_ARRAY_MISC: frozenset[str] = frozenset({"languages", "commute_means"})

BIO_FULL_LEN = 350  # この文字数で bio 満点(25)
PHOTO_CAP = 4       # 4枚で写真満点(15)・以降加算なし


def _is_filled(field: str, value) -> bool:
    if value is None:
        return False
    if field in _ARRAY_MISC:
        return isinstance(value, list) and len(value) > 0
    if isinstance(value, str):
        return value.strip() != ""
    return True  # height_cm(smallint) 等


def _photo_points(photo_count: int) -> float:
    # 1枚=0 / 2枚=5 / 3枚=10 / 4枚以上=15
    return max(0, min(photo_count, PHOTO_CAP) - 1) * 5.0


def _bio_points(bio_len: int) -> float:
    # 25 * (len/350)^1.5（350字で頭打ち25）
    ratio = min(bio_len, BIO_FULL_LEN) / BIO_FULL_LEN
    return 25.0 * (ratio ** 1.5)


def compute_completeness(profile: dict, photo_count: int) -> dict:
    """profile: profiles 行の dict。photo_count: 本人の profile_images 件数（rejected 除く）。
    戻り値: score(0-100 float) と内訳・未入力雑多リスト（伸び幅アドバイス用）。"""
    bio_len = len((profile.get("bio") or "").strip())
    filled = sum(1 for f in MISC_FIELDS if _is_filled(f, profile.get(f)))
    unfilled = [f for f in MISC_FIELDS if not _is_filled(f, profile.get(f))]

    photo_pts = _photo_points(photo_count)
    bio_pts = _bio_points(bio_len)
    misc_pts = 60.0 * filled / len(MISC_FIELDS)
    score = photo_pts + bio_pts + misc_pts  # 0-100

    return {
        "score": round(score, 1),
        "photo_count": photo_count,
        "photo_points": round(photo_pts, 1),
        "bio_length": bio_len,
        "bio_points": round(bio_pts, 1),
        "misc_filled": filled,
        "misc_total": len(MISC_FIELDS),
        "misc_points": round(misc_pts, 1),
        "unfilled_misc": unfilled,
    }
