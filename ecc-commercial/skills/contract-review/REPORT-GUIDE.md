# Bilingual contract review report (pilot)

Use `agent/review_report.py` to render an in-memory Markdown triage report from synthetic contract text.

Example (run from `agent/`):
```python
from review_report import build_markdown_report
sample = "1. PAYMENT\\nBuyer shall pay 90% against B/L.\\n2. DELIVERY\\nFOB Bandar Abbas."
print(build_markdown_report(sample, "buyer", "SYNTHETIC-001"))
```

No Word/PDF ingestion, automatic email sending, API endpoint, file saving or LLM legal opinion is implemented. Report language is Persian with general English drafting prompts. A human must verify original clauses, negotiate terms and approve any outgoing document.
