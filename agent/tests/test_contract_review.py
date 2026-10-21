import pytest
from contract_review import review_contract


def test_missing_topics_flagged_for_buyer():
    result = review_contract("Sale of 1000 MT iron ore concentrate.", "buyer")
    assert result["status"] == "preliminary_screening_only"
    assert len(result["findings"]) == 5
    assert all(f["evidence"] == "" for f in result["findings"])


def test_evidence_from_source_text():
    text = "Payment 90% after bill of lading. Force majeure includes war."
    result = review_contract(text, "seller")
    payment = next(f for f in result["findings"] if f["code"] == "payment")
    assert "Payment" in payment["evidence"]
    assert payment["severity"] == "review"


@pytest.mark.parametrize("role", ["administrator", "", "BUYER"])
def test_invalid_role_rejected(role):
    with pytest.raises(ValueError):
        review_contract("A contract", role)


def test_empty_or_oversized_input_rejected():
    with pytest.raises(ValueError):
        review_contract("", "buyer")
    with pytest.raises(ValueError):
        review_contract("x" * 200001, "buyer")


def test_no_side_effects():
    result = review_contract("داوری و بارگیری در بندر", "buyer")
    assert isinstance(result["findings"], list)
    assert all(set(f) == {"code", "severity", "title", "rationale", "evidence"} for f in result["findings"])
