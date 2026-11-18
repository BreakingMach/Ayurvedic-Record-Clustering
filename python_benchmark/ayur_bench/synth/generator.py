"""
SYNTHETIC/SIMULATED Mixed-Type Ayurvedic Case Generator (Rule R4).

WARNING: Everything produced by this module is SYNTHETIC/SIMULATED data generated
solely to benchmark distance metrics under controlled mixed-modality conditions.
The `latent_class` column is simulation ground truth by construction, NOT a
practitioner-assigned clinical diagnosis.
"""

from __future__ import annotations

import copy
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

from ..data import CANONICAL_CLASSES, load_config, load_tridosha_dataset

NUMERIC_VITAL_COLS = ["age", "bmi", "systolic_bp", "pulse"]

# Centered step positions for 6 classes; adjacent spacing = 1.0 within-class SD when multiplied by d
_CENTERED_RANK_OFFSETS = np.array([-2.5, -1.5, -0.5, 0.5, 1.5, 2.5], dtype=np.float64)


def _draw_non_alphabetical_permutation(
    rng: np.random.Generator, classes: List[str]
) -> List[str]:
    """
    Draw a randomised ordering of classes guaranteed NOT to match alphabetical order,
    reverse-alphabetical order, or canonical class order (prevents label-index arithmetic).
    """
    alpha = sorted(classes)
    rev_alpha = list(reversed(alpha))
    canonical = list(classes)
    rev_canonical = list(reversed(canonical))

    for _ in range(100):
        perm = rng.permutation(classes).tolist()
        if perm not in (alpha, rev_alpha, canonical, rev_canonical):
            return perm
    # Fallback deterministic non-alphabetical shuffle if ever needed
    return [classes[2], classes[5], classes[0], classes[4], classes[1], classes[3]]


def _allocate_class_counts(n_samples: int, real_class_counts: Dict[str, int]) -> Dict[str, int]:
    """Allocate exact integer class counts matching real CSV class proportions."""
    total_real = sum(real_class_counts.values())
    exact = {c: (real_class_counts[c] / total_real) * n_samples for c in CANONICAL_CLASSES}
    counts = {c: int(np.floor(exact[c])) for c in CANONICAL_CLASSES}
    remainder = n_samples - sum(counts.values())
    if remainder > 0:
        # Assign remaining slots to largest fractional remainders
        by_rem = sorted(
            CANONICAL_CLASSES,
            key=lambda c: (exact[c] - counts[c], real_class_counts[c]),
            reverse=True,
        )
        for c in by_rem[:remainder]:
            counts[c] += 1
    return counts


def _estimate_categorical_conditionals(
    X_real: pd.DataFrame, y_real: pd.Series
) -> Dict[str, Dict[str, Any]]:
    """Estimate empirical P(level | class, trait) and sorted level vocabulary from real CSV."""
    conditionals: Dict[str, Dict[str, Any]] = {}
    for col in X_real.columns:
        levels = sorted(X_real[col].dropna().astype(str).unique().tolist())
        by_class: Dict[str, np.ndarray] = {}
        for cls in CANONICAL_CLASSES:
            sub = X_real.loc[y_real == cls, col].dropna().astype(str)
            counts = sub.value_counts()
            probs = np.array([counts.get(lvl, 0) for lvl in levels], dtype=np.float64)
            total = probs.sum()
            by_class[cls] = probs / total if total > 0 else np.full(len(levels), 1.0 / len(levels))
        conditionals[col] = {"levels": levels, "by_class": by_class}
    return conditionals


def generate(
    config: Optional[Dict[str, Any]] = None,
    seed: Optional[int] = None,
    overrides: Optional[Dict[str, Any]] = None,
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Generate a SYNTHETIC/SIMULATED mixed-type patient cohort.

    Parameters
    ----------
    config : dict, optional
        Loaded YAML configuration (from `load_config()`). If None, loads default config.yaml.
    seed : int, optional
        Random seed overriding `config["synthetic"]["default"]["seed"]`.
    overrides : dict, optional
        Optional parameter overrides for grid sweeps (e.g. `categorical_eps`,
        `numeric_cohens_d`, `outlier_fraction`, `missing_fraction`, `label_noise_rate`,
        `n_samples`, `bmi_sbp_copula_rho`).

    Returns
    -------
    df : pd.DataFrame
        SYNTHETIC cohort with columns:
        `age`, `bmi`, `systolic_bp`, `pulse`, the 29 categorical trait columns from the
        real CSV, `latent_class` (simulation ground truth), and `eval_label`
        (evaluation label with optional label noise applied).
    metadata : dict
        Full generative specification, realised summary diagnostics, class orders, and
        explicit SYNTHETIC/SIMULATED provenance tags.
    """
    cfg = copy.deepcopy(config) if config is not None else load_config()
    synth_cfg = cfg["synthetic"]
    params = copy.deepcopy(synth_cfg["default"])
    if overrides:
        params.update(overrides)

    used_seed = int(seed if seed is not None else params["seed"])
    n_samples = int(params["n_samples"])
    eps = float(params["categorical_eps"])
    cohens_d = float(params["numeric_cohens_d"])
    copula_rho = float(params["bmi_sbp_copula_rho"])
    outlier_frac = float(params["outlier_fraction"])
    missing_frac = float(params["missing_fraction"])
    label_noise = float(params["label_noise_rate"])
    vitals_spec = synth_cfg["vitals_spec"]

    if not (0.0 <= eps <= 1.0):
        raise ValueError(f"categorical_eps must be in [0, 1]; got {eps}")
    if cohens_d < 0.0:
        raise ValueError(f"numeric_cohens_d must be >= 0; got {cohens_d}")
    if not (-1.0 < copula_rho < 1.0):
        raise ValueError(f"bmi_sbp_copula_rho must be in (-1, 1); got {copula_rho}")
    if not (0.0 <= outlier_frac < 1.0):
        raise ValueError(f"outlier_fraction must be in [0, 1); got {outlier_frac}")
    if not (0.0 <= missing_frac < 1.0):
        raise ValueError(f"missing_fraction must be in [0, 1); got {missing_frac}")
    if not (0.0 <= label_noise < 1.0):
        raise ValueError(f"label_noise_rate must be in [0, 1); got {label_noise}")

    rng = np.random.default_rng(used_seed)

    # Load real CSV strictly to extract empirical class proportions and P(level | class, trait)
    real_bundle = load_tridosha_dataset()
    real_class_counts = real_bundle.metadata["class_counts"]
    cat_cols = list(real_bundle.categorical_cols)
    conditionals = _estimate_categorical_conditionals(real_bundle.X, real_bundle.y)

    # 1. Sample latent_class with exact real CSV proportions, shuffled so rows are not class-blocked
    target_counts = _allocate_class_counts(n_samples, real_class_counts)
    latent_list: List[str] = []
    for cls in CANONICAL_CLASSES:
        latent_list.extend([cls] * target_counts[cls])
    latent_arr = rng.permutation(np.array(latent_list, dtype=object))

    # 2. Sample 29 categorical traits from (1 - eps) * P(level | class, trait) + eps * Uniform(levels)
    cat_data: Dict[str, np.ndarray] = {}
    for col in cat_cols:
        levels = conditionals[col]["levels"]
        k_levels = len(levels)
        uniform_p = np.full(k_levels, 1.0 / k_levels, dtype=np.float64)
        col_vals = np.empty(n_samples, dtype=object)
        for cls in CANONICAL_CLASSES:
            mask = latent_arr == cls
            n_c = int(np.sum(mask))
            if n_c == 0:
                continue
            p_emp = conditionals[col]["by_class"][cls]
            p_mix = (1.0 - eps) * p_emp + eps * uniform_p
            p_mix = p_mix / p_mix.sum()
            col_vals[mask] = rng.choice(levels, size=n_c, p=p_mix)
        cat_data[col] = col_vals

    # 3. Sample 4 numeric vitals with independent randomised non-alphabetical class orderings
    #    - age: ALWAYS d = 0 (deliberately uninformative numeric covariate)
    #    - bmi (lognormal-skewed) and systolic_bp (Gaussian): correlated at rho via Gaussian copula
    #    - pulse (Gaussian): independent randomised class order
    class_orders: Dict[str, List[str]] = {
        "bmi": _draw_non_alphabetical_permutation(rng, CANONICAL_CLASSES),
        "systolic_bp": _draw_non_alphabetical_permutation(rng, CANONICAL_CLASSES),
        "pulse": _draw_non_alphabetical_permutation(rng, CANONICAL_CLASSES),
    }
    offset_maps: Dict[str, Dict[str, float]] = {
        vital: {cls: float(_CENTERED_RANK_OFFSETS[idx]) for idx, cls in enumerate(order)}
        for vital, order in class_orders.items()
    }

    # Uninformative age (d = 0 always)
    age_spec = vitals_spec["age"]
    age_vals = np.clip(
        rng.normal(float(age_spec["mean"]), float(age_spec["std"]), size=n_samples),
        float(age_spec["min_clip"]),
        float(age_spec["max_clip"]),
    )

    # Correlated standard normals (Z_bmi, Z_sbp) via Gaussian copula Cholesky factor
    cov_2d = np.array([[1.0, copula_rho], [copula_rho, 1.0]], dtype=np.float64)
    chol = np.linalg.cholesky(cov_2d)
    z_indep = rng.standard_normal((n_samples, 2))
    z_corr = z_indep @ chol.T
    z_bmi = z_corr[:, 0]
    z_sbp = z_corr[:, 1]
    z_pulse = rng.standard_normal(n_samples)

    bmi_offsets = np.array([offset_maps["bmi"][c] for c in latent_arr], dtype=np.float64)
    sbp_offsets = np.array([offset_maps["systolic_bp"][c] for c in latent_arr], dtype=np.float64)
    pulse_offsets = np.array([offset_maps["pulse"][c] for c in latent_arr], dtype=np.float64)

    # Lognormal-skewed BMI (shift applied in log-space scaled by log_std so separation tracks d)
    bmi_spec = vitals_spec["bmi"]
    bmi_log_mean = float(bmi_spec["log_mean"])
    bmi_log_std = float(bmi_spec["log_std"])
    # Scale class step slightly in log space (0.5 * d) so extreme d=2 stays physiologically plausible while well separated
    bmi_latent = bmi_log_mean + (cohens_d * 0.5) * bmi_offsets * bmi_log_std + bmi_log_std * z_bmi
    bmi_vals = np.clip(np.exp(bmi_latent), float(bmi_spec["min_clip"]), float(bmi_spec["max_clip"]))

    # Gaussian Systolic BP
    sbp_spec = vitals_spec["systolic_bp"]
    sbp_mean = float(sbp_spec["mean"])
    sbp_std = float(sbp_spec["std"])
    sbp_vals = np.clip(
        sbp_mean + (cohens_d * 0.5) * sbp_offsets * sbp_std + sbp_std * z_sbp,
        float(sbp_spec["min_clip"]),
        float(sbp_spec["max_clip"]),
    )

    # Gaussian Pulse
    pulse_spec = vitals_spec["pulse"]
    pulse_mean = float(pulse_spec["mean"])
    pulse_std = float(pulse_spec["std"])
    pulse_vals = np.clip(
        pulse_mean + (cohens_d * 0.5) * pulse_offsets * pulse_std + pulse_std * z_pulse,
        float(pulse_spec["min_clip"]),
        float(pulse_spec["max_clip"]),
    )

    num_data: Dict[str, np.ndarray] = {
        "age": np.round(age_vals, 1),
        "bmi": np.round(bmi_vals, 2),
        "systolic_bp": np.round(sbp_vals, 1),
        "pulse": np.round(pulse_vals, 1),
    }

    # 4. Messiness toggle A: Numeric outliers (outlier_fraction per numeric column)
    outlier_counts: Dict[str, int] = {col: 0 for col in NUMERIC_VITAL_COLS}
    if outlier_frac > 0.0:
        sigma_mult = float(vitals_spec.get("outlier_sigma_multiplier", 6.0))
        for col in NUMERIC_VITAL_COLS:
            arr = num_data[col].copy()
            n_out = int(round(outlier_frac * n_samples))
            out_idx = rng.choice(n_samples, size=n_out, replace=False)
            col_med = float(np.median(arr))
            col_std = float(np.std(arr, ddof=0))
            signs = rng.choice([-1.0, 1.0], size=n_out)
            arr[out_idx] = np.round(col_med + signs * sigma_mult * col_std, 2)
            # Keep age/bmi/bp/pulse strictly positive so outlier values remain numeric & finite
            arr[out_idx] = np.maximum(arr[out_idx], 1.0)
            num_data[col] = arr
            outlier_counts[col] = n_out

    # Assemble DataFrame (4 numerics + 29 categoricals + latent_class + eval_label)
    df_dict: Dict[str, Any] = {}
    for col in NUMERIC_VITAL_COLS:
        df_dict[col] = pd.Series(num_data[col], dtype="float64")
    for col in cat_cols:
        df_dict[col] = pd.Series(cat_data[col], dtype="object")

    df = pd.DataFrame(df_dict)

    # 5. Messiness toggle B: Missing-at-random (MCAR) across numerics and categorical traits
    missing_numeric_cells = 0
    missing_categorical_cells = 0
    if missing_frac > 0.0:
        for col in NUMERIC_VITAL_COLS:
            mask = rng.random(n_samples) < missing_frac
            df.loc[mask, col] = np.nan
            missing_numeric_cells += int(mask.sum())
        for col in cat_cols:
            mask = rng.random(n_samples) < missing_frac
            df.loc[mask, col] = pd.NA
            missing_categorical_cells += int(mask.sum())

    # Convert categorical columns cleanly after missingness injection
    for col in cat_cols:
        df[col] = df[col].astype("category")

    # 6. Latent class (true simulation ground truth) and eval_label (with optional label noise)
    df["latent_class"] = pd.Series(latent_arr, dtype="string")
    eval_arr = latent_arr.copy()
    flipped_labels = 0
    if label_noise > 0.0:
        flip_mask = rng.random(n_samples) < label_noise
        flip_indices = np.where(flip_mask)[0]
        flipped_labels = int(len(flip_indices))
        for idx in flip_indices:
            true_c = eval_arr[idx]
            others = [c for c in CANONICAL_CLASSES if c != true_c]
            eval_arr[idx] = rng.choice(others)
    df["eval_label"] = pd.Series(eval_arr, dtype="string")

    # Compute realised summary statistics for metadata
    valid_bmi_sbp = df[["bmi", "systolic_bp"]].dropna()
    realised_corr_overall = (
        float(valid_bmi_sbp["bmi"].corr(valid_bmi_sbp["systolic_bp"]))
        if len(valid_bmi_sbp) > 2
        else 0.0
    )
    within_corrs = []
    for cls in CANONICAL_CLASSES:
        sub = df.loc[df["latent_class"] == cls, ["bmi", "systolic_bp"]].dropna()
        if len(sub) > 5:
            within_corrs.append(float(sub["bmi"].corr(sub["systolic_bp"])))
    realised_corr_within = float(np.mean(within_corrs)) if within_corrs else 0.0

    metadata: Dict[str, Any] = {
        "data_origin": "SYNTHETIC/SIMULATED",
        "warning": (
            "SYNTHETIC cohort generated by ayur_bench.synth.generator. "
            "`latent_class` is simulation ground truth by construction, not a practitioner label."
        ),
        "seed": used_seed,
        "n_samples": n_samples,
        "numeric_cols": list(NUMERIC_VITAL_COLS),
        "categorical_cols": cat_cols,
        "latent_class_column": "latent_class",
        "eval_label_column": "eval_label",
        "parameters": {
            "categorical_eps": eps,
            "numeric_cohens_d": cohens_d,
            "bmi_sbp_copula_rho": copula_rho,
            "outlier_fraction": outlier_frac,
            "missing_fraction": missing_frac,
            "label_noise_rate": label_noise,
        },
        "class_orders_non_alphabetical": class_orders,
        "class_counts_latent": {
            cls: int((df["latent_class"] == cls).sum()) for cls in CANONICAL_CLASSES
        },
        "class_counts_eval": {
            cls: int((df["eval_label"] == cls).sum()) for cls in CANONICAL_CLASSES
        },
        "realised_diagnostics": {
            "outlier_cells_by_col": outlier_counts,
            "missing_numeric_cells": missing_numeric_cells,
            "missing_categorical_cells": missing_categorical_cells,
            "missing_total_rate": float(
                (missing_numeric_cells + missing_categorical_cells)
                / (n_samples * (len(NUMERIC_VITAL_COLS) + len(cat_cols)))
            ),
            "eval_labels_flipped": flipped_labels,
            "eval_label_noise_realised": float(flipped_labels / n_samples),
            "bmi_sbp_pearson_overall": realised_corr_overall,
            "bmi_sbp_pearson_within_class_mean": realised_corr_within,
            "bmi_skewness": float(df["bmi"].dropna().skew()),
            "numeric_summary": {
                col: {
                    "mean": float(df[col].dropna().mean()),
                    "std": float(df[col].dropna().std(ddof=1)),
                    "min": float(df[col].dropna().min()),
                    "median": float(df[col].dropna().median()),
                    "max": float(df[col].dropna().max()),
                }
                for col in NUMERIC_VITAL_COLS
            },
        },
    }
    return df, metadata


def save_default_cohort(config: Optional[Dict[str, Any]] = None) -> Tuple[Path, Dict[str, Any]]:
    """Generate and persist the default SYNTHETIC example cohort to Dataset/synthetic/."""
    cfg = config if config is not None else load_config()
    df, meta = generate(cfg)
    repo_root = Path(__file__).resolve().parents[3]
    out_csv = repo_root / cfg["synthetic"]["default_output_csv"]
    out_csv.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(out_csv, index=False)
    return out_csv, meta


if __name__ == "__main__":
    import json

    csv_path, meta = save_default_cohort()
    print(f"[SYNTHETIC] Saved default cohort to {csv_path}")
    print(json.dumps(meta["realised_diagnostics"], indent=2))
