#!/usr/bin/env python3
"""
Experiment B — SYNTHETIC/SIMULATED Mixed-Type Distance Benchmark (OFAT Sweeps).

WARNING (Rule R4): All cohorts and metrics produced by this script are SYNTHETIC/SIMULATED.
Results describe metric behaviour on the controlled generator in ayur_bench.synth.generator,
NOT on real Ayurvedic patients.
"""

from __future__ import annotations

import datetime as dt
import hashlib
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
import yaml

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from ayur_bench.data import load_config
from ayur_bench.distances import cosine_distance, euclidean_distance, gower_distance
from ayur_bench.evaluation import evaluate_distance_matrix
from ayur_bench.stats import compare_metrics_paired, summarize_scores
from ayur_bench.synth import NUMERIC_VITAL_COLS, generate
from generate_synthetic_findings import write_synthetic_findings_markdown

METRIC_DISPATCH: Dict[str, Callable[..., np.ndarray]] = {
    "gower": gower_distance,
    "euclidean": euclidean_distance,
    "cosine": cosine_distance,
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


def build_ofat_design(cfg: Dict[str, Any]) -> Tuple[Dict[str, Dict[str, Any]], Dict[str, List[str]]]:
    """
    Build unique OFAT parameter cells plus mapping from each sweep name to its ordered cell IDs.
    Baseline cell is shared across all sweeps so it is computed once and reused everywhere.
    """
    exp = cfg["experiment_synthetic"]
    baseline = dict(exp["baseline"])
    sweeps_cfg = exp["sweeps"]

    unique_cells: Dict[str, Dict[str, Any]] = {}
    base_id = make_cell_id(baseline)
    unique_cells[base_id] = dict(baseline)

    sweep_to_cells: Dict[str, List[str]] = {}
    for sweep_param, values in sweeps_cfg.items():
        cell_ids: List[str] = []
        for val in values:
            cell_params = dict(baseline)
            cell_params[sweep_param] = int(val) if sweep_param == "m_traits" else float(val)
            cid = make_cell_id(cell_params)
            if cid not in unique_cells:
                unique_cells[cid] = cell_params
            cell_ids.append(cid)
        sweep_to_cells[sweep_param] = cell_ids

    return unique_cells, sweep_to_cells


def _reconstruct_symmetric(tri_vec: np.ndarray, n: int) -> np.ndarray:
    D = np.zeros((n, n), dtype=np.float64)
    idx = np.triu_indices(n, k=1)
    D[idx] = tri_vec
    D[(idx[1], idx[0])] = tri_vec
    return D


def _load_or_compute_matrices(
    cell_id: str,
    cell_params: Dict[str, Any],
    seed: int,
    cfg: Dict[str, Any],
    cache_dir: Path,
) -> Tuple[Dict[str, np.ndarray], np.ndarray, np.ndarray]:
    """
    Generate synthetic cohort for (cell_id, seed) and load/save lossless upper-triangle
    distance matrices in cache_dir per (cell, seed).
    """
    gen_overrides = {
        "categorical_eps": float(cell_params["categorical_eps"]),
        "numeric_cohens_d": float(cell_params["numeric_cohens_d"]),
        "outlier_fraction": float(cell_params["outlier_fraction"]),
        "missing_fraction": float(cell_params["missing_fraction"]),
        "label_noise_rate": float(cell_params["label_noise_rate"]),
    }
    df, meta = generate(cfg, seed=seed, overrides=gen_overrides)
    y_eval = df["eval_label"].to_numpy()
    y_latent = df["latent_class"].to_numpy()

    all_cat_cols = list(meta["categorical_cols"])
    m_traits = int(cell_params["m_traits"])
    if m_traits < len(all_cat_cols):
        sub_rng = np.random.default_rng(seed + 100000 + m_traits)
        chosen_idx = np.sort(sub_rng.choice(len(all_cat_cols), size=m_traits, replace=False))
        chosen_cat = [all_cat_cols[i] for i in chosen_idx]
    else:
        chosen_cat = all_cat_cols

    X = df[NUMERIC_VITAL_COLS + chosen_cat]
    n = len(X)

    cache_key = hashlib.md5(f"{cell_id}_seed{seed}".encode("utf-8")).hexdigest()[:12]
    cache_file = cache_dir / f"{cell_id}_s{seed}_{cache_key}.npz"
    metrics = list(cfg["experiment_synthetic"]["metrics"])

    if cache_file.exists():
        loaded = np.load(cache_file)
        matrices = {m: _reconstruct_symmetric(loaded[m], n) for m in metrics}
        return matrices, y_eval, y_latent

    matrices: Dict[str, np.ndarray] = {}
    tri_idx = np.triu_indices(n, k=1)
    to_save: Dict[str, np.ndarray] = {}
    for m in metrics:
        D = METRIC_DISPATCH[m](X, numeric_cols=NUMERIC_VITAL_COLS, categorical_cols=chosen_cat)
        matrices[m] = D
        to_save[m] = D[tri_idx]

    cache_dir.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(cache_file, **to_save)
    return matrices, y_eval, y_latent


def evaluate_single_cell_seed(
    cell_id: str,
    cell_params: Dict[str, Any],
    seed: int,
    cfg: Dict[str, Any],
    cache_dir_str: str,
) -> Dict[str, Any]:
    """Worker routine executed in parallel via joblib for one (cell, seed)."""
    cache_dir = Path(cache_dir_str)
    matrices, y_eval, _ = _load_or_compute_matrices(cell_id, cell_params, seed, cfg, cache_dir)
    metrics = list(cfg["experiment_synthetic"]["metrics"])

    out: Dict[str, Any] = {"cell_id": cell_id, "seed": int(seed), "metrics": {}}
    for m in metrics:
        ev = evaluate_distance_matrix(matrices[m], y_eval, config=cfg)
        out["metrics"][m] = {
            "knn_macro_f1": ev["knn_cv"]["macro_f1_mean"],
            "knn_accuracy": ev["knn_cv"]["accuracy_mean"],
            "loo_macro_p_at_1": ev["loo_retrieval"]["macro"]["p_at_1"],
            "loo_macro_p_at_5": ev["loo_retrieval"]["macro"]["p_at_5"],
            "loo_macro_p_at_10": ev["loo_retrieval"]["macro"]["p_at_10"],
            "smallest_classes": ev["loo_retrieval"]["smallest_classes"],
            "ari_average": ev["clustering"]["linkages"]["average"]["ari"],
            "nmi_average": ev["clustering"]["linkages"]["average"]["nmi"],
            "silhouette_average_not_comparable": ev["clustering"]["linkages"]["average"]["silhouette"],
            "ari_complete": ev["clustering"]["linkages"]["complete"]["ari"],
            "nmi_complete": ev["clustering"]["linkages"]["complete"]["nmi"],
            "silhouette_complete_not_comparable": ev["clustering"]["linkages"]["complete"]["silhouette"],
        }
    return out


def determine_unique_winner(paired_result: Dict[str, Any]) -> str:
    """
    A metric wins ONLY if it has strictly higher mean AND Holm-adjusted p < alpha
    against EVERY other metric. Otherwise returns 'none (not significant / tie)'.
    """
    summaries = paired_result["summaries"]
    pairwise = paired_result["pairwise"]
    metrics = list(summaries.keys())

    # Check if top-mean metric significantly beats every other metric after Holm correction
    ranked = sorted(metrics, key=lambda m: summaries[m]["mean"], reverse=True)
    leader = ranked[0]
    beats_all = True
    for other in ranked[1:]:
        match = next(
            r
            for r in pairwise
            if {r["metric_a"], r["metric_b"]} == {leader, other}
        )
        diff_leader_minus_other = (
            match["mean_diff"] if match["metric_a"] == leader else -match["mean_diff"]
        )
        if not (match["significant_holm"] and diff_leader_minus_other > 0.0):
            beats_all = False
            break

    return leader if beats_all else "none (not significant / tie)"


def run_baseline_shuffled_control(
    baseline_id: str,
    baseline_params: Dict[str, Any],
    cfg: Dict[str, Any],
    cache_dir: Path,
) -> Dict[str, Any]:
    """Run shuffled-label control on the baseline synthetic cell."""
    exp = cfg["experiment_synthetic"]
    ctrl_seed = int(exp["shuffled_control_seed"])
    checks = exp["shuffled_control_checks"]
    chance_p5 = float(checks["chance_macro_p5"])
    p5_tol = float(checks["macro_p5_tolerance"])
    f1_max = float(checks["knn_macro_f1_max"])

    matrices, y_eval, _ = _load_or_compute_matrices(
        baseline_id, baseline_params, int(exp["seed_base"]), cfg, cache_dir
    )
    rng = np.random.default_rng(ctrl_seed)
    y_shuf = rng.permutation(y_eval)

    per_metric: Dict[str, Any] = {}
    all_passed = True
    for m in exp["metrics"]:
        ev = evaluate_distance_matrix(matrices[m], y_shuf, config=cfg)
        obs_p5 = ev["loo_retrieval"]["macro"]["p_at_5"]
        obs_f1 = ev["knn_cv"]["macro_f1_mean"]
        passed = bool(abs(obs_p5 - chance_p5) <= p5_tol and obs_f1 <= f1_max)
        if not passed:
            all_passed = False
        per_metric[m] = {
            "knn_macro_f1_mean": obs_f1,
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
        "cell_id": baseline_id,
        "seed": ctrl_seed,
        "chance_macro_p5": chance_p5,
        "macro_p5_tolerance": p5_tol,
        "knn_macro_f1_max": f1_max,
        "all_passed": all_passed,
        "metrics": per_metric,
    }
    if not all_passed:
        raise RuntimeError(
            f"SYNTHETIC SHUFFLED-LABEL CONTROL FAILED!\n{json.dumps(result, indent=2)}"
        )
    return result


def main() -> None:
    t_start = time.perf_counter()
    cfg = load_config()
    exp = cfg["experiment_synthetic"]
    metrics = list(exp["metrics"])
    alpha = float(cfg["stats"]["alpha"])
    cache_dir = REPO_ROOT / exp["cache_dir"]
    cache_dir.mkdir(parents=True, exist_ok=True)

    unique_cells, sweep_to_cells = build_ofat_design(cfg)
    baseline_params = dict(exp["baseline"])
    baseline_id = make_cell_id(baseline_params)

    n_cpus = os.cpu_count() or 1
    cfg_jobs = int(exp.get("n_jobs", -1))
    n_jobs = min(6, n_cpus) if cfg_jobs == -1 else max(1, cfg_jobs)

    # Probe runtime on 1 (baseline, seed_0) task to check against 60-minute budget
    seed_base = int(exp["seed_base"])
    t0 = time.perf_counter()
    probe_result = evaluate_single_cell_seed(
        baseline_id, baseline_params, seed_base, cfg, str(cache_dir)
    )
    t_one = time.perf_counter() - t0

    requested_seeds = int(exp["n_seeds"])
    est_total_minutes = (t_one * len(unique_cells) * requested_seeds) / (n_jobs * 60.0)
    reduced_seeds = False
    if est_total_minutes > float(exp["max_estimated_minutes"]):
        n_seeds = int(exp["fallback_n_seeds"])
        reduced_seeds = True
        print(
            f"[Runtime Guard] Estimated {est_total_minutes:.1f} min > 60 min; "
            f"reducing from {requested_seeds} to {n_seeds} seeds."
        )
    else:
        n_seeds = requested_seeds

    seeds = [seed_base + s for s in range(n_seeds)]
    print(
        f"[Experiment B — SYNTHETIC/SIMULATED] {len(unique_cells)} unique OFAT cells × "
        f"{n_seeds} seeds = {len(unique_cells) * n_seeds} runs "
        f"(probe={t_one:.2f}s, est={est_total_minutes:.2f} min on {n_jobs} workers)"
    )

    # Build remaining tasks (skip already-computed probe task)
    tasks: List[Tuple[str, Dict[str, Any], int]] = []
    for cid, cparams in unique_cells.items():
        for seed in seeds:
            if cid == baseline_id and seed == seed_base:
                continue
            tasks.append((cid, cparams, seed))

    parallel_results = joblib.Parallel(n_jobs=n_jobs, prefer="processes", verbose=5)(
        joblib.delayed(evaluate_single_cell_seed)(cid, cparams, seed, cfg, str(cache_dir))
        for cid, cparams, seed in tasks
    )
    all_runs = [probe_result] + list(parallel_results)

    # Organize per-cell seed results
    runs_by_cell: Dict[str, List[Dict[str, Any]]] = {cid: [] for cid in unique_cells}
    for r in all_runs:
        runs_by_cell[r["cell_id"]].append(r)
    for cid in runs_by_cell:
        runs_by_cell[cid].sort(key=lambda x: x["seed"])

    scalar_keys = [
        "knn_macro_f1",
        "knn_accuracy",
        "loo_macro_p_at_1",
        "loo_macro_p_at_5",
        "loo_macro_p_at_10",
        "ari_average",
        "nmi_average",
        "silhouette_average_not_comparable",
        "ari_complete",
        "nmi_complete",
        "silhouette_complete_not_comparable",
    ]

    cells_output: Dict[str, Any] = {}
    for cid, cparams in unique_cells.items():
        c_runs = runs_by_cell[cid]
        per_metric_summary: Dict[str, Any] = {}
        per_metric_raw: Dict[str, Dict[str, List[float]]] = {
            m: {k: [] for k in scalar_keys} for m in metrics
        }
        for run in c_runs:
            for m in metrics:
                for k in scalar_keys:
                    per_metric_raw[m][k].append(float(run["metrics"][m][k]))

        for m in metrics:
            per_metric_summary[m] = {
                k: summarize_scores(per_metric_raw[m][k]) for k in scalar_keys
            }
            per_metric_summary[m]["silhouette_note"] = "not comparable across metrics"

        # Paired Wilcoxon + Holm per cell for every headline endpoint
        cell_stats: Dict[str, Any] = {}
        cell_winners: Dict[str, str] = {}
        for ep in HEADLINE_ENDPOINTS:
            paired = compare_metrics_paired(
                {m: per_metric_raw[m][ep] for m in metrics}, alpha=alpha
            )
            cell_stats[ep] = paired
            cell_winners[ep] = determine_unique_winner(paired)

        cells_output[cid] = {
            "cell_id": cid,
            "is_baseline": cid == baseline_id,
            "parameters": cparams,
            "n_seeds": n_seeds,
            "metrics": per_metric_summary,
            "per_seed_values": {
                m: {ep: per_metric_raw[m][ep] for ep in HEADLINE_ENDPOINTS} for m in metrics
            },
            "paired_stats": cell_stats,
            "winners": cell_winners,
        }

    # Pooled per-sweep paired Wilcoxon + Holm across all (cell, seed) pairs in each sweep
    sweeps_output: Dict[str, Any] = {}
    for sweep_name, cids in sweep_to_cells.items():
        sweep_stats: Dict[str, Any] = {}
        sweep_winners: Dict[str, str] = {}
        for ep in HEADLINE_ENDPOINTS:
            pooled = {m: [] for m in metrics}
            for cid in cids:
                for m in metrics:
                    pooled[m].extend(cells_output[cid]["per_seed_values"][m][ep])
            paired = compare_metrics_paired(pooled, alpha=alpha)
            sweep_stats[ep] = paired
            sweep_winners[ep] = determine_unique_winner(paired)
        sweeps_output[sweep_name] = {
            "parameter": sweep_name,
            "values": exp["sweeps"][sweep_name],
            "cell_ids": cids,
            "n_paired_observations": len(cids) * n_seeds,
            "pooled_paired_stats": sweep_stats,
            "pooled_winners": sweep_winners,
        }

    # Shuffled-label control on baseline cell
    print("[Control] Running shuffled-label control on baseline synthetic cell...")
    shuffled_control = run_baseline_shuffled_control(baseline_id, baseline_params, cfg, cache_dir)
    print("  [Control] PASSED for all metrics.")

    total_runtime_sec = time.perf_counter() - t_start

    payload = {
        "experiment": "Experiment B — SYNTHETIC/SIMULATED Mixed-Type OFAT Benchmark",
        "data_origin": "SYNTHETIC/SIMULATED",
        "warning": (
            "All cohorts and numbers in this file are SYNTHETIC/SIMULATED. "
            "Results describe metric behaviour on ayur_bench.synth.generator, not real patients."
        ),
        "provenance": {
            "timestamp_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
            "git": get_git_info(REPO_ROOT),
            "python_version": platform.python_version(),
            "library_versions": {
                "numpy": np.__version__,
                "pandas": pd.__version__,
                "scipy": scipy.__version__,
                "scikit_learn": sklearn.__version__,
                "joblib": joblib.__version__,
                "pyyaml": yaml.__version__,
            },
            "runtime_seconds": round(total_runtime_sec, 2),
            "probe_single_task_seconds": round(t_one, 2),
            "estimated_minutes_at_requested_seeds": round(est_total_minutes, 2),
            "n_jobs": n_jobs,
            "n_seeds_used": n_seeds,
            "seeds_reduced_for_runtime": reduced_seeds,
            "seeds": seeds,
            "baseline_cell_id": baseline_id,
            "config": cfg,
        },
        "sweeps": sweeps_output,
        "cells": cells_output,
        "shuffled_control": shuffled_control,
    }

    out_dir = REPO_ROOT / exp["output_dir"]
    out_dir.mkdir(parents=True, exist_ok=True)
    json_path = out_dir / "synthetic.json"
    with open(json_path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2)

    # Export CSVs
    cell_csv_rows: List[Dict[str, Any]] = []
    pairwise_csv_rows: List[Dict[str, Any]] = []
    for sweep_name, s_info in sweeps_output.items():
        for val, cid in zip(s_info["values"], s_info["cell_ids"]):
            cell = cells_output[cid]
            for m in metrics:
                ms = cell["metrics"][m]
                row = {
                    "data_origin": "SYNTHETIC/SIMULATED",
                    "sweep": sweep_name,
                    "sweep_value": val,
                    "cell_id": cid,
                    "is_baseline": cell["is_baseline"],
                    "metric": m,
                    "n_seeds": n_seeds,
                }
                for k in scalar_keys:
                    row[f"{k}_mean"] = ms[k]["mean"]
                    row[f"{k}_std"] = ms[k]["std"]
                cell_csv_rows.append(row)

            for ep in HEADLINE_ENDPOINTS:
                for pr in cell["paired_stats"][ep]["pairwise"]:
                    pairwise_csv_rows.append(
                        {
                            "data_origin": "SYNTHETIC/SIMULATED",
                            "sweep": sweep_name,
                            "sweep_value": val,
                            "cell_id": cid,
                            "endpoint": ep,
                            "winner": cell["winners"][ep],
                            **pr,
                        }
                    )

    pd.DataFrame(cell_csv_rows).to_csv(out_dir / "synthetic_cells.csv", index=False)
    pd.DataFrame(pairwise_csv_rows).to_csv(out_dir / "synthetic_pairwise_stats.csv", index=False)

    sweep_stat_rows: List[Dict[str, Any]] = []
    for sweep_name, s_info in sweeps_output.items():
        for ep in HEADLINE_ENDPOINTS:
            for pr in s_info["pooled_paired_stats"][ep]["pairwise"]:
                sweep_stat_rows.append(
                    {
                        "data_origin": "SYNTHETIC/SIMULATED",
                        "sweep": sweep_name,
                        "endpoint": ep,
                        "pooled_winner": s_info["pooled_winners"][ep],
                        "n_paired_observations": s_info["n_paired_observations"],
                        **pr,
                    }
                )
    pd.DataFrame(sweep_stat_rows).to_csv(out_dir / "synthetic_sweep_stats.csv", index=False)

    shuf_rows = [{"data_origin": "SYNTHETIC/SIMULATED", "metric": m, **v} for m, v in shuffled_control["metrics"].items()]
    pd.DataFrame(shuf_rows).to_csv(out_dir / "synthetic_shuffled_control.csv", index=False)

    # Auto-generate docs/SYNTHETIC_FINDINGS.md strictly from results/synthetic.json (Rule R1)
    findings_path = REPO_ROOT / exp["findings_doc"]
    write_synthetic_findings_markdown(json_path, findings_path)

    print(
        f"[Done] Total runtime: {total_runtime_sec:.1f}s ({total_runtime_sec/60:.2f} min). "
        f"Wrote {json_path}, CSVs in {out_dir}, and {findings_path}"
    )


if __name__ == "__main__":
    main()
