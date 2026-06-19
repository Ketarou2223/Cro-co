# 解説: このファイルは「学部名を文系 / 理系に分類する」ユーティリティを定義する。
# 解説: 呼ばれる場所: identity_hide.py（身バレ防止のため同じ系統の学部を除外するときに使う）
# 解説: 呼ぶ先: なし（外部依存なし・純粋な分類ロジックのみ）
# 解説: データの流れ: identity_hide.py → classify(faculty) → "humanities" / "sciences" / None

# 解説: 文系学部の集合（set）。in 演算子で O(1) の高速検索ができる（list より速い）
HUMANITIES = {"文学部", "人間科学部", "外国語学部", "法学部", "経済学部"}
# 解説: 理系学部の集合。HUMANITIES と合わせて阪大の全学部をカバーしている
SCIENCES = {"理学部", "医学部", "歯学部", "薬学部", "工学部", "基礎工学部"}


# 解説: 学部名を "humanities"（文系）/ "sciences"（理系）/ None（不明）に分類する関数
def classify(faculty: str | None) -> str | None:
    # 解説: faculty が None または空文字なら分類できないので None を返す
    if not faculty:
        return None
    # 解説: HUMANITIES の集合に含まれていれば文系として分類
    if faculty in HUMANITIES:
        return "humanities"
    # 解説: SCIENCES の集合に含まれていれば理系として分類
    if faculty in SCIENCES:
        return "sciences"
    # 解説: どちらにも当てはまらなければ None を返す（将来の新学部追加時も安全に動く）
    return None  # 想定外の学部
