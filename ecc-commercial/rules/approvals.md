# ECC Pilot — Human approval rules

Applies to all future agents and skills in this repository.

1. READ: access only documents explicitly shared for the task. Keep original source references.
2. DRAFT: AI may draft analyses, risk reports and correspondence. Label uncertain or missing facts.
3. REVIEW: a human must inspect recipient, attachments, facts, amounts, legal clauses and source material.
4. APPROVE: sending external emails, modifying contractual terms, payments, deleting records, or publishing files requires explicit, specific approval at execution time.
5. EXECUTE: approval must be verified by server-side identity and recorded in an audit trail; never rely on a UI-only confirmation or an AI assertion.
6. LOG: record timestamp, actor, action, target and document version; never log API keys or full confidential content.
7. DENY BY DEFAULT: no approval or unavailable approval service means no external side effect.
8. DEMO MARKET DATA: historical mock prices are never presented as current or used for commercial decisions.

This is policy documentation, not an implemented authorization service.
