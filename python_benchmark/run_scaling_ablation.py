#!/usr/bin/env python3
"""
Experiment B (Ablation) — Post-Hoc Scaling Ablation on Synthetic Cohorts.

Status: EXPLORATORY and POST-HOC (logged in docs/DECISIONS.md, Rule R3/R4/R7).
Evaluates the effect of numeric feature scaling:
  - gower: standard range-normalised numerics vs gower_zscore (std-dev normalised numerics)
  - euclidean: standard z-scored numerics vs euclidean_range (range-normalised numerics)
  - cosine: standard z-scored numerics vs cosine_range (range-normalised numerics)
Evaluated across:
  - baseline cell: eps=0.2, d=1.0, outliers=0, missing=0, label_noise=0, m=29
  - numeric separation sweep: d in [0.0, 0.25, 0.5, 1.0, 2.0]
  - categorical noise sweep: eps in [0.0, 0.1, 0.2, 0.3, 0.4]
Uses the identical 20 seeds (42..61) and statistical framework (paired Wilcoxon + Holm).
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
from typing import Any, Callable, Dict, List, Sequence, Tuple

import joblib
import numpy as np
import pandas as pd
import scipy
import sklearn

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from ayur_bench.data import load_config
from ayur_bench.distances import (
    cosine_distance,
    cosine_range_distance,
    euclidean_distance,
    euclidean_range_distance,
    gower_distance,
    gower_zscore_distance,
)
from ayur_bench.evaluation import evaluate_distance_matrix
from ayur_bench.stats import compare_metrics_paired, summarize_scores
from ayur_bench.synth import NUMERIC_VITAL_COLS, generate
from generate_scaling_ablation_findings import write_scaling_ablation_markdown

ABLATION_METRIC_DISPATCH: Dict[str, Callable[..., np.ndarray]] = {
    "gower": gower_distance,
    "gower_zscore": gower_zscore_distance,
    "euclidean": euclidean_distance,
    "euclidean_range": euclidean_range_distance,
    "cosine": cosine_distance,
    "cosine_range": cosine_range_distance,
}

HEADLINE_ENDPOINTS = [
    "knn_macro_f1",
    "loo_macro_p_at_5",
    "ari_average",
    "nmi_average",
    "ari_complete",
    "nmi_complete",
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


def make_cell_id(params: Dict[str, Any]) -> str:
    return (
        f"eps{params['categorical_eps']}_d{params['numeric_cohens_d']}"
        f"_out{params['outlier_fraction']}_mis{params['missing_fraction']}"
        f"_ln{params['label_noise_rate']}_m{params['m_traits']}"
    )


def evaluate_single_seed(
    cell_id: str,
    cell_params: Dict[str, Any],
    seed: int,
    cfg: Dict[str, Any],
) -> Dict[str, Any]:
    cache_dir = REPO_ROOT / "results" / ".cache_ablation"
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_file = cache_dir / f"{cell_id}_s{seed}.json"
    if cache_file.exists():
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass

    gen_overrides = {
        "categorical_eps": float(cell_params["categorical_eps"]),
        "numeric_cohens_d": float(cell_params["numeric_cohens_d"]),
        "outlier_fraction": float(cell_params["outlier_fraction"]),
        "missing_fraction": float(cell_params["missing_fraction"]),
        "label_noise_rate": float(cell_params["label_noise_rate"]),
    }
    df, meta = generate(cfg, seed=seed, overrides=gen_overrides)
    y_eval = df["eval_label"].to_numpy()
    cat_cols = list(meta["categorical_cols"])
    X = df[NUMERIC_VITAL_COLS + cat_cols]

    res_per_metric: Dict[str, Dict[str, float]] = {}
    for m_name, func in ABLATION_METRIC_DISPATCH.items():
        D = func(X, numeric_cols=NUMERIC_VITAL_COLS, categorical_cols=cat_cols)
        eval_dict = evaluate_distance_matrix(D, y_eval)
        res_per_metric[m_name] = {
            "knn_macro_f1": eval_dict["knn_cv"]["macro_f1_mean"],
            "knn_accuracy": eval_dict["knn_cv"]["accuracy_mean"],
            "loo_macro_p_at_1": eval_dict["loo_retrieval"]["macro"]["p_at_1"],
            "loo_macro_p_at_5": eval_dict["loo_retrieval"]["macro"]["p_at_5"],
            "loo_macro_p_at_10": eval_dict["loo_retrieval"]["macro"]["p_at_10"],
            "ari_average": eval_dict["clustering"]["linkages"]["average"]["ari"],
            "nmi_average": eval_dict["clustering"]["linkages"]["average"]["nmi"],
            "ari_complete": eval_dict["clustering"]["linkages"]["complete"]["ari"],
            "nmi_complete": eval_dict["clustering"]["linkages"]["complete"]["nmi"],
            "silhouette_average_not_comparable": eval_dict["clustering"]["linkages"]["average"]["silhouette"],
            "silhouette_complete_not_comparable": eval_dict["clustering"]["linkages"]["complete"]["silhouette"],
        }

    out = {"cell_id": cell_id, "seed": seed, "metrics": res_per_metric}
    try:
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(out, f)
    except Exception:
        pass
    return out


def run_scaling_ablation() -> None:
    t_start = time.time()
    cfg = load_config()
    exp_cfg = cfg["experiment_synthetic"]
    baseline = dict(exp_cfg["baseline"])
    seed_base = int(exp_cfg.get("seed_base", 5000))
    n_seeds = int(exp_cfg.get("n_seeds", 20))
    seeds: List[int] = [seed_base + s for s in range(n_seeds)]

    # Build unique cells for baseline + d sweep + eps sweep
    unique_cells: Dict[str, Dict[str, Any]] = {}
    base_id = make_cell_id(baseline)
    unique_cells[base_id] = dict(baseline)

    d_cells: List[str] = []
    for d_val in exp_cfg["sweeps"]["numeric_cohens_d"]:
        p = dict(baseline)
        p["numeric_cohens_d"] = float(d_val)
        cid = make_cell_id(p)
        unique_cells[cid] = p
        d_cells.append(cid)

    eps_cells: List[str] = []
    for eps_val in exp_cfg["sweeps"]["categorical_eps"]:
        p = dict(baseline)
        p["categorical_eps"] = float(eps_val)
        cid = make_cell_id(p)
        unique_cells[cid] = p
        eps_cells.append(cid)

    print(
        f"[Scaling Ablation] Running {len(unique_cells)} unique cells x {len(seeds)} seeds "
        f"across {len(ABLATION_METRIC_DISPATCH)} metric variants..."
    )

    n_jobs = min(os.cpu_count() or 4, 8)
    tasks = []
    for cid, params in unique_cells.items():
        for s in seeds:
            tasks.append((cid, params, s))

    raw_results = joblib.Parallel(n_jobs=n_jobs, verbose=5)(
        joblib.delayed(evaluate_single_seed)(cid, params, s, cfg) for cid, params, s in tasks
    )

    # Organize raw results by cell_id -> seed -> metric -> endpoint
    cell_data: Dict[str, Any] = {}
    for cid, params in unique_cells.items():
        cell_data[cid] = {
            "cell_id": cid,
            "parameters": params,
            "metrics": {},
            "raw_seed_scores": {m: {ep: [] for ep in HEADLINE_ENDPOINTS} for m in ABLATION_METRIC_DISPATCH},
        }

    for item in raw_results:
        cid = item["cell_id"]
        for m_name, ep_dict in item["metrics"].items():
            for ep in HEADLINE_ENDPOINTS:
                cell_data[cid]["raw_seed_scores"][m_name][ep].append(ep_dict[ep])

    # Compute statistical summaries for each cell
    for cid, cinfo in cell_data.items():
        metric_summaries = {}
        for m_name in ABLATION_METRIC_DISPATCH:
            metric_summaries[m_name] = {}
            for ep in HEADLINE_ENDPOINTS:
                scores = cinfo["raw_seed_scores"][m_name][ep]
                metric_summaries[m_name][ep] = summarize_scores(scores)
        cinfo["metrics"] = metric_summaries

        pairwise_stats = {}
        for ep in HEADLINE_ENDPOINTS:
            metric_arrays = {m: np.array(cinfo["raw_seed_scores"][m][ep]) for m in ABLATION_METRIC_DISPATCH}
            comp = compare_metrics_paired(metric_arrays, alpha=0.05)
            pairwise_stats[ep] = comp
        cinfo["paired_comparisons"] = pairwise_stats

    # Package output
    git_info = get_git_info(REPO_ROOT)
    provenance = {
        "status": "EXPLORATORY and POST-HOC",
        "notice": "Research prototype on a dataset of unverified origin. Not a diagnostic tool.",
        "created_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "runtime_seconds": float(time.time() - t_start),
        "n_jobs": int(n_jobs),
        "seeds": seeds,
        "n_seeds": len(seeds),
        "baseline_cell_id": base_id,
        "git": git_info,
        "python_version": platform.python_version(),
        "library_versions": {
            "numpy": np.__version__,
            "pandas": pd.__version__,
            "scipy": scipy.__version__,
            "scikit_learn": sklearn.__version__,
            "joblib": joblib.__version__,
        },
        "config": cfg,
    }

    out_obj = {
        "provenance": provenance,
        "sweeps": {
            "numeric_cohens_d": d_cells,
            "categorical_eps": eps_cells,
        },
        "cells": cell_data,
    }

    out_json = REPO_ROOT / "results" / "synthetic_scaling_ablation.json"
    out_json.parent.mkdir(parents=True, exist_ok=True)
    with open(out_json, "w", encoding="utf-8") as fh:
        json.dump(out_obj, fh, indent=2)

    print(f"[Scaling Ablation] Wrote results to {out_json}")

    # Generate markdown summary
    write_scaling_ablation_markdown(out_obj, REPO_ROOT / "docs" / "SCALING_ABLATION.md")
    print(f"[Scaling Ablation] Finished in {time.time() - t_start:.2f}s")


if __name__ == "__main__":
    run_scaling_ablation()
