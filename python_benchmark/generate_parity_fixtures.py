#!/usr/bin/env python3
"""
Generate parity test fixtures in tests/fixtures/parity.json (Rules R1, R10, R11).

Specification (Part D):
- 60 queries per dataset ('real' and 'synthetic')
- Query mix per dataset:
    * 15 complete queries (0% missing traits)
    * 15 queries with 20% missing traits (k=6 traits masked)
    * 15 queries with 50% missing traits (k=15 traits masked)
    * 15 exact-duplicate queries (exact copy of a dataset record)
- Stratified across all 6 classes.
- For each query, against the 1,200 database records, computes top-10 neighbor indices and distances
  for all 5 variants:
    * gower
    * euclidean_modeimpute
    * cosine_modeimpute
    * euclidean_observed_only
    * cosine_observed_only
- Ties broken by lowest record index (mergesort).
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List, Sequence, Tuple

import numpy as np
import pandas as pd

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from ayur_bench.data import load_config, load_tridosha_dataset
from ayur_bench.distances import compute_query_to_db_distances
from ayur_bench.synth import NUMERIC_VITAL_COLS

PARITY_VARIANTS = [
    "gower",
    "euclidean_modeimpute",
    "cosine_modeimpute",
    "euclidean_observed_only",
    "cosine_observed_only",
]


def get_git_info(repo_root: Path) -> Dict[str, str]:
    def _run(args: Sequence[str]) -> str:
        try:
            out = subprocess.check_output(args, cwd=repo_root, stderr=subprocess.DEVNULL)
            return out.decode("utf-8").strip()
        except Exception:
            return "unknown"

    return {
        "commit": _run(["git", "rev-parse", "HEAD"]),
        "short_commit": _run(["git", "rev-parse", "--short", "HEAD"]),
        "branch": _run(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
    }


def generate_queries_for_dataset(
    df: pd.DataFrame,
    cat_cols: List[str],
    num_cols: List[str],
    label_col: str,
    dataset_name: str,
    classes: List[str],
    seed: int = 42,
) -> List[Dict[str, Any]]:
    rng = np.random.default_rng(seed)
    n_traits = len(cat_cols)

    # Stratified selection of 60 records from the dataset
    class_indices: Dict[str, List[int]] = {}
    for c in classes:
        idxs = np.where(df[label_col].astype(str) == c)[0].tolist()
        class_indices[c] = idxs

    selected_records: List[Tuple[int, str]] = []
    # 10 records per class across 6 classes = 60 records
    for c in classes:
        chosen = rng.choice(class_indices[c], size=10, replace=False).tolist()
        for idx in chosen:
            selected_records.append((idx, c))

    # Permute the 60 records
    rng.shuffle(selected_records)

    # Assign query types: 15 exact-duplicate, 15 complete, 15 missing 20%, 15 missing 50%
    query_types = (
        [("exact_duplicate", 0.0)] * 15
        + [("complete", 0.0)] * 15
        + [("missing_20", 0.2)] * 15
        + [("missing_50", 0.5)] * 15
    )

    queries: List[Dict[str, Any]] = []

    for q_idx, ((rec_idx, c_label), (q_type, miss_frac)) in enumerate(zip(selected_records, query_types)):
        row = df.iloc[rec_idx]
        k_mask = int(round(miss_frac * n_traits))

        # Copy trait dictionary
        trait_vals = {col: str(row[col]) for col in cat_cols}
        if k_mask > 0:
            masked_traits = rng.choice(cat_cols, size=k_mask, replace=False)
            for m_col in masked_traits:
                trait_vals[m_col] = None

        vital_vals = {}
        if len(num_cols) > 0:
            for v_col in num_cols:
                vital_vals[v_col] = float(row[v_col]) if pd.notna(row[v_col]) else None

        queries.append(
            {
                "query_id": f"{dataset_name}_q{q_idx + 1:02d}",
                "query_type": q_type,
                "missing_fraction": float(miss_frac),
                "source_record_idx": int(rec_idx),
                "true_label": str(c_label),
                "traits": trait_vals,
                "vitals": vital_vals if len(num_cols) > 0 else None,
            }
        )

    return queries


def build_parity_fixtures() -> None:
    print("[parity_fixtures] Generating parity test fixtures...")
    cfg = load_config()
    classes = list(cfg["dataset"]["class_order"])
    git_info = get_git_info(REPO_ROOT)

    # 1. Real dataset
    real_bundle = load_tridosha_dataset()
    X_real = real_bundle.X
    y_real = real_bundle.y
    cat_cols_real = list(real_bundle.categorical_cols)
    real_df_with_label = X_real.copy()
    real_df_with_label["Dosha"] = y_real

    real_queries = generate_queries_for_dataset(
        real_df_with_label,
        cat_cols=cat_cols_real,
        num_cols=[],
        label_col="Dosha",
        dataset_name="real",
        classes=classes,
        seed=1042,
    )

    # 2. Synthetic dataset
    synth_path = REPO_ROOT / "Dataset" / "synthetic" / "synthetic_cases_default.csv"
    if not synth_path.exists():
        raise FileNotFoundError(f"Missing default synthetic dataset: {synth_path}")
    synth_df = pd.read_csv(synth_path)
    cat_cols_synth = [c for c in synth_df.columns if c not in NUMERIC_VITAL_COLS and c not in ("eval_label", "latent_class")]

    synth_queries = generate_queries_for_dataset(
        synth_df,
        cat_cols=cat_cols_synth,
        num_cols=NUMERIC_VITAL_COLS,
        label_col="eval_label",
        dataset_name="synthetic",
        classes=classes,
        seed=2042,
    )

    # Compute top-10 neighbors for each query in both datasets
    all_fixtures = {
        "notice": "Research prototype on a dataset of unverified origin. Not a diagnostic tool.",
        "description": "Deterministic top-10 nearest-neighbour retrieval parity fixtures (ties broken by lowest record index).",
        "seed": 42,
        "git_commit": git_info["short_commit"],
        "datasets": {
            "real": {"n_database_records": len(X_real), "queries": []},
            "synthetic": {"n_database_records": len(synth_df), "queries": []},
        },
    }

    # Process real queries
    db_real_feat = X_real[cat_cols_real]
    for q_meta in real_queries:
        q_df = pd.DataFrame([q_meta["traits"]])
        q_results = {
            "query_id": q_meta["query_id"],
            "query_type": q_meta["query_type"],
            "missing_fraction": q_meta["missing_fraction"],
            "source_record_idx": q_meta["source_record_idx"],
            "true_label": q_meta["true_label"],
            "traits": q_meta["traits"],
            "metrics": {},
        }
        for v in PARITY_VARIANTS:
            D_vec = compute_query_to_db_distances(
                q_df,
                db_real_feat,
                variant=v,
                categorical_cols=cat_cols_real,
                numeric_cols=[],
            )[0]
            # Mergesort stable ranking
            order = np.argsort(D_vec, kind="mergesort")
            top10_idx = [int(i) for i in order[:10]]
            top10_dist = [round(float(D_vec[i]), 6) for i in top10_idx]
            q_results["metrics"][v] = {
                "neighbor_indices": top10_idx,
                "neighbor_distances": top10_dist,
            }
        all_fixtures["datasets"]["real"]["queries"].append(q_results)

    # Process synthetic queries
    db_synth_feat = synth_df[NUMERIC_VITAL_COLS + cat_cols_synth]
    for q_meta in synth_queries:
        row_dict = dict(q_meta["traits"])
        row_dict.update(q_meta["vitals"])
        q_df = pd.DataFrame([row_dict])
        q_results = {
            "query_id": q_meta["query_id"],
            "query_type": q_meta["query_type"],
            "missing_fraction": q_meta["missing_fraction"],
            "source_record_idx": q_meta["source_record_idx"],
            "true_label": q_meta["true_label"],
            "traits": q_meta["traits"],
            "vitals": q_meta["vitals"],
            "metrics": {},
        }
        for v in PARITY_VARIANTS:
            D_vec = compute_query_to_db_distances(
                q_df,
                db_synth_feat,
                variant=v,
                categorical_cols=cat_cols_synth,
                numeric_cols=NUMERIC_VITAL_COLS,
            )[0]
            order = np.argsort(D_vec, kind="mergesort")
            top10_idx = [int(i) for i in order[:10]]
            top10_dist = [round(float(D_vec[i]), 6) for i in top10_idx]
            q_results["metrics"][v] = {
                "neighbor_indices": top10_idx,
                "neighbor_distances": top10_dist,
            }
        all_fixtures["datasets"]["synthetic"]["queries"].append(q_results)

    # Write output to tests/fixtures/parity.json and python_benchmark/tests/fixtures/parity.json
    out_paths = [
        REPO_ROOT / "tests" / "fixtures" / "parity.json",
        REPO_ROOT / "python_benchmark" / "tests" / "fixtures" / "parity.json",
    ]
    for out_p in out_paths:
        out_p.parent.mkdir(parents=True, exist_ok=True)
        with open(out_p, "w", encoding="utf-8") as fh:
            json.dump(all_fixtures, fh, indent=2)
        print(f"[parity_fixtures] Wrote {out_p} ({len(real_queries)} real + {len(synth_queries)} synthetic queries)")


if __name__ == "__main__":
    build_parity_fixtures()
