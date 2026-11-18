#!/usr/bin/env python3
"""
Build blinded clinical similarity rating sheet for practitioner review on the REAL dataset.

- Samples 40 real records from Dataset/tridosha.zip stratified by class (fixed seed).
- Retrieves each query's top-5 nearest neighbours under the real-data metric (which is
  identical across Gower, Euclidean, Cosine, and Hamming on the categorical-only CSV).
- Randomises presentation order (slots A..E) and strips all metric names, distance scores,
  true ranks, original row numbers, and dataset Dosha labels from rating_sheet.xlsx.
- Writes the separate hidden answer key to expert_review/private/answer_key.csv.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np
import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
import pandas as pd

EXPERT_DIR = Path(__file__).resolve().parent
REPO_ROOT = EXPERT_DIR.parent
PY_BENCH_DIR = REPO_ROOT / "python_benchmark"
if str(PY_BENCH_DIR) not in sys.path:
    sys.path.insert(0, str(PY_BENCH_DIR))

from ayur_bench.data import CANONICAL_CLASSES, load_config, load_tridosha_dataset
from ayur_bench.distances import gower_distance

CANDIDATE_SLOTS = ["A", "B", "C", "D", "E"]


def allocate_stratified_queries(
    n_queries: int, class_counts: Dict[str, int]
) -> Dict[str, int]:
    """
    Stratified integer allocation across the 6 classes preserving class proportions while
    keeping the two equal-sized smallest classes (Pitta+Kapha=48, Vata+Kapha=48) symmetric
    with at least 2 queries each (for n_queries=40: 20, 9, 5, 2, 2, 2).
    """
    total = sum(class_counts.values())
    exact = {c: (class_counts[c] / total) * n_queries for c in CANONICAL_CLASSES}
    alloc = {c: max(2, int(np.floor(exact[c]))) for c in CANONICAL_CLASSES}

    # Adjust to hit exact n_queries by adding/removing from classes with largest/smallest remainders
    while sum(alloc.values()) < n_queries:
        cand = sorted(
            CANONICAL_CLASSES,
            key=lambda c: (exact[c] - alloc[c], class_counts[c]),
            reverse=True,
        )[0]
        alloc[cand] += 1
    while sum(alloc.values()) > n_queries:
        cand = sorted(
            [c for c in CANONICAL_CLASSES if alloc[c] > 2],
            key=lambda c: (exact[c] - alloc[c], -class_counts[c]),
        )[0]
        alloc[cand] -= 1
    return alloc


def _format_trait_diff(q_row: pd.Series, c_row: pd.Series, cols: List[str]) -> Tuple[int, str, str]:
    diffs_q: List[str] = []
    diffs_c: List[str] = []
    for col in cols:
        qv = str(q_row[col])
        cv = str(c_row[col])
        if qv != cv:
            diffs_q.append(f"{col}: {qv}")
            diffs_c.append(f"{col}: {cv}")
    if not diffs_q:
        return 0, "(Identical across all 29 recorded traits)", "(Identical across all 29 recorded traits)"
    return len(diffs_q), " | ".join(diffs_q), " | ".join(diffs_c)


def build_rating_package(
    n_queries: int = 40,
    top_k: int = 5,
    seed: int = 2026,
    out_dir: Path | None = None,
) -> Dict[str, Path]:
    """Generate rating_sheet.xlsx and private/answer_key.csv from the REAL CSV."""
    target_dir = Path(out_dir) if out_dir is not None else EXPERT_DIR
    private_dir = target_dir / "private"
    target_dir.mkdir(parents=True, exist_ok=True)
    private_dir.mkdir(parents=True, exist_ok=True)

    bundle = load_tridosha_dataset()
    X = bundle.X
    y = bundle.y
    cols = list(bundle.categorical_cols)

    # Real-data pairwise dissimilarity (equivalent across Gower/Euclidean/Cosine/Hamming on categorical CSV)
    D = gower_distance(X, numeric_cols=[], categorical_cols=cols)
    D_work = D.copy()
    np.fill_diagonal(D_work, np.inf)
    order = np.argsort(D_work, axis=1, kind="mergesort")

    rng = np.random.default_rng(seed)
    alloc = allocate_stratified_queries(n_queries, bundle.metadata["class_counts"])

    selected_indices: List[int] = []
    for cls in CANONICAL_CLASSES:
        cls_indices = np.where(y.to_numpy() == cls)[0]
        picked = rng.choice(cls_indices, size=alloc[cls], replace=False).tolist()
        selected_indices.extend(picked)

    # Shuffle query presentation order so queries are not grouped by class
    selected_indices = rng.permutation(selected_indices).tolist()

    rating_rows: List[Dict[str, Any]] = []
    answer_rows: List[Dict[str, Any]] = []
    profile_rows: List[Dict[str, Any]] = []

    for q_num, q_idx in enumerate(selected_indices, start=1):
        query_id = f"Q{q_num:02d}"
        q_row = X.iloc[q_idx]

        # Record full 29-trait blinded profile for query
        q_prof = {"profile_id": query_id, "role": "Query"}
        for col in cols:
            q_prof[col] = str(q_row[col])
        profile_rows.append(q_prof)

        top_neighbors = order[q_idx, :top_k].tolist()
        # Randomise presentation order of the 5 neighbours
        perm_positions = rng.permutation(top_k).tolist()

        for slot_pos, rank_zero in enumerate(perm_positions):
            slot_letter = CANDIDATE_SLOTS[slot_pos]
            pair_id = f"{query_id}-{slot_letter}"
            n_idx = top_neighbors[rank_zero]
            true_rank = rank_zero + 1
            n_row = X.iloc[n_idx]

            n_diff, diff_q_str, diff_c_str = _format_trait_diff(q_row, n_row, cols)

            rating_rows.append(
                {
                    "pair_id": pair_id,
                    "query_id": query_id,
                    "candidate_slot": slot_letter,
                    "clinical_similarity_1_to_5": None,
                    "comments": None,
                    "matching_traits_out_of_29": f"{len(cols) - n_diff} / {len(cols)}",
                    "query_differing_traits": diff_q_str,
                    "candidate_differing_traits": diff_c_str,
                }
            )

            c_prof = {"profile_id": pair_id, "role": f"Candidate for {query_id}"}
            for col in cols:
                c_prof[col] = str(n_row[col])
            profile_rows.append(c_prof)

            q_label = str(y.iloc[q_idx])
            n_label = str(y.iloc[n_idx])
            answer_rows.append(
                {
                    "pair_id": pair_id,
                    "query_id": query_id,
                    "candidate_slot": slot_letter,
                    "query_row_index": int(q_idx),
                    "neighbour_row_index": int(n_idx),
                    "neighbour_rank": int(true_rank),
                    "real_data_distance": round(float(D[q_idx, n_idx]), 6),
                    "query_dataset_label": q_label,
                    "neighbour_dataset_label": n_label,
                    "same_dataset_label": bool(q_label == n_label),
                }
            )

    # Save hidden answer key separately
    answer_key_path = private_dir / "answer_key.csv"
    pd.DataFrame(answer_rows).to_csv(answer_key_path, index=False)

    # Build clean, practitioner-friendly Excel workbook (zero labels, zero metrics, zero ranks)
    xlsx_path = target_dir / "rating_sheet.xlsx"
    wb = openpyxl.Workbook()

    # Sheet 1: Rating_Sheet
    ws = wb.active
    ws.title = "Rating_Sheet"
    headers = [
        "pair_id",
        "query_id",
        "candidate_slot",
        "clinical_similarity_1_to_5",
        "comments",
        "matching_traits_out_of_29",
        "query_differing_traits",
        "candidate_differing_traits",
    ]
    ws.append(headers)

    header_fill = PatternFill(start_color="0F766E", end_color="0F766E", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True, size=10)
    input_fill = PatternFill(start_color="F0FDFA", end_color="F0FDFA", fill_type="solid")

    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    for row_data in rating_rows:
        ws.append([row_data[h] for h in headers])

    # Apply subtle highlight to input columns (D and E) + 1-5 dropdown validation
    dv = DataValidation(type="list", formula1='"1,2,3,4,5"', allow_blank=True)
    dv.promptTitle = "Clinical Similarity (1 to 5)"
    dv.prompt = "1 = Not similar at all, 3 = Moderately similar, 5 = Very similar clinically"
    ws.add_data_validation(dv)
    dv.add(f"D2:D{len(rating_rows) + 1}")

    for r_idx in range(2, len(rating_rows) + 2):
        ws.cell(row=r_idx, column=4).fill = input_fill
        ws.cell(row=r_idx, column=4).alignment = Alignment(horizontal="center", vertical="top")
        ws.cell(row=r_idx, column=5).fill = input_fill
        ws.cell(row=r_idx, column=5).alignment = Alignment(wrap_text=True, vertical="top")
        ws.cell(row=r_idx, column=6).alignment = Alignment(horizontal="center", vertical="top")
        ws.cell(row=r_idx, column=7).alignment = Alignment(wrap_text=True, vertical="top")
        ws.cell(row=r_idx, column=8).alignment = Alignment(wrap_text=True, vertical="top")

    col_widths = [11, 10, 14, 24, 30, 22, 46, 46]
    for col_idx, width in enumerate(col_widths, start=1):
        ws.column_dimensions[get_column_letter(col_idx)].width = width
    ws.freeze_panes = "A2"

    # Sheet 2: Full_29_Traits (complete blinded reference profiles, zero labels)
    ws2 = wb.create_sheet(title="Full_29_Traits")
    prof_headers = ["profile_id", "role"] + cols
    ws2.append(prof_headers)
    for col_idx in range(1, len(prof_headers) + 1):
        cell = ws2.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font
    for p_row in profile_rows:
        ws2.append([p_row[h] for h in prof_headers])
    ws2.freeze_panes = "C2"
    ws2.column_dimensions["A"].width = 12
    ws2.column_dimensions["B"].width = 20

    wb.save(xlsx_path)

    return {
        "rating_sheet": xlsx_path,
        "answer_key": answer_key_path,
    }


def main() -> None:
    cfg = load_config()
    er_cfg = cfg.get("expert_review", {})
    n_queries = int(er_cfg.get("n_queries", 40))
    top_k = int(er_cfg.get("top_k", 5))
    seed = int(er_cfg.get("seed", 2026))

    paths = build_rating_package(n_queries=n_queries, top_k=top_k, seed=seed)
    print(f"[Expert Review] Generated blinded rating sheet: {paths['rating_sheet']}")
    print(f"[Expert Review] Generated hidden answer key  : {paths['answer_key']}")
    print("[Expert Review] Status: Practitioner validation: pending")


if __name__ == "__main__":
    main()
