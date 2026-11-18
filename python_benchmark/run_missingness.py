#!/usr/bin/env python3
"""
Experiment B (Missingness Robustness on REAL Data).

Protocol (Rule R1/R2/R7):
- For missing fraction p in [0.0, 0.1, 0.2, 0.3, 0.5, 0.7]:
- Leave-one-out query: each of the 1,200 records is masked at random fraction p of its 29 traits
  (MCAR, query only; database stays complete). Exactly k = round(p * 29) traits masked without replacement.
- 5 variants:
    * gower: pairwise over observed traits
    * euclidean_modeimpute: missing traits in query imputed with database mode
    * cosine_modeimpute: mode from database, cosine distance
    * euclidean_observed_only: Euclidean distance computed only on observed traits
    * cosine_observed_only: Cosine distance computed only on observed traits
- Metrics:
    * kNN (k=5) macro-F1 and accuracy
    * LOO macro Precision@5
    * mean number of records tied at the k-th distance (k=5)
- 20 seeds (42..61), mean ± std, paired Wilcoxon with Holm-Bonferroni correction.
"""

from __future__ import annotations

import datetime as dt
import json
import os
import platform
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Sequence, Tuple

import numpy as np
import pandas as pd
import scipy
from sklearn.metrics import accuracy_score, f1_score

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from ayur_bench.data import load_config, load_tridosha_dataset
from ayur_bench.stats import compare_metrics_paired, summarize_scores
from generate_missingness_findings import write_missingness_findings_markdown

VARIANTS = [
    "gower",
    "euclidean_modeimpute",
    "cosine_modeimpute",
    "euclidean_observed_only",
    "cosine_observed_only",
]

MISSING_FRACTIONS = [0.0, 0.1, 0.2, 0.3, 0.5, 0.7]


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


def evaluate_missingness_for_seed(
    p: float,
    seed: int,
    X_codes: np.ndarray,
    y_codes: np.ndarray,
    classes: np.ndarray,
    mode_vector: np.ndarray,
    M_full: np.ndarray,
    M_mode: np.ndarray,
) -> Dict[str, Dict[str, float]]:
    n_rows, n_traits = X_codes.shape
    k_mask = int(round(p * n_traits))

    rng = np.random.default_rng(seed * 1000 + int(p * 100))

    # Generate masks for each row i: shape (n_rows, n_traits)
    masks = np.ones((n_rows, n_traits), dtype=np.float64)
    if k_mask > 0:
        for i in range(n_rows):
            masked_cols = rng.choice(n_traits, size=k_mask, replace=False)
            masks[i, masked_cols] = 0.0

    m_obs = np.sum(masks, axis=1)  # (n_rows,)

    # Compute observed mismatches: obs_mismatches[i, j] = sum_m M_full[i, j, m] * masks[i, m]
    obs_mismatches = np.einsum("ijm,im->ij", M_full, masks)

    # Compute total mode-imputed mismatches:
    # tot_mismatches[i, j] = obs_mismatches[i, j] + sum_m M_mode[j, m] * (1 - masks[i, m])
    mode_part = np.einsum("jm,im->ij", M_mode, 1.0 - masks)
    tot_mismatches = obs_mismatches + mode_part

    # Generate distance matrices (Q, N) for each variant
    denom_obs = np.maximum(m_obs[:, None], 1.0)
    D_matrices = {
        "gower": obs_mismatches / denom_obs,
        "euclidean_modeimpute": np.sqrt(2.0 * tot_mismatches),
        "cosine_modeimpute": tot_mismatches / float(n_traits),
        "euclidean_observed_only": np.sqrt(2.0 * obs_mismatches),
        "cosine_observed_only": obs_mismatches / denom_obs,
    }

    results: Dict[str, Dict[str, float]] = {}

    for v_name in VARIANTS:
        D = D_matrices[v_name].copy()
        np.fill_diagonal(D, np.inf)

        # Stable mergesort breaking ties by ascending column index
        order = np.argsort(D, axis=1, kind="mergesort")
        top5 = order[:, :5]

        # 5th neighbor distance per row
        row_indices = np.arange(n_rows)
        d_5th = D[row_indices, top5[:, 4]]

        # Ties at 5th distance (excluding self)
        # Vectorized tie count: count entries in each row matching d_5th
        ties_per_row = np.sum(np.isclose(D, d_5th[:, None], atol=1e-12, rtol=1e-12), axis=1)
        mean_ties_at_5 = float(np.mean(ties_per_row))

        # Precision@5 macro
        top5_labels = y_codes[top5]
        hits_per_row = np.mean(top5_labels == y_codes[:, None], axis=1)
        cls_p5 = [float(np.mean(hits_per_row[y_codes == c])) for c in range(len(classes))]
        macro_p5 = float(np.mean(cls_p5))

        # kNN majority vote with deterministic tie-break (lowest class index)
        preds = np.zeros(n_rows, dtype=np.int64)
        for i in range(n_rows):
            votes = np.bincount(top5_labels[i], minlength=len(classes))
            preds[i] = int(np.argmax(votes))

        acc = float(accuracy_score(y_codes, preds))
        f1_macro = float(f1_score(y_codes, preds, average="macro", zero_division=0))

        results[v_name] = {
            "knn_macro_f1": f1_macro,
            "knn_accuracy": acc,
            "loo_macro_p_at_5": macro_p5,
            "mean_kth_distance_ties": mean_ties_at_5,
        }

    return results


def run_missingness() -> None:
    t_start = time.time()
    cfg = load_config()
    bundle = load_tridosha_dataset()
    X_df = bundle.X
    y_series = bundle.y
    cat_cols = list(bundle.categorical_cols)

    classes = np.sort(np.unique(y_series.to_numpy()))
    class_to_code = {c: i for i, c in enumerate(classes)}
    y_codes = np.array([class_to_code[c] for c in y_series.to_numpy()], dtype=np.int64)

    n_rows = len(X_df)
    n_traits = len(cat_cols)

    # Encode categorical traits to integer codes
    X_codes = np.empty((n_rows, n_traits), dtype=np.int64)
    mode_vector = np.empty(n_traits, dtype=np.int64)
    for j, col in enumerate(cat_cols):
        cat_type = pd.Categorical(X_df[col].astype(str))
        X_codes[:, j] = cat_type.codes
        # Mode
        vc = pd.Series(cat_type.codes).value_counts()
        mode_code = sorted(vc[vc == vc.max()].index.tolist())[0]
        mode_vector[j] = mode_code

    # Precompute pairwise mismatches tensor (1200, 1200, 29) boolean
    print("[Missingness] Precomputing pairwise trait mismatch tensor...")
    M_full = (X_codes[:, None, :] != X_codes[None, :, :]).astype(np.float64)
    M_mode = (mode_vector[None, :] != X_codes).astype(np.float64)

    seed_base = int(cfg.get("experiment_synthetic", {}).get("seed_base", 5000))
    n_seeds = int(cfg.get("experiment_synthetic", {}).get("n_seeds", 20))
    seeds: List[int] = [seed_base + s for s in range(n_seeds)]
    print(f"[Missingness] Evaluating {len(MISSING_FRACTIONS)} levels x {len(seeds)} seeds across {len(VARIANTS)} variants...")

    fractions_data: Dict[str, Any] = {}

    for p in MISSING_FRACTIONS:
        p_str = f"{p:.1f}"
        print(f"  -> Missing fraction p = {p_str}...")
        raw_seed_scores: Dict[str, Dict[str, List[float]]] = {
            v: {
                "knn_macro_f1": [],
                "knn_accuracy": [],
                "loo_macro_p_at_5": [],
                "mean_kth_distance_ties": [],
            }
            for v in VARIANTS
        }

        for s in seeds:
            res_seed = evaluate_missingness_for_seed(
                p, s, X_codes, y_codes, classes, mode_vector, M_full, M_mode
            )
            for v in VARIANTS:
                for ep in raw_seed_scores[v]:
                    raw_seed_scores[v][ep].append(res_seed[v][ep])

        # Summaries
        summaries: Dict[str, Dict[str, Any]] = {}
        for v in VARIANTS:
            summaries[v] = {}
            for ep in raw_seed_scores[v]:
                summaries[v][ep] = summarize_scores(raw_seed_scores[v][ep])

        paired_stats: Dict[str, Any] = {}
        for ep in ("knn_macro_f1", "knn_accuracy", "loo_macro_p_at_5", "mean_kth_distance_ties"):
            v_arrays = {v: np.array(raw_seed_scores[v][ep]) for v in VARIANTS}
            paired_stats[ep] = compare_metrics_paired(v_arrays, alpha=0.05)

        fractions_data[p_str] = {
            "p": float(p),
            "k_masked_traits": int(round(p * n_traits)),
            "metrics": summaries,
            "raw_seed_scores": raw_seed_scores,
            "paired_comparisons": paired_stats,
        }

    git_info = get_git_info(REPO_ROOT)
    provenance = {
        "status": "HONEST REAL-DATA EXPERIMENT (MCAR Query Masking)",
        "notice": "Research prototype on a dataset of unverified origin. Not a diagnostic tool.",
        "created_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "runtime_seconds": float(time.time() - t_start),
        "seeds": seeds,
        "n_seeds": len(seeds),
        "missing_fractions": MISSING_FRACTIONS,
        "variants": VARIANTS,
        "n_records": int(n_rows),
        "n_traits": int(n_traits),
        "git": git_info,
        "python_version": platform.python_version(),
        "library_versions": {
            "numpy": np.__version__,
            "pandas": pd.__version__,
            "scipy": scipy.__version__,
        },
    }

    out_obj = {
        "provenance": provenance,
        "fractions": fractions_data,
    }

    out_json = REPO_ROOT / "results" / "missingness.json"
    out_json.parent.mkdir(parents=True, exist_ok=True)
    with open(out_json, "w", encoding="utf-8") as fh:
        json.dump(out_obj, fh, indent=2)

    print(f"[Missingness] Wrote results to {out_json}")

    # Generate markdown summary
    write_missingness_findings_markdown(out_obj, REPO_ROOT / "docs" / "MISSINGNESS_FINDINGS.md")
    print(f"[Missingness] Finished in {time.time() - t_start:.2f}s")


if __name__ == "__main__":
    run_missingness()
