"""ayur_bench: Honest, leak-free mixed-type distance benchmarking for Ayurvedic case records."""

from .data import DatasetBundle, load_config, load_tridosha_dataset
from .distances import (
    cosine_distance,
    euclidean_distance,
    gower_distance,
    hamming_distance,
)
from .evaluation import (
    evaluate_clustering,
    evaluate_distance_matrix,
    evaluate_knn_cv,
    evaluate_loo_retrieval,
)
from .stats import compare_metrics_paired, holm_bonferroni, paired_effect_size, summarize_scores

__all__ = [
    "DatasetBundle",
    "load_config",
    "load_tridosha_dataset",
    "gower_distance",
    "euclidean_distance",
    "cosine_distance",
    "hamming_distance",
    "evaluate_knn_cv",
    "evaluate_loo_retrieval",
    "evaluate_clustering",
    "evaluate_distance_matrix",
    "summarize_scores",
    "paired_effect_size",
    "holm_bonferroni",
    "compare_metrics_paired",
]
