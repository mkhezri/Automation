"""Offline, read-only contract triage pipeline.

No HTTP endpoints, outbound network calls, persistent storage, or email sending.
"""
from __future__ import annotations

from document_extract import extract_document_text
from clause_review import review_clauses
from review_report import build_markdown_report


def analyze_document_bytes(data: bytes, file_type: str, party_role: str, document_id: str = "UNSPECIFIED") -> dict:
    """Return a preliminary report and structured findings from an in-memory document."""
    if party_role not in {"buyer", "seller"}:
        raise ValueError("party_role must be buyer or seller")
    text = extract_document_text(data, file_type)
    screening = review_clauses(text, party_role)
    markdown = build_markdown_report(text, party_role, document_id)
    return {
        "status": "human_review_required",
        "document_id": document_id,
        "file_type": file_type,
        "extracted_characters": len(text),
        "screening": screening,
        "report_markdown": markdown,
        "warning": "Preliminary screening only; original document and clause boundaries require expert verification.",
    }
