HUMANITIES = {"文学部", "人間科学部", "外国語学部", "法学部", "経済学部"}
SCIENCES = {"理学部", "医学部", "歯学部", "薬学部", "工学部", "基礎工学部"}


def classify(faculty: str | None) -> str | None:
    if not faculty:
        return None
    if faculty in HUMANITIES:
        return "humanities"
    if faculty in SCIENCES:
        return "sciences"
    return None  # 想定外の学部
