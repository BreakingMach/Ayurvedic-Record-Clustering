"""Unit tests for blinded expert review sheet generation and agreement analysis."""

from __future__ import annotations

import sys
from pathlib import Path

import openpyxl
import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from expert_review.analysis.expert_agreement import analyze_completed_sheets
from expert_review.build_sheet import build_rating_package


def test_build_rating_sheet_is_blinded_and_stratified(tmp_path: Path) -> None:
    paths = build_rating_package(n_queries=40, top_k=5, seed=2026, out_dir=tmp_path)
    xlsx_path = paths["rating_sheet"]
    key_path = paths["answer_key"]

    assert xlsx_path.exists()
    assert key_path.exists()

    key_df = pd.read_csv(key_path)
    assert len(key_df) == 200  # 40 queries * 5 neighbours
    assert key_df["query_id"].nunique() == 40

    # Check stratified class counts across the 40 unique queries
    q_counts = key_df.drop_duplicates("query_id")["query_dataset_label"].value_counts().to_dict()
    assert q_counts == {
        "Vata+Pitta": 21,
        "Vata": 9,
        "Pitta": 4,
        "Kapha": 2,
        "Pitta+Kapha": 2,
        "Vata+Kapha": 2,
    }

    # Verify neighbour order is randomised (not identical [1,2,3,4,5] for every query)
    slot_a_ranks = key_df.loc[key_df["candidate_slot"] == "A", "neighbour_rank"].unique().tolist()
    assert len(slot_a_ranks) >= 3, f"Candidate slot A was not randomised: {slot_a_ranks}"

    # Verify ZERO leakage of Dosha labels, metric names, or true rank column in rating_sheet.xlsx
    wb = openpyxl.load_workbook(xlsx_path)
    forbidden_tokens = [
        "vata",
        "pitta",
        "kapha",
        "dosha",
        "gower",
        "euclidean",
        "cosine",
        "hamming",
        "neighbour_rank",
        "real_data_distance",
    ]
    all_text = []
    for ws in wb.worksheets:
        for row in ws.iter_rows(values_only=True):
            for val in row:
                if val is not None:
                    all_text.append(str(val).lower())
    joined = "\n".join(all_text)
    for token in forbidden_tokens:
        assert token not in joined, f"Blinding violation: found forbidden token {token!r} in rating_sheet.xlsx"


def test_expert_agreement_pending_and_multi_rater_scoring(tmp_path: Path) -> None:
    paths = build_rating_package(n_queries=40, top_k=5, seed=2026, out_dir=tmp_path)

    # 1. Blank sheet -> must report pending
    pending = analyze_completed_sheets([paths["rating_sheet"]], answer_key_path=paths["answer_key"])
    assert pending["status"] == "pending"
    assert pending["display_label"] == "Practitioner validation: pending"
    assert pending["n_reviewers"] == 0

    # 2. Mock two completed reviewer CSVs inside tmp_path (synthetic test fixture only)
    key_df = pd.read_csv(paths["answer_key"])
    r1 = pd.DataFrame(
        {
            "pair_id": key_df["pair_id"],
            "clinical_similarity_1_to_5": (6 - key_df["neighbour_rank"]).clip(1, 5),
        }
    )
    r2 = pd.DataFrame(
        {
            "pair_id": key_df["pair_id"],
            "clinical_similarity_1_to_5": (6 - key_df["neighbour_rank"]).clip(1, 5),
        }
    )
    # Perturb a few entries in r2 so variance & agreement are non-trivial
    r2.loc[r2.index % 7 == 0, "clinical_similarity_1_to_5"] = (
        r2.loc[r2.index % 7 == 0, "clinical_similarity_1_to_5"] - 1
    ).clip(1, 5)

    r1_path = tmp_path / "reviewer1.csv"
    r2_path = tmp_path / "reviewer2.csv"
    r1.to_csv(r1_path, index=False)
    r2.to_csv(r2_path, index=False)

    res = analyze_completed_sheets([r1_path, r2_path], answer_key_path=paths["answer_key"])
    assert res["status"] == "completed"
    assert res["n_reviewers"] == 2
    assert res["rating_by_neighbour_rank"]["1"]["mean"] > res["rating_by_neighbour_rank"]["5"]["mean"]
    assert res["rank_vs_rating_spearman_rho"] < -0.9
    assert res["inter_rater_agreement"] is not None
    assert res["inter_rater_agreement"]["krippendorff_alpha_ordinal"] > 0.85
    assert res["inter_rater_agreement"]["pairwise"][0]["quadratic_weighted_kappa"] > 0.85
