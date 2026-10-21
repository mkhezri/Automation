from review_report import build_markdown_report


def test_bilingual_report_and_role():
    report = build_markdown_report(
        "1. PAYMENT\nBuyer shall pay 90% against B/L.", "buyer", "SYNTHETIC-001"
    )
    assert "شناسه سند" in report
    assert "SYNTHETIC-001" in report
    assert "خریدار" in report
    assert "Specify documentary payment triggers" in report
    assert "نیازمند بررسی" in report


def test_untrusted_document_id_escaped():
    report = build_markdown_report("1. PAYMENT\nPay on delivery.", "seller", "X|Y")
    assert "X\\|Y" in report


def test_no_legal_conclusion():
    report = build_markdown_report("1. DELIVERY\nFOB Bandar Abbas.", "seller")
    assert "فاقد تأیید حقوقی" in report
    assert "آماده امضا" in report
