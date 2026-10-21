# Clause review output — pilot

This pilot accepts pasted contract **text**, not a DOCX/PDF file.

Required inputs: `text` (max 200,000 characters), `party_role` (`buyer` or `seller`).

Output:
- `party_role`: perspective of review
- `status`: `draft_triage_only`
- `clause_count`: count of detected text segments
- `findings[]`: topic, clause_id, source excerpt, general English drafting recommendation, Persian human-review note
- `topics_not_detected[]`: topics with no keyword match; not a claim of absence
- `warning`: scope and limitations

Use `from clause_review import review_clauses` from `agent/`. The module is not exposed as a web endpoint and performs no writes, email sends or LLM calls.

Before use on real contracts, implement secure file handling, clause-number validation, source citations, approval flow and expert review. Generic recommendation text is NOT a ready-to-sign amendment.
