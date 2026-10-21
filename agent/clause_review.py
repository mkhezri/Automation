"""Read-only clause-level contract review prototype.

No LLM calls, no file I/O, no external effects. This is a *triage* tool.
"""
from __future__ import annotations

import re
from dataclasses import asdict, dataclass
from contract_review import RULES


@dataclass(frozen=True)
class ClauseFinding:
    topic: str
    clause_id: str
    clause_text: str
    recommendation_en: str
    note_fa: str
    status: str


RECOMMENDATIONS = {
    "payment": "Specify documentary payment triggers, deadlines, acceptable guarantees, and remedies for non-performance.",
    "quality": "Define binding specifications, inspection method, sampling, umpire procedure, rejection thresholds, and settlement adjustments.",
    "delivery": "State Incoterms edition, named ports, laycan, NOR, demurrage allocation, and delivery evidence.",
    "force_majeure": "Define qualifying events, notice, mitigation, suspension, termination threshold, and allocation of losses.",
    "dispute": "Specify governing law, arbitration institution/rules, seat, language, and enforcement arrangements.",
}


def split_clauses(text: str) -> list[tuple[str, str]]:
    """Split only on explicit line-start clause numbering; preserve unnumbered preamble."""
    if not isinstance(text, str) or not text.strip() or len(text) > 200_000:
        raise ValueError("text must contain 1 to 200000 characters")
    marker = re.compile(r"(?m)^\s*(?:CLAUSE\s+|ARTICLE\s+|ماده\s+)?(\d+(?:\.\d+){0,3})[.)]?\s*[:\-–]?\s+(?=\S)", re.I)
    starts = list(marker.finditer(text))
    if not starts:
        return [("unidentified", text.strip())]
    out = []
    if text[:starts[0].start()].strip():
        out.append(("preamble", text[:starts[0].start()].strip()))
    for i, m in enumerate(starts):
        end = starts[i + 1].start() if i + 1 < len(starts) else len(text)
        out.append((m.group(1), text[m.start():end].strip()))
    return out


def review_clauses(text: str, party_role: str) -> dict:
    if party_role not in {"buyer", "seller"}:
        raise ValueError("party_role must be buyer or seller")
    clauses = split_clauses(text)
    findings = []
    covered = set()
    for clause_id, clause_text in clauses:
        for code, _severity, _title, _rationale, pattern in RULES:
            if re.search(pattern, clause_text, re.IGNORECASE):
                covered.add(code)
                findings.append(ClauseFinding(
                    topic=code,
                    clause_id=clause_id,
                    clause_text=clause_text[:1000],
                    recommendation_en=RECOMMENDATIONS[code],
                    note_fa="موضوع شناسایی شد؛ کفایت حقوقی و تجاری بند باید توسط کارشناس بررسی شود.",
                    status="human_review_required",
                ))
    return {
        "party_role": party_role,
        "status": "draft_triage_only",
        "clause_count": len(clauses),
        "findings": [asdict(f) for f in findings],
        "topics_not_detected": sorted(set(RECOMMENDATIONS) - covered),
        "warning": "Pattern matching is not a legal opinion; clause boundaries and findings require manual verification.",
    }
