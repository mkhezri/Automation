# ECC Commercial Knowledge — scope and governance (2026-10-22)

## Current operational priority (user-confirmed)
- **KAU SOK / foreign commercial:** Active priority is **purchase and resale of steel billets**. Other commodity purchasing is **paused** due to war-related and maritime blockade constraints; do not treat historical iron ore purchase patterns as current active workflows.
- **ZMC / domestic commercial:** Elevated priority for **sales, contracting/works, consulting, and mine-related commercial agreements**. Mining projects and their contract obligations remain distinct from KAU SOK.
- Preserve historical knowledge for reference, but label **historical vs active vs paused** and verify status before any proposed action.

## Sources and trust hierarchy
1. Signed original contracts, annexes, inspection/payment documents and official company Share: **primary evidence** (read only).
2. Authorized M3KH live case files and management decisions, via explicit file-level Viewer access: **case context and decisions**, not substitutes for originals.
3. Ava's reconciled status and temporary joint task register: **coordination/status**, not proof that M3KH Vault was synchronized.
4. Older drafts, examples and conversation summaries: **historical context**, never automatically promoted to binding policy.

Do not ingest the manager's personal/system/governance areas, entire M3KH root, or any unshared source. Do not assume Ava's own internal memory is accessible: use only specifically shared, authorized records. Do not copy sensitive content, contract texts, pricing, personal information or tokens into this code repository.

## Current coordination policy (source: M3KH phase-two instructions, updated 2026-10-19)
- Daily commercial operations: ACTIVE via **manual bridge / temporary shared register**.
- Direct writing to M3KH primary Vault: **NO-GO**.
- Automated central Bridge: **DEFERRED**; do not block normal authorized business follow-up waiting for deployment.
- Emails received by management: Ava owns intake, even if commercial supervisor is CC'd. Exclusive supervisor emails: supervisor assistant intake. Deduplicate by source ID / contract ID.
- Changes to M3KH: propose with source and case reference in the approved change-referral workflow; Ava owns reconciliation and final authorized writing.
- External communications, pricing commitments, payments, signature and chartering decisions require authorized human approval.

## Retrieval record schema (design, not yet implemented)
`source_id, source_url, source_type, business_unit, project_or_contract_id, document_version, source_date, last_verified_at, status(active|paused|historical|unverified), authority(primary|management|coordination|draft), evidence_excerpt, approved_rule_id, reviewer, confidentiality_class`.

Every generated answer should cite the precise source, distinguish facts from proposals, and surface conflicts instead of silently selecting one.

## Initial skill backlog
**KAU SOK:** billet purchase contract review; billet resale contract review; billet pricing and receivables reconciliation; war/blockade shipment and payment exceptions; commercial letters.
**ZMC:** mine material sales; extraction/haulage/works contracting; consulting contracts; milestones, guarantees, claims and contractor performance.
**Cross-cutting:** source reconciliation, duplicate avoidance, human approval, audit trail and draft reporting.

## Validation gates
1. Verify source authorization and read only.
2. Extract *candidate* rules with exact provenance; never treat one historical deal as company standard.
3. Supervisor validates commercial rules; management/Ava validates authority and coordination rules; legal/finance/technical specialists validate their respective subject matter.
4. Test with synthetic cases and compare against approved historical outcomes.
5. Promote only approved, versioned rules to operational skills.

This file documents scope and rules only. No knowledge ingestion, deployment, synchronization or training has been performed by this commit.
