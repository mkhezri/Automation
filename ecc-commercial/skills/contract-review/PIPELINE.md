# Contract Review — Integrated Offline Pilot

The prototype now links three read-only stages:
1. Extract text from DOCX or selectable-text PDF bytes.
2. Detect numbered clauses and flag contract topics for human review.
3. Produce a Persian Markdown draft with generic English drafting recommendations.

Run locally from `agent/`:

```python
from pilot_pipeline import analyze_document_bytes
with open("synthetic-contract.docx", "rb") as handle:
    result = analyze_document_bytes(handle.read(), "docx", "buyer", "SYNTHETIC-002")
print(result["report_markdown"])
```

Only use **synthetic test documents** until confidentiality, retention, malware scanning and identity controls are approved.

This is not a web upload endpoint, legal opinion, AI negotiation agent or production deployment. It does not save documents, send emails, or call an LLM. The extracted text can lose tables' layout, headers, footnotes and clause numbering; always verify against the original.
