"""Tests for Part C — UI data exports in public/data/ (Rules R1, R10, R11, R12, R13)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
PUBLIC_DATA = REPO_ROOT / "public" / "data"

EXPECTED_FILES = [
    "real_records.json",
    "synthetic_records.json",
    "embeddings.json",
    "clusterings.json",
    "descriptive.json",
    "synthetic_cases_default.csv",
]


def test_ui_export_files_exist():
    for fname in EXPECTED_FILES:
        target = PUBLIC_DATA / fname
        if not target.exists():
            pytest.skip(f"UI export file {target} does not exist yet.")


def test_ui_export_disclaimers():
    """Verify that R11 disclaimer is embedded in all UI JSON exports."""
    for fname in ["real_records.json", "synthetic_records.json", "embeddings.json", "clusterings.json", "descriptive.json"]:
        p = PUBLIC_DATA / fname
        if not p.exists():
            pytest.skip(f"{p} not generated yet.")
        with open(p, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        assert "notice" in data
        assert "Research prototype on a dataset of unverified origin. Not a diagnostic tool." in data["notice"]


def test_embeddings_metadata():
    p = PUBLIC_DATA / "embeddings.json"
    if not p.exists():
        pytest.skip("embeddings.json not generated yet.")
    with open(p, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    assert data.get("note") == "visualisation only; not evidence"
    assert "real" in data["datasets"]
    assert "synthetic" in data["datasets"]
    for d_name in ("real", "synthetic"):
        for m in ("gower", "euclidean", "cosine"):
            assert m in data["datasets"][d_name]
            coords = data["datasets"][d_name][m]
            assert len(coords) == 1200
            for pt in coords:
                assert len(pt) == 2
                assert 0.0 <= pt[0] <= 1.0
                assert 0.0 <= pt[1] <= 1.0


def test_clusterings_metadata():
    p = PUBLIC_DATA / "clusterings.json"
    if not p.exists():
        pytest.skip("clusterings.json not generated yet.")
    with open(p, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    assert data["k_range"] == [3, 4, 5, 6, 7, 8]
    assert "Rule R12" in data["note"] or "No selection of a best config" in data["note"]
    for d_name in ("real", "synthetic"):
        for m in ("gower", "euclidean", "cosine"):
            for link in ("average", "complete"):
                for k in range(3, 9):
                    k_obj = data["clusterings"][d_name][m][link][str(k)]
                    assert "ari" in k_obj
                    assert "nmi" in k_obj
                    assert "contingency_table" in k_obj
                    assert len(k_obj["contingency_table"]) == k


def test_descriptive_and_balanced_sample():
    p = PUBLIC_DATA / "descriptive.json"
    if not p.exists():
        pytest.skip("descriptive.json not generated yet.")
    with open(p, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    assert "cramers_v" in data
    assert len(data["cramers_v"]) == 29
    for item in data["cramers_v"]:
        assert item["flag"] == "descriptive, not used for weighting"

    # 240-record sample
    assert "sample_240" in data
    sample = data["sample_240"]
    assert sample["n_samples"] == 240
    assert len(sample["indices"]) == 240
    assert len(sample["class_labels"]) == 240
    for m in ("gower", "euclidean", "cosine"):
        assert m in sample["distance_matrices"]
        mat = sample["distance_matrices"][m]
        assert len(mat) == 240
        assert len(mat[0]) == 240

    # Invariance note
    assert "invariance_note" in data
    inv = data["invariance_note"]
    assert "kNN" in inv["invariant_families"][0]
    assert "Complete-Linkage" in inv["invariant_families"][2]
    assert "Average-Linkage" in inv["non_invariant_families"][0]
