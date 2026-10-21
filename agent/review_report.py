"""Deterministic bilingual Markdown report from read-only clause triage."""
from __future__ import annotations

from clause_review import review_clauses

FA_TOPICS = {
    "payment": "پرداخت و تضمین‌ها",
    "quality": "کیفیت، بازرسی و ریجکت",
    "delivery": "حمل، تحویل و دموراژ",
    "force_majeure": "فورس‌ماژور و تعلیق",
    "dispute": "حل اختلاف و داوری",
}


def _cell(value: str) -> str:
    return str(value).replace("|", "\\|").replace("\r", " ").replace("\n", " ").strip()


def build_markdown_report(text: str, party_role: str, document_id: str = "UNSPECIFIED") -> str:
    """Draft for human review only; no external actions or files created."""
    if not isinstance(document_id, str) or len(document_id) > 120:
        raise ValueError("invalid document_id")
    report = review_clauses(text, party_role)
    rows = [
        "# گزارش غربالگری اولیه قرارداد",
        "",
        f"**شناسه سند:** {_cell(document_id)}",
        f"**موضع شرکت:** {'خریدار' if party_role == 'buyer' else 'فروشنده'}",
        "**وضعیت:** پیش‌نویس برای بررسی کارشناس؛ فاقد تأیید حقوقی",
        "",
        "| شماره بند | موضوع | وضعیت | پیشنهاد عمومی انگلیسی |",
        "|---|---|---|---|",
    ]
    for item in report["findings"]:
        rows.append(
            f"| {_cell(item['clause_id'])} | {_cell(FA_TOPICS[item['topic']])} "
            f"| نیازمند بررسی | {_cell(item['recommendation_en'])} |"
        )
    rows.extend(["", "## موضوعاتی که در غربالگری شناسایی نشدند"])
    for topic in report["topics_not_detected"]:
        rows.append(f"- {FA_TOPICS[topic]} — بررسی دستی ضروری است")
    rows.extend([
        "",
        "## محدودیت‌ها",
        "وجود کلیدواژه به معنی کافی بودن بند نیست. شماره‌گذاری و متن کامل قرارداد باید با اصل سند تطبیق داده شود.",
        "این گزارش اصلاحیه قراردادی آماده امضا، توصیه حقوقی یا مجوز ارسال مکاتبه نیست.",
    ])
    return "\n".join(rows) + "\n"
