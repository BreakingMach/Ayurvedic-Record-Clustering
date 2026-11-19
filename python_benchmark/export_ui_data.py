#!/usr/bin/env python3
"""
Export verified UI datasets and precomputed analytical artifacts into public/data/.

Rules & Constraints:
- R1: Zero hand-typed numbers; all numbers derived from verified Python pipelines.
- R10: Non-diagnostic language ('labels of nearest dataset records', not diagnosis).
- R11: Embedded mandatory notice: 'Research prototype on a dataset of unverified origin. Not a diagnostic tool.'
- R12: Never defaults to or highlights a 'best' metric, clustering, or k chosen by label-based scores.
- R13: Clean JSON schema optimized for browser-side deterministic querying without network dependencies.

Exports generated:
  1. real_records.json & synthetic_records.json
  2. embeddings.json (2D MDS scaled to [0, 1], 'visualisation only; not evidence')
  3. clusterings.json (average & complete linkage, k in 3..8, cluster labels, ARI, NMI, contingency tables)
  4. descriptive.json (Cramér's V, trait frequencies, 50-bin distance histograms, LOO kNN k=5 confusion matrices, 240-record sample)
  5. Invariance note across metric evaluation families
"""

from __future__ import annotations

import datetime as dt
import json
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List, Sequence, Tuple

import numpy as np
import pandas as pd
from scipy.spatial.distance import cdist
from scipy.stats import chi2_contingency
from sklearn.cluster import AgglomerativeClustering
from sklearn.manifold import MDS
from sklearn.metrics import adjusted_rand_score, confusion_matrix, normalized_mutual_info_score

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from ayur_bench.data import load_config, load_tridosha_dataset
from ayur_bench.distances import cosine_distance, euclidean_distance, gower_distance
from ayur_bench.synth import NUMERIC_VITAL_COLS

RESEARCH_PROTOTYPE_NOTICE = (
    "Research prototype on a dataset of unverified origin. Not a diagnostic tool."
)


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


def compute_bias_corrected_cramers_v(contingency: np.ndarray) -> Tuple[float, float, float]:
    """
    Bias-corrected Cramér's V (Bergsma 2013).
    Returns (cramers_v, chi2, p_val).
    """
    chi2, p_val, dof, _ = chi2_contingency(contingency)
    n = np.sum(contingency)
    r, k = contingency.shape
    if n <= 1:
        return 0.0, float(chi2), float(p_val)

    phi2 = chi2 / n
    phi2_corr = max(0.0, phi2 - ((r - 1) * (k - 1)) / (n - 1))
    r_corr = r - ((r - 1) ** 2) / (n - 1)
    k_corr = k - ((k - 1) ** 2) / (n - 1)
    denom = min(r_corr - 1.0, k_corr - 1.0)
    if denom <= 0.0:
        return 0.0, float(chi2), float(p_val)
    return float(np.sqrt(phi2_corr / denom)), float(chi2), float(p_val)


def export_records_and_metadata(
    out_dir: Path,
    cfg: Dict[str, Any],
    git_info: Dict[str, str],
) -> Tuple[pd.DataFrame, pd.Series, pd.DataFrame, pd.Series, List[str], List[str]]:
    # 1. Real records
    real_bundle = load_tridosha_dataset()
    X_real = real_bundle.X
    y_real = real_bundle.y
    cat_cols = list(real_bundle.categorical_cols)

    # Class ordering
    classes = list(cfg["dataset"]["class_order"])
    class_to_code = {c: i for i, c in enumerate(classes)}

    # Trait definitions and integer coding
    traits_meta: List[Dict[str, Any]] = []
    real_rows_coded: List[List[int]] = []
    real_level_maps: List[Dict[str, int]] = []

    for col in cat_cols:
        series_str = X_real[col].astype(str)
        levels = sorted(series_str.unique().tolist())
        lvl_map = {lvl: idx for idx, lvl in enumerate(levels)}
        real_level_maps.append(lvl_map)
        traits_meta.append({"name": col, "levels": levels})

    for i in range(len(X_real)):
        row_str = X_real.iloc[i]
        real_rows_coded.append([real_level_maps[j][str(row_str[col])] for j, col in enumerate(cat_cols)])

    real_labels_coded = [class_to_code[str(c)] for c in y_real.to_numpy()]

    real_records_obj = {
        "notice": RESEARCH_PROTOTYPE_NOTICE,
        "seed": 42,
        "git_commit": git_info["short_commit"],
        "config": {"source": "Updated_Prakriti_With_Features.csv", "n_records": len(X_real)},
        "traits": traits_meta,
        "classes": classes,
        "rows": real_rows_coded,
        "labels": real_labels_coded,
    }

    with open(out_dir / "real_records.json", "w", encoding="utf-8") as fh:
        json.dump(real_records_obj, fh, separators=(",", ":"))

    # Also build rich real_cases.json for DataPage and RetrievalPage
    trait_summaries: List[Dict[str, Any]] = []
    for col in cat_cols:
        vc = X_real[col].astype(str).value_counts()
        trait_summaries.append(
            {
                "name": col,
                "n_levels": int(len(vc)),
                "missing_count": int(X_real[col].isna().sum()),
                "levels": [{"level": str(k), "count": int(v)} for k, v in vc.items()],
            }
        )

    records = []
    for i in range(len(X_real)):
        row = X_real.iloc[i]
        records.append(
            {
                "row_idx": i,
                "case_id": f"R-{i + 1:04d}",
                "dataset_label": str(y_real.iloc[i]),
                "traits": [str(row[c]) for c in cat_cols],
            }
        )

    real_cases_obj = {
        "notice": RESEARCH_PROTOTYPE_NOTICE,
        "seed": 42,
        "git_commit": git_info["short_commit"],
        "source": real_bundle.metadata.get("kaggle_slug", "adityaprashantshirke/prakriti-updated"),
        "csv_member": real_bundle.metadata.get("csv_member", "Updated_Prakriti_With_Features.csv"),
        "config": {"source": "Updated_Prakriti_With_Features.csv", "n_records": len(X_real)},
        "categorical_cols": cat_cols,
        "traits": traits_meta,
        "classes": classes,
        "rows": real_rows_coded,
        "labels": real_labels_coded,
        "trait_summaries": trait_summaries,
        "records": records,
    }

    with open(out_dir / "real_cases.json", "w", encoding="utf-8") as fh:
        json.dump(real_cases_obj, fh, separators=(",", ":"))

    # 2. Synthetic records
    synth_path = REPO_ROOT / "Dataset" / "synthetic" / "synthetic_cases_default.csv"
    if not synth_path.exists():
        raise FileNotFoundError(f"Missing default synthetic dataset: {synth_path}")
    synth_df = pd.read_csv(synth_path)
    y_synth = synth_df["eval_label"]
    y_synth_latent = synth_df["latent_class"]

    synth_rows_obj: List[Dict[str, Any]] = []
    for i in range(len(synth_df)):
        row = synth_df.iloc[i]
        t_codes = [real_level_maps[j][str(row[col])] for j, col in enumerate(cat_cols)]
        vitals = [float(row[v]) if pd.notna(row[v]) else None for v in NUMERIC_VITAL_COLS]
        synth_rows_obj.append(
            {
                "traits": t_codes,
                "vitals": vitals,
                "latent_class": class_to_code[str(row["latent_class"])],
            }
        )

    synth_labels_coded = [class_to_code[str(c)] for c in y_synth.to_numpy()]

    synthetic_records_obj = {
        "notice": RESEARCH_PROTOTYPE_NOTICE,
        "is_simulated": True,
        "seed": 42,
        "git_commit": git_info["short_commit"],
        "config": {"source": "synthetic_cases_default.csv", "n_records": len(synth_df)},
        "traits": traits_meta,
        "vitals": NUMERIC_VITAL_COLS,
        "classes": classes,
        "rows": synth_rows_obj,
        "labels": synth_labels_coded,
    }

    with open(out_dir / "synthetic_records.json", "w", encoding="utf-8") as fh:
        json.dump(synthetic_records_obj, fh, separators=(",", ":"))

    # Copy raw synthetic default CSV
    shutil.copy2(synth_path, out_dir / "synthetic_cases_default.csv")

    return X_real, y_real, synth_df, y_synth, cat_cols, classes


def classical_mds(D: np.ndarray, n_components: int = 2) -> np.ndarray:
    """Classical Multidimensional Scaling (Principal Coordinate Analysis, PCoA)."""
    n = D.shape[0]
    H = np.eye(n, dtype=np.float64) - (np.ones((n, n), dtype=np.float64) / float(n))
    B = -0.5 * H.dot(D ** 2).dot(H)
    eigvals, eigvecs = np.linalg.eigh(B)
    idx = np.argsort(eigvals)[::-1]
    eigvals = eigvals[idx]
    eigvecs = eigvecs[:, idx]
    coords = np.zeros((n, n_components), dtype=np.float64)
    for c in range(n_components):
        if eigvals[c] > 0.0:
            coords[:, c] = eigvecs[:, c] * np.sqrt(eigvals[c])
    return coords


def export_embeddings(
    out_dir: Path,
    X_real: pd.DataFrame,
    synth_df: pd.DataFrame,
    cat_cols: List[str],
    git_info: Dict[str, str],
) -> Dict[str, Dict[str, np.ndarray]]:
    print("[export_ui_data] Computing 2D MDS embeddings (visualisation only)...")
    datasets_embed: Dict[str, Dict[str, List[List[float]]]] = {"real": {}, "synthetic": {}}
    distance_matrices: Dict[str, Dict[str, np.ndarray]] = {"real": {}, "synthetic": {}}

    # Real dataset matrices
    distance_matrices["real"]["gower"] = gower_distance(X_real, categorical_cols=cat_cols)
    distance_matrices["real"]["euclidean"] = euclidean_distance(X_real, categorical_cols=cat_cols)
    distance_matrices["real"]["cosine"] = cosine_distance(X_real, categorical_cols=cat_cols)

    # Synthetic dataset matrices
    X_synth = synth_df[NUMERIC_VITAL_COLS + cat_cols]
    distance_matrices["synthetic"]["gower"] = gower_distance(
        X_synth, numeric_cols=NUMERIC_VITAL_COLS, categorical_cols=cat_cols
    )
    distance_matrices["synthetic"]["euclidean"] = euclidean_distance(
        X_synth, numeric_cols=NUMERIC_VITAL_COLS, categorical_cols=cat_cols
    )
    distance_matrices["synthetic"]["cosine"] = cosine_distance(
        X_synth, numeric_cols=NUMERIC_VITAL_COLS, categorical_cols=cat_cols
    )

    for d_name in ("real", "synthetic"):
        for m_name in ("gower", "euclidean", "cosine"):
            D = distance_matrices[d_name][m_name]
            coords = classical_mds(D, n_components=2)
            # Scale coordinates strictly to [0, 1]
            x = coords[:, 0]
            y = coords[:, 1]
            x_min, x_max = float(x.min()), float(x.max())
            y_min, y_max = float(y.min()), float(y.max())
            x_scaled = (x - x_min) / (x_max - x_min) if x_max > x_min else np.zeros_like(x)
            y_scaled = (y - y_min) / (y_max - y_min) if y_max > y_min else np.zeros_like(y)
            coords_scaled = np.column_stack([np.round(x_scaled, 5), np.round(y_scaled, 5)]).tolist()
            datasets_embed[d_name][m_name] = coords_scaled

    embeddings_obj = {
        "notice": RESEARCH_PROTOTYPE_NOTICE,
        "note": "visualisation only; not evidence",
        "method": "Classical 2D MDS (Principal Coordinate Analysis, closed-form Torgerson-Gower)",
        "seed": 42,
        "git_commit": git_info["short_commit"],
        "datasets": datasets_embed,
    }

    with open(out_dir / "embeddings.json", "w", encoding="utf-8") as fh:
        json.dump(embeddings_obj, fh, separators=(",", ":"))

    return distance_matrices


def export_clusterings(
    out_dir: Path,
    distance_matrices: Dict[str, Dict[str, np.ndarray]],
    y_real: pd.Series,
    y_synth: pd.Series,
    classes: List[str],
    git_info: Dict[str, str],
) -> None:
    print("[export_ui_data] Computing exploratory clusterings for k in 3..8...")
    clusterings_data: Dict[str, Any] = {"real": {}, "synthetic": {}}
    k_range = list(range(3, 9))

    targets = {"real": y_real.to_numpy(), "synthetic": y_synth.to_numpy()}
    class_to_code = {c: i for i, c in enumerate(classes)}

    for d_name in ("real", "synthetic"):
        y_true = targets[d_name]
        y_true_codes = np.array([class_to_code[str(c)] for c in y_true], dtype=np.int64)

        for m_name in ("gower", "euclidean", "cosine"):
            clusterings_data[d_name][m_name] = {"average": {}, "complete": {}}
            D = distance_matrices[d_name][m_name]

            for linkage in ("average", "complete"):
                for k in k_range:
                    model = AgglomerativeClustering(n_clusters=k, metric="precomputed", linkage=linkage)
                    preds = model.fit_predict(D)
                    ari = float(adjusted_rand_score(y_true_codes, preds))
                    nmi = float(normalized_mutual_info_score(y_true_codes, preds))

                    # Contingency table shape: (k, len(classes))
                    contingency = np.zeros((k, len(classes)), dtype=int)
                    for pred_c, true_c in zip(preds, y_true_codes):
                        contingency[pred_c, true_c] += 1

                    clusterings_data[d_name][m_name][linkage][str(k)] = {
                        "k": k,
                        "ari": round(ari, 4),
                        "nmi": round(nmi, 4),
                        "cluster_sizes": [int(cnt) for cnt in np.bincount(preds, minlength=k).tolist()],
                        "labels": [int(p) for p in preds.tolist()],
                        "contingency_table": contingency.tolist(),
                    }

    clusterings_obj = {
        "notice": RESEARCH_PROTOTYPE_NOTICE,
        "note": "Descriptive exploratory clustering across all configurations. No selection of a best config (Rule R12).",
        "k_range": k_range,
        "classes": classes,
        "linkages": ["average", "complete"],
        "metrics": ["gower", "euclidean", "cosine"],
        "seed": 42,
        "git_commit": git_info["short_commit"],
        "clusterings": clusterings_data,
    }

    with open(out_dir / "clusterings.json", "w", encoding="utf-8") as fh:
        json.dump(clusterings_obj, fh, separators=(",", ":"))


def export_descriptive_and_samples(
    out_dir: Path,
    X_real: pd.DataFrame,
    y_real: pd.Series,
    distance_matrices: Dict[str, Dict[str, np.ndarray]],
    cat_cols: List[str],
    classes: List[str],
    git_info: Dict[str, str],
) -> None:
    print("[export_ui_data] Computing descriptive stats, distance histograms, and 240-record sample...")
    class_to_code = {c: i for i, c in enumerate(classes)}
    y_codes = np.array([class_to_code[str(c)] for c in y_real.to_numpy()], dtype=np.int64)
    n = len(X_real)

    # 1. Bias-corrected Cramér's V per trait vs label
    cramers_list: List[Dict[str, Any]] = []
    for col in cat_cols:
        series_codes = pd.Categorical(X_real[col].astype(str)).codes
        contingency = np.zeros((len(np.unique(series_codes)), len(classes)), dtype=int)
        for s_code, y_code in zip(series_codes, y_codes):
            contingency[s_code, y_code] += 1
        cv, chi2_val, p_val = compute_bias_corrected_cramers_v(contingency)
        cramers_list.append(
            {
                "trait": col,
                "cramers_v": round(cv, 4),
                "chi2": round(chi2_val, 2),
                "p_value": float(p_val),
                "flag": "descriptive, not used for weighting",
            }
        )

    # 2. Trait-level frequency by class
    trait_frequencies: Dict[str, Any] = {}
    for col in cat_cols:
        series = X_real[col].astype(str)
        levels = sorted(series.unique().tolist())
        freq_table = []
        for lvl in levels:
            lvl_mask = (series == lvl).to_numpy()
            counts_per_class = [int(np.sum(lvl_mask & (y_codes == c_idx))) for c_idx in range(len(classes))]
            total_lvl = int(np.sum(lvl_mask))
            freq_table.append(
                {
                    "level": lvl,
                    "total": total_lvl,
                    "class_counts": counts_per_class,
                }
            )
        trait_frequencies[col] = freq_table

    # 3. Histograms (50 bins) of intra-class vs inter-class pairwise distances per metric
    tri_i, tri_j = np.triu_indices(n, k=1)
    is_intra = y_codes[tri_i] == y_codes[tri_j]

    distance_histograms: Dict[str, Any] = {}
    for m_name in ("gower", "euclidean", "cosine"):
        D = distance_matrices["real"][m_name]
        d_vals = D[tri_i, tri_j]
        d_intra = d_vals[is_intra]
        d_inter = d_vals[~is_intra]

        max_val = float(np.max(d_vals))
        bin_edges = np.linspace(0.0, max_val, 51)
        intra_counts, _ = np.histogram(d_intra, bins=bin_edges)
        inter_counts, _ = np.histogram(d_inter, bins=bin_edges)

        bin_centers = 0.5 * (bin_edges[:-1] + bin_edges[1:])
        distance_histograms[m_name] = {
            "bin_centers": [round(float(b), 4) for b in bin_centers],
            "bin_edges": [round(float(b), 4) for b in bin_edges],
            "intra_class_counts": [int(c) for c in intra_counts],
            "inter_class_counts": [int(c) for c in inter_counts],
            "intra_mean": round(float(np.mean(d_intra)), 4),
            "intra_std": round(float(np.std(d_intra)), 4),
            "inter_mean": round(float(np.mean(d_inter)), 4),
            "inter_std": round(float(np.std(d_inter)), 4),
        }

    # 4. LOO kNN k=5 confusion matrices per metric
    confusion_matrices: Dict[str, Any] = {}
    for m_name in ("gower", "euclidean", "cosine"):
        D_work = distance_matrices["real"][m_name].copy()
        np.fill_diagonal(D_work, np.inf)
        order = np.argsort(D_work, axis=1, kind="mergesort")
        top5 = order[:, :5]
        top5_labels = y_codes[top5]

        preds = np.zeros(n, dtype=np.int64)
        for i in range(n):
            votes = np.bincount(top5_labels[i], minlength=len(classes))
            preds[i] = int(np.argmax(votes))

        cm = confusion_matrix(y_codes, preds, labels=list(range(len(classes))))
        confusion_matrices[m_name] = {
            "matrix": cm.tolist(),
            "classes": classes,
        }

    # 5. 240-record class-balanced sample (cap 40 per class, fixed seed 42)
    rng = np.random.default_rng(42)
    sample_indices: List[int] = []
    for c_idx in range(len(classes)):
        c_records = np.where(y_codes == c_idx)[0]
        n_choose = min(40, len(c_records))
        chosen = rng.choice(c_records, size=n_choose, replace=False)
        sample_indices.extend(chosen.tolist())
    sample_indices.sort()

    sample_matrix_rounded: Dict[str, List[List[float]]] = {}
    for m_name in ("gower", "euclidean", "cosine"):
        D_sub = distance_matrices["real"][m_name][np.ix_(sample_indices, sample_indices)]
        sample_matrix_rounded[m_name] = np.round(D_sub, 3).tolist()

    sample_obj = {
        "seed": 42,
        "n_samples": len(sample_indices),
        "indices": sample_indices,
        "class_codes": [int(y_codes[i]) for i in sample_indices],
        "class_labels": [str(classes[y_codes[i]]) for i in sample_indices],
        "distance_matrices": sample_matrix_rounded,
    }

    # 6. Real-data Invariance Note
    invariance_note = {
        "invariant_families": [
            "kNN (k-Nearest Neighbors classification & ranking)",
            "Leave-One-Out Retrieval Precision@k",
            "Complete-Linkage Hierarchical Agglomerative Clustering",
        ],
        "non_invariant_families": [
            "Average-Linkage Hierarchical Clustering",
            "Silhouette Score",
            "Multidimensional Scaling (MDS) Embeddings",
        ],
        "mathematical_basis": (
            "On purely categorical records (no numeric vitals), Gower, Euclidean (one-hot), and Cosine (one-hot) "
            "are exact monotonic transformations of Hamming distance: D_cosine = D_gower = D_hamming / p, and "
            "D_euclid = sqrt(2 * D_hamming) = sqrt(2p * D_gower). Consequently, all evaluation protocols that "
            "depend strictly on the rank-order of distances (kNN classification, precision@k retrieval, and "
            "complete-linkage minimax clustering) produce mathematically identical rankings and scores across all three metrics. "
            "In contrast, methods that average, sum, or preserve metric ratios (average linkage, silhouette score, MDS) "
            "differ due to the non-linear square-root transform in Euclidean distance."
        ),
    }

    descriptive_obj = {
        "notice": RESEARCH_PROTOTYPE_NOTICE,
        "seed": 42,
        "git_commit": git_info["short_commit"],
        "cramers_v": cramers_list,
        "trait_frequencies": trait_frequencies,
        "distance_histograms": distance_histograms,
        "confusion_matrices": confusion_matrices,
        "sample_240": sample_obj,
        "invariance_note": invariance_note,
    }

    with open(out_dir / "descriptive.json", "w", encoding="utf-8") as fh:
        json.dump(descriptive_obj, fh, separators=(",", ":"))


def export_all() -> None:
    t_start = dt.datetime.now()
    cfg = load_config()
    git_info = get_git_info(REPO_ROOT)
    out_dir = REPO_ROOT / "public" / "data"
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"[export_ui_data] Beginning full verified UI export into {out_dir}...")

    # Copy existing verified results JSONs
    results_dir = REPO_ROOT / "results"
    for fname in ("real_data.json", "synthetic.json", "expert_review.json", "missingness.json", "synthetic_scaling_ablation.json"):
        src = results_dir / fname
        if src.exists():
            shutil.copy2(src, out_dir / fname)
            print(f"  -> Copied {fname}")

    # Export records
    X_real, y_real, synth_df, y_synth, cat_cols, classes = export_records_and_metadata(
        out_dir, cfg, git_info
    )

    # Export embeddings and get distance matrices
    distance_matrices = export_embeddings(out_dir, X_real, synth_df, cat_cols, git_info)

    # Export clusterings
    export_clusterings(out_dir, distance_matrices, y_real, y_synth, classes, git_info)

    # Export descriptive statistics, histograms, and balanced sample
    export_descriptive_and_samples(
        out_dir, X_real, y_real, distance_matrices, cat_cols, classes, git_info
    )



    elapsed = (dt.datetime.now() - t_start).total_seconds()
    print(f"[export_ui_data] All UI exports completed successfully in {elapsed:.2f}s!")


if __name__ == "__main__":
    export_all()
