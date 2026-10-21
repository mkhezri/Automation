# Contract Review — ECC Pilot

## Scope
Preliminary review of mining commodity purchase/sale contracts in Persian or English.

## Inputs
- Complete source contract text (no confidential real data during initial testing).
- Party role: `buyer` or `seller`.
- Source file identifier, contract version and date when available.

## Workflow
1. Identify the user's role and contract version.
2. Run read-only preliminary keyword screening (`agent/contract_review.py`) to highlight topics for review.
3. Human/LLM reviewer must check the **full actual clause** and provide exact clause number, original excerpt, risk, suggested amendment and unresolved questions.
4. Clearly separate documented facts from assumptions. Do not invent clauses, amounts, deadlines, parties or legal conclusions.
5. Never send email, approve contract, modify originals or commit financial obligations without explicit approval.

## Important limitations
- Current code is a **keyword screening prototype**, not a full legal contract review or file parser.
- Matching a term does not establish contractual protection; missing terms do not establish legal absence.
- No PDF/Word ingestion or external system connection has been implemented.
- Do not submit actual sensitive contracts until privacy and authorization controls are reviewed.
