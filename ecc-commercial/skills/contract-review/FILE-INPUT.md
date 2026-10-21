# Offline document text extraction (pilot)

Module: `agent/document_extract.py`.

- Accepts **in-memory bytes** only, file type `docx` or `pdf`.
- DOCX: extracts paragraphs and table cells.
- PDF: extracts selectable text only; scanned PDFs and OCR are out of scope.
- Limits: 8 MiB input, 200,000 extracted characters, 100 PDF pages.
- Rejects encrypted PDFs and invalid headers. Does not execute macros, transmit documents or write files.
- This is a parser prototype, **not a secure upload endpoint**. Complex documents may have lost formatting, footnotes, text boxes or inaccurate reading order. Source references need manual verification.
- Do not use confidential real contracts until document handling, access control, retention and malware scanning have been reviewed.

Usage (local, from `agent/`):
```python
from document_extract import extract_document_text
text = extract_document_text(document_bytes, "docx")
```
