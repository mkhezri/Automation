"""Read-only, deterministic first-pass contract screening for ECC pilot.

This module does not call an LLM, read external files, or send data anywhere.
Findings are prompts for human review, not legal opinions.
"""
from dataclasses import dataclass, asdict
import re


@dataclass(frozen=True)
class Finding:
    code: str
    severity: str
    title: str
    rationale: str
    evidence: str


RULES = (
    ("payment", "high", "Payment terms", "Confirm payment triggers, guarantees and documentary conditions.", r"\b(?:payment|advance|prepayment|deposit|settlement)\b|پرداخت|پیش\s*پرداخت"),
    ("quality", "high", "Quality and rejection", "Verify specifications, inspection, bonus/penalty and rejection rights.", r"\b(?:rejection|reject|quality|inspection|sgs|ciq|penalty|bonus)\b|کیفیت|آنالیز|ریجکت"),
    ("delivery", "medium", "Delivery and logistics", "Confirm Incoterms, loading/discharge, laycan and demurrage allocation.", r"\b(?:fob|cfr|cif|laycan|demurrage|loading|discharge|delivery)\b|تحویل|بارگیری"),
    ("force_majeure", "high", "Force majeure", "Check notice, suspension, mitigation, termination and war-related events.", r"\b(?:force\s+majeure|war|blockade|sanction)\b|فورس\s*ماژور|جنگ|محاصره"),
    ("dispute", "medium", "Dispute resolution", "Check governing law, forum, arbitration rules and language.", r"\b(?:arbitration|governing\s+law|jurisdiction|dispute)\b|داوری|قانون\s*حاکم"),
)


def review_contract(text: str, party_role: str) -> dict:
    if party_role not in {"buyer", "seller"}:
        raise ValueError("party_role must be buyer or seller")
    if not isinstance(text, str) or not text.strip() or len(text) > 200_000:
        raise ValueError("text must contain 1 to 200000 characters")
    findings = []
    for code, severity, title, rationale, pattern in RULES:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            start = max(0, match.start() - 65)
            end = min(len(text), match.end() + 95)
            evidence = text[start:end].replace("\n", " ").strip()
            findings.append(Finding(code, "review", title, rationale, evidence))
        else:
            findings.append(Finding(code, severity, title, "Not detected in supplied text; verify manually. " + rationale, ""))
    return {
        "party_role": party_role,
        "status": "preliminary_screening_only",
        "source_length": len(text),
        "findings": [asdict(f) for f in findings],
        "disclaimer": "Keyword screening only. Presence of a clause does not establish adequacy; absence is not proof it is missing.",
    }
