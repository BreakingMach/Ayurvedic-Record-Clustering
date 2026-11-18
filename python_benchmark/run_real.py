#!/usr/bin/env python3
"""
Experiment A — Real Categorical Data Benchmark (Dataset/tridosha.zip).

Uses ONLY the 29 categorical traits and dataset-provided Dosha labels from
Updated_Prakriti_With_Features.csv (Kaggle: adityaprashantshirke/prakriti-updated).
No synthetic or simulated columns are added.
"""

from __future__ import annotations

import datetime as dt
import json
import platform
import subprocess
import sys
from itertools import combinations
from pathlib import Path
from typing import Any, Callable, Dict, List, Sequence

import numpy as np
import pandas as pd
import scipy
import sklearn
import yaml
from scipy.stats import spearmanr
from sklearn.cluster import AgglomerativeClustering
from sklearn.metrics import adjusted_rand_score, normalized_mutual_info_score

# Ensure python_benchmark/ is importable when invoked from repo root or python_benchmark/
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from ayur_bench.data import load_config, load_tridosha_dataset
from ayur_bench.distances import (
    cosine_distance,
    euclidean_distance,
    gower_distance,
    hamming_distance,
)
from ayur_bench.evaluation import (
    evaluate_distance_matrix,
    evaluate_knn_cv,
    evaluate_loo_retrieval,
)
from ayur_bench.stats import compare_metrics_paired, summarize_scores
from generate_real_findings import write_real_findings_markdown

METRIC_DISPATCH: Dict[str, Callable[..., np.ndarray]] = {
    "gower": gower_distance,
    "euclidean": euclidean_distance,
    "cosine": cosine_distance,
    "hamming": hamming_distance,
}


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


def compute_distance(metric_name: str, X: pd.DataFrame) -> np.ndarray:
    fn = METRIC_DISPATCH[metric_name]
    if metric_name == "hamming":
        return fn(X, categorical_cols=list(X.columns))
    return fn(X, numeric_cols=[], categorical_cols=list(X.columns))


def _minmax_rescale(vec: np.ndarray) -> np.ndarray:
    vmin = float(np.min(vec))
    vmax = float(np.max(vec))
    span = vmax - vmin
    if span <= 0.0:
        return np.zeros_like(vec, dtype=np.float64)
    return (vec - vmin) / span


def _top_k_indices(D: np.ndarray, k: int = 5) -> np.ndarray:
    D_work = D.copy()
    np.fill_diagonal(D_work, np.inf)
    return np.argsort(D_work, axis=1, kind="mergesort")[:, :k]


def tie_diagnostics(D: np.ndarray, k: int = 5) -> Dict[str, int]:
    """Count exact float64 tied distance pairs and top-k boundary tie rows."""
    n = D.shape[0]
    tri = D[np.triu_indices(n, k=1)]
    n_pairs = int(tri.size)
    n_unique = int(np.unique(tri).size)
    tied_pairs = int(n_pairs - n_unique)

    D_work = D.copy()
    np.fill_diagonal(D_work, np.inf)
    sorted_d = np.sort(D_work, axis=1, kind="mergesort")
    boundary_tie_rows = int(np.sum(sorted_d[:, k - 1] == sorted_d[:, k]))

    return {
        "n_pairs": n_pairs,
        "n_unique_distances": n_unique,
        "tied_distance_pairs": tied_pairs,
        "top5_boundary_tie_rows": boundary_tie_rows,
    }


def run_equivalence_analysis(
    X: pd.DataFrame, metric_names: Sequence[str]
) -> tuple[List[Dict[str, Any]], Dict[str, np.ndarray]]:
    """Compute pairwise Spearman rho, min-max rescaled max abs diff, and mean top-5 overlap."""
    matrices = {m: compute_distance(m, X) for m in metric_names}
    tri_idx = np.triu_indices(len(X), k=1)
    tri_vecs = {m: matrices[m][tri_idx] for m in metric_names}
    rescaled = {m: _minmax_rescale(tri_vecs[m]) for m in metric_names}
    top5 = {m: _top_k_indices(matrices[m], k=5) for m in metric_names}

    rows: List[Dict[str, Any]] = []
    for m_a, m_b in combinations(metric_names, 2):
        rho = float(spearmanr(tri_vecs[m_a], tri_vecs[m_b]).statistic)
        max_abs_diff = float(np.max(np.abs(rescaled[m_a] - rescaled[m_b])))

        overlaps = [
            len(set(top5[m_a][i].tolist()).intersection(top5[m_b][i].tolist())) / 5.0
            for i in range(len(X))
        ]
        mean_overlap = float(np.mean(overlaps))

        rows.append(
            {
                "metric_a": m_a,
                "metric_b": m_b,
                "spearman_rho": rho,
                "max_abs_diff_minmax": max_abs_diff,
                "mean_top5_overlap": mean_overlap,
            }
        )
    return rows, matrices


def run_trait_subsets(
    X: pd.DataFrame,
    y: np.ndarray,
    cfg: Dict[str, Any],
    full_matrices: Dict[str, np.ndarray],
) -> Dict[str, Any]:
    """Evaluate random m-trait subsets across m in [3, 5, 8, 12, 20, 29] with fixed seeds."""
    exp_cfg = cfg["experiment_real"]
    eval_cfg = cfg["evaluation"]
    knn_cfg = eval_cfg["knn"]
    linkages = tuple(eval_cfg["clustering"]["linkages"])
    metrics = list(exp_cfg["metrics"])
    subset_sizes = [int(m) for m in exp_cfg["subset_sizes"]]
    n_subsets_per_m = int(exp_cfg["n_subsets_per_m"])
    seed_base = int(exp_cfg["subset_seed_base"])

    all_cols = list(X.columns)
    n_classes = int(len(np.unique(y)))
    summary_rows: List[Dict[str, Any]] = []
    seeds_used: Dict[str, List[int]] = {}

    for m in subset_sizes:
        n_eff = 1 if m == len(all_cols) else n_subsets_per_m
        m_seeds = [seed_base + m * 100 + s for s in range(n_eff)]
        seeds_used[str(m)] = m_seeds

        per_metric_runs: Dict[str, Dict[str, List[float]]] = {
            metric: {
                "knn_macro_f1": [],
                "loo_macro_p5": [],
                "ari_average": [],
                "nmi_average": [],
                "ari_complete": [],
                "nmi_complete": [],
                "tied_distance_pairs": [],
                "n_unique_distances": [],
                "top5_boundary_tie_rows": [],
            }
            for metric in metrics
        }

        for s_idx, seed in enumerate(m_seeds):
            if m == len(all_cols):
                chosen_cols = all_cols
            else:
                rng = np.random.default_rng(seed)
                chosen_idx = np.sort(rng.choice(len(all_cols), size=m, replace=False))
                chosen_cols = [all_cols[i] for i in chosen_idx]
            X_sub = X[chosen_cols]

            for metric in metrics:
                D = full_matrices[metric] if m == len(all_cols) else compute_distance(metric, X_sub)
                ties = tie_diagnostics(D, k=5)

                knn_res = evaluate_knn_cv(
                    D,
                    y,
                    n_neighbors=int(knn_cfg["n_neighbors"]),
                    n_splits=int(knn_cfg["n_splits"]),
                    n_repeats=int(knn_cfg["n_repeats"]),
                    random_state=int(knn_cfg["random_state"]),
                )
                loo_res = evaluate_loo_retrieval(D, y, ks=(5,), smallest_n_classes=3)

                b = per_metric_runs[metric]
                b["knn_macro_f1"].append(knn_res["macro_f1_mean"])
                b["loo_macro_p5"].append(loo_res["macro"]["p_at_5"])
                b["tied_distance_pairs"].append(float(ties["tied_distance_pairs"]))
                b["n_unique_distances"].append(float(ties["n_unique_distances"]))
                b["top5_boundary_tie_rows"].append(float(ties["top5_boundary_tie_rows"]))

                for linkage in linkages:
                    preds = AgglomerativeClustering(
                        n_clusters=n_classes,
                        metric="precomputed",
                        linkage=linkage,
                    ).fit_predict(D)
                    b[f"ari_{linkage}"].append(float(adjusted_rand_score(y, preds)))
                    b[f"nmi_{linkage}"].append(float(normalized_mutual_info_score(y, preds)))

        for metric in metrics:
            b = per_metric_runs[metric]
            row = {
                "m_traits": m,
                "n_subsets": n_eff,
                "metric": metric,
            }
            for key, vals in b.items():
                st = summarize_scores(vals)
                row[f"{key}_mean"] = st["mean"]
                row[f"{key}_std"] = st["std"]
            summary_rows.append(row)
        print(f"  [subsets] Completed m={m:2d} ({n_eff} subset{'s' if n_eff > 1 else ''})")

    return {
        "subset_sizes": subset_sizes,
        "n_subsets_per_m_config": n_subsets_per_m,
        "seeds_by_m": seeds_used,
        "summary": summary_rows,
    }


def run_shuffled_control(
    matrices: Dict[str, np.ndarray],
    y: np.ndarray,
    cfg: Dict[str, Any],
) -> Dict[str, Any]:
    """Run shuffled-label sanity check; raise immediately if any metric is well above chance."""
    exp_cfg = cfg["experiment_real"]
    seed = int(exp_cfg["shuffled_control_seed"])
    checks = exp_cfg["shuffled_control_checks"]
    chance_p5 = float(checks["chance_macro_p5"])
    p5_tol = float(checks["macro_p5_tolerance"])
    f1_max = float(checks["knn_macro_f1_max"])

    rng = np.random.default_rng(seed)
    y_shuf = rng.permutation(y)

    per_metric: Dict[str, Any] = {}
    all_passed = True

    for metric in exp_cfg["metrics"]:
        ev = evaluate_distance_matrix(matrices[metric], y_shuf, config=cfg)
        obs_p5 = ev["loo_retrieval"]["macro"]["p_at_5"]
        obs_f1 = ev["knn_cv"]["macro_f1_mean"]
        p5_ok = abs(obs_p5 - chance_p5) <= p5_tol
        f1_ok = obs_f1 <= f1_max
        passed = bool(p5_ok and f1_ok)
        if not passed:
            all_passed = False

        per_metric[metric] = {
            "knn_macro_f1_mean": obs_f1,
            "knn_macro_f1_std": ev["knn_cv"]["macro_f1_std"],
            "knn_accuracy_mean": ev["knn_cv"]["accuracy_mean"],
            "loo_macro_p_at_1": ev["loo_retrieval"]["macro"]["p_at_1"],
            "loo_macro_p_at_5": obs_p5,
            "loo_macro_p_at_10": ev["loo_retrieval"]["macro"]["p_at_10"],
            "ari_average": ev["clustering"]["linkages"]["average"]["ari"],
            "nmi_average": ev["clustering"]["linkages"]["average"]["nmi"],
            "ari_complete": ev["clustering"]["linkages"]["complete"]["ari"],
            "nmi_complete": ev["clustering"]["linkages"]["complete"]["nmi"],
            "passed": passed,
        }

    result = {
        "seed": seed,
        "chance_macro_p5": chance_p5,
        "macro_p5_tolerance": p5_tol,
        "knn_macro_f1_max": f1_max,
        "all_passed": all_passed,
        "metrics": per_metric,
    }

    if not all_passed:
        raise RuntimeError(
            f"SHUFFLED-LABEL CONTROL FAILED! Possible label leakage detected:\n{json.dumps(result, indent=2)}"
        )
    return result


def main() -> None:
    cfg = load_config()
    exp_cfg = cfg["experiment_real"]
    bundle = load_tridosha_dataset()
    X = bundle.X
    y = bundle.y.to_numpy()

    print(
        f"[Experiment A] Real Kaggle categorical data loaded: "
        f"N={len(X)}, p_cat={len(bundle.categorical_cols)}, p_num={len(bundle.numeric_cols)}, "
        f"duplicates={bundle.metadata['duplicate_row_count']} (retained)"
    )

    print("[1/4] Running pairwise equivalence analysis (gower, euclidean, cosine, hamming)...")
    equiv_rows, all_matrices = run_equivalence_analysis(X, exp_cfg["equivalence_metrics"])

    print("[2/4] Evaluating full 29 traits (gower, euclidean, cosine)...")
    full_eval: Dict[str, Any] = {}
    for metric in exp_cfg["metrics"]:
        ev = evaluate_distance_matrix(all_matrices[metric], y, config=cfg)
        ev["ties"] = tie_diagnostics(all_matrices[metric], k=5)
        full_eval[metric] = ev

    full_stats = {
        "knn_macro_f1_paired": compare_metrics_paired(
            {m: full_eval[m]["knn_cv"]["fold_macro_f1"] for m in exp_cfg["metrics"]},
            alpha=float(cfg["stats"]["alpha"]),
        ),
        "knn_accuracy_paired": compare_metrics_paired(
            {m: full_eval[m]["knn_cv"]["fold_accuracy"] for m in exp_cfg["metrics"]},
            alpha=float(cfg["stats"]["alpha"]),
        ),
    }

    print("[3/4] Running trait-subset experiments (m in [3, 5, 8, 12, 20, 29])...")
    subset_results = run_trait_subsets(X, y, cfg, all_matrices)

    print("[4/4] Running shuffled-label control...")
    shuffled_results = run_shuffled_control(all_matrices, y, cfg)
    print("  [control] Shuffled-label control PASSED for all metrics.")

    payload = {
        "experiment": "Experiment A — Real Categorical Data Only (Updated_Prakriti_With_Features.csv)",
        "provenance": {
            "timestamp_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
            "git": get_git_info(REPO_ROOT),
            "python_version": platform.python_version(),
            "library_versions": {
                "numpy": np.__version__,
                "pandas": pd.__version__,
                "scipy": scipy.__version__,
                "scikit_learn": sklearn.__version__,
                "pyyaml": yaml.__version__,
            },
            "seeds": {
                "knn_cv_random_state": int(cfg["evaluation"]["knn"]["random_state"]),
                "subset_seed_base": int(exp_cfg["subset_seed_base"]),
                "shuffled_control_seed": int(exp_cfg["shuffled_control_seed"]),
            },
            "config": cfg,
            "dataset_metadata": bundle.metadata,
        },
        "equivalence": equiv_rows,
        "full_29_traits": {
            "metrics": full_eval,
            "paired_stats": full_stats,
        },
        "trait_subsets": subset_results,
        "shuffled_control": shuffled_results,
    }

    out_dir = REPO_ROOT / exp_cfg["output_dir"]
    out_dir.mkdir(parents=True, exist_ok=True)
    json_path = out_dir / "real_data.json"
    with open(json_path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2)

    # Export CSV tables strictly from computed objects
    pd.DataFrame(equiv_rows).to_csv(out_dir / "real_data_equivalence.csv", index=False)

    full29_rows = []
    for m in exp_cfg["metrics"]:
        ev = full_eval[m]
        smallest = ev["loo_retrieval"]["smallest_classes"]
        row = {
            "metric": m,
            "knn_macro_f1_mean": ev["knn_cv"]["macro_f1_mean"],
            "knn_macro_f1_std": ev["knn_cv"]["macro_f1_std"],
            "knn_accuracy_mean": ev["knn_cv"]["accuracy_mean"],
            "knn_accuracy_std": ev["knn_cv"]["accuracy_std"],
            "loo_macro_p_at_1": ev["loo_retrieval"]["macro"]["p_at_1"],
            "loo_macro_p_at_5": ev["loo_retrieval"]["macro"]["p_at_5"],
            "loo_macro_p_at_10": ev["loo_retrieval"]["macro"]["p_at_10"],
            "ari_average": ev["clustering"]["linkages"]["average"]["ari"],
            "nmi_average": ev["clustering"]["linkages"]["average"]["nmi"],
            "silhouette_average_not_comparable": ev["clustering"]["linkages"]["average"]["silhouette"],
            "ari_complete": ev["clustering"]["linkages"]["complete"]["ari"],
            "nmi_complete": ev["clustering"]["linkages"]["complete"]["nmi"],
            "silhouette_complete_not_comparable": ev["clustering"]["linkages"]["complete"]["silhouette"],
            "tied_distance_pairs": ev["ties"]["tied_distance_pairs"],
            "top5_boundary_tie_rows": ev["ties"]["top5_boundary_tie_rows"],
        }
        for cls_name, cls_stats in smallest.items():
            row[f"smallest_{cls_name}_p_at_5"] = cls_stats["p_at_5"]
        full29_rows.append(row)
    pd.DataFrame(full29_rows).to_csv(out_dir / "real_data_full29.csv", index=False)

    pd.DataFrame(subset_results["summary"]).to_csv(out_dir / "real_data_subsets.csv", index=False)

    shuf_rows = [{"metric": m, **vals} for m, vals in shuffled_results["metrics"].items()]
    pd.DataFrame(shuf_rows).to_csv(out_dir / "real_data_shuffled_control.csv", index=False)

    # Generate docs/REAL_DATA_FINDINGS.md strictly by reading results/real_data.json (R1)
    findings_path = REPO_ROOT / exp_cfg["findings_doc"]
    write_real_findings_markdown(json_path, findings_path)

    print(f"[Done] Wrote {json_path}, CSVs in {out_dir}, and {findings_path}")


if __name__ == "__main__":
    main()
