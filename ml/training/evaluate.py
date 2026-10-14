"""Model evaluation script for tea harvest leaf quality grading.

Generates comprehensive validation/test metrics including:
- Confusion matrix (saved as publication-ready PNG heatmap)
- Per-class Precision, Recall, and F1-score report
- Multiclass ROC AUC (One-vs-Rest)
- Top highest-confidence misclassified samples for error analysis
"""

import argparse
import json
import logging
import os
import sys
from typing import Any, Dict, List, Tuple

import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from dataset import get_dataset
from model import build_model

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("teavision-eval")


def parse_arguments() -> argparse.Namespace:
    """Parse command line arguments for the evaluation pipeline.

    Returns:
        argparse.Namespace: Parsed CLI options.
    """
    parser = argparse.ArgumentParser(
        description="TeaVision Tea Quality Classifier Evaluation",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--checkpoint",
        type=str,
        required=True,
        help="Path to trained PyTorch model checkpoint (.pt file).",
    )
    parser.add_argument(
        "--data-dir",
        type=str,
        required=True,
        help="Root dataset directory containing evaluation splits (e.g., 'val' or 'test').",
    )
    parser.add_argument(
        "--split",
        type=str,
        default="val",
        choices=["val", "test", "train"],
        help="Dataset split subfolder to evaluate.",
    )
    parser.add_argument(
        "--arch",
        type=str,
        default=None,
        help="Model architecture ('mobilenetv3' or 'efficientnet'). If None, infer from checkpoint.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=32,
        help="Batch size for evaluation DataLoader.",
    )
    parser.add_argument(
        "--input-size",
        type=int,
        default=224,
        help="Square pixel image resolution.",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="evaluation_results",
        help="Directory to store evaluation plots and JSON reports.",
    )
    parser.add_argument(
        "--top-k-errors",
        type=int,
        default=10,
        help="Number of top high-confidence misclassifications to display.",
    )
    parser.add_argument(
        "--device",
        type=str,
        default="auto",
        choices=["auto", "cpu", "cuda", "mps"],
        help="Compute device for running evaluation.",
    )
    return parser.parse_args()


def select_device(device_arg: str) -> torch.device:
    """Resolve target compute device.

    Args:
        device_arg: CLI device argument ('auto', 'cpu', 'cuda', 'mps').

    Returns:
        torch.device: Resolved PyTorch device.
    """
    if device_arg == "auto":
        if torch.cuda.is_available():
            return torch.device("cuda")
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            return torch.device("mps")
        return torch.device("cpu")
    return torch.device(device_arg)


def run_evaluation(
    model: nn.Module,
    dataloader: DataLoader,
    device: torch.device,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Execute model inference over full evaluation set.

    Args:
        model: Evaluated PyTorch model in eval mode.
        dataloader: DataLoader for the evaluation split.
        device: Target compute device.

    Returns:
        Tuple[np.ndarray, np.ndarray, np.ndarray]: Ground truth labels, predicted labels,
            and predicted probability distributions (N, C).
    """
    model.eval()
    all_targets: List[int] = []
    all_preds: List[int] = []
    all_probs: List[np.ndarray] = []

    with torch.no_grad():
        for images, targets in dataloader:
            images = images.to(device)
            outputs = model(images)
            probabilities = torch.softmax(outputs, dim=1)
            preds = torch.argmax(probabilities, dim=1)

            all_targets.extend(targets.cpu().numpy().tolist())
            all_preds.extend(preds.cpu().numpy().tolist())
            all_probs.extend(probabilities.cpu().numpy())

    return (
        np.array(all_targets, dtype=np.int64),
        np.array(all_preds, dtype=np.int64),
        np.array(all_probs, dtype=np.float32),
    )


def plot_confusion_matrix(
    cm: np.ndarray,
    class_names: List[str],
    save_path: str,
) -> None:
    """Plot and save an annotated confusion matrix heatmap.

    Args:
        cm: Raw 2D confusion matrix (num_classes, num_classes).
        class_names: List of class labels in index order.
        save_path: Filesystem path to save output image.
    """
    plt.figure(figsize=(8, 6))

    # Calculate row-normalized percentages
    row_sums = cm.sum(axis=1)[:, np.newaxis]
    cm_norm = np.divide(
        cm.astype("float"),
        row_sums,
        out=np.zeros_like(cm, dtype=float),
        where=row_sums != 0,
    )

    annot = np.empty_like(cm, dtype=object)
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            annot[i, j] = f"{cm[i, j]}\n({cm_norm[i, j]*100:.1f}%)"

    sns.heatmap(
        cm_norm,
        annot=annot,
        fmt="",
        cmap="Greens",
        xticklabels=class_names,
        yticklabels=class_names,
        cbar=True,
    )
    plt.title("Tea Quality Grading - Confusion Matrix", fontsize=14, pad=15)
    plt.xlabel("Predicted Grade", fontsize=12)
    plt.ylabel("True Grade", fontsize=12)
    plt.tight_layout()

    os.makedirs(os.path.dirname(os.path.abspath(save_path)), exist_ok=True)
    plt.savefig(save_path, dpi=300)
    plt.close()
    logger.info(f"Confusion matrix plot saved to: {save_path}")


def find_top_misclassifications(
    dataset_samples: List[Tuple[str, int]],
    targets: np.ndarray,
    preds: np.ndarray,
    probs: np.ndarray,
    class_names: List[str],
    top_k: int = 10,
) -> List[Dict[str, Any]]:
    """Identify the most confident misclassified samples for error analysis.

    Args:
        dataset_samples: List of (image_path, target_idx) from dataset.
        targets: Array of true labels.
        preds: Array of predicted labels.
        probs: Array of predicted probability matrices.
        class_names: List of class labels.
        top_k: Number of samples to return.

    Returns:
        List[Dict[str, Any]]: List of top misclassified sample records sorted by descending confidence.
    """
    errors: List[Dict[str, Any]] = []

    for idx in range(len(targets)):
        true_idx = int(targets[idx])
        pred_idx = int(preds[idx])
        if true_idx != pred_idx:
            conf = float(probs[idx, pred_idx])
            sample_path = dataset_samples[idx][0] if idx < len(dataset_samples) else f"sample_{idx}"
            errors.append(
                {
                    "sample_path": sample_path,
                    "true_class": class_names[true_idx],
                    "predicted_class": class_names[pred_idx],
                    "confidence": round(conf, 4),
                    "true_class_probability": round(float(probs[idx, true_idx]), 4),
                }
            )

    # Sort errors by predicted confidence descending
    errors.sort(key=lambda x: x["confidence"], reverse=True)
    return errors[:top_k]


def main() -> None:
    """Main execution pipeline for model evaluation."""
    args = parse_arguments()
    device = select_device(args.device)
    os.makedirs(args.output_dir, exist_ok=True)

    if not os.path.isfile(args.checkpoint):
        logger.error(f"Checkpoint file not found: {args.checkpoint}")
        sys.exit(1)

    logger.info(f"Loading checkpoint from: {args.checkpoint}")
    checkpoint = torch.load(args.checkpoint, map_location=device)

    # Resolve architecture name
    arch = args.arch
    if arch is None:
        arch = checkpoint.get("arch", "mobilenetv3") if isinstance(checkpoint, dict) else "mobilenetv3"
    logger.info(f"Using architecture: {arch}")

    # Load dataset
    logger.info(f"Loading dataset split '{args.split}' from: {args.data_dir}")
    dataset = get_dataset(args.data_dir, split=args.split, input_size=args.input_size)
    class_names = dataset.classes
    num_classes = len(class_names)
    logger.info(f"Evaluating {len(dataset):,} samples across {num_classes} classes: {class_names}")

    dataloader = DataLoader(
        dataset,
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=2,
    )

    # Build model and load state
    model = build_model(arch=arch, pretrained=False, num_classes=num_classes)
    state_dict = (
        checkpoint["model_state_dict"] if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint else checkpoint
    )
    model.load_state_dict(state_dict)
    model = model.to(device)

    # Execute evaluation
    logger.info("Running inference across the evaluation dataset...")
    targets, preds, probs = run_evaluation(model, dataloader, device)

    # Compute overall accuracy
    overall_acc = (np.sum(targets == preds) / len(targets)) * 100.0
    logger.info(f"Overall Accuracy: {overall_acc:.2f}% ({np.sum(targets == preds)}/{len(targets)})")

    # Generate Confusion Matrix
    cm = confusion_matrix(targets, preds, labels=list(range(num_classes)))
    cm_plot_path = os.path.join(args.output_dir, "confusion_matrix.png")
    plot_confusion_matrix(cm, class_names, cm_plot_path)

    # Detailed classification report
    report_dict = classification_report(
        targets,
        preds,
        target_names=class_names,
        output_dict=True,
        zero_division=0,
    )
    report_text = classification_report(
        targets,
        preds,
        target_names=class_names,
        digits=4,
        zero_division=0,
    )
    print("\n" + "=" * 65)
    print("DETAILED CLASSIFICATION REPORT")
    print("=" * 65)
    print(report_text)
    print("=" * 65 + "\n")

    # Compute ROC AUC score if multiclass ROC is feasible
    roc_auc_val: Optional[float] = None
    try:
        if num_classes > 2 and len(np.unique(targets)) == num_classes:
            roc_auc_val = float(
                roc_auc_score(
                    targets,
                    probs,
                    multi_class="ovr",
                    average="macro",
                )
            )
            logger.info(f"Macro One-vs-Rest ROC AUC: {roc_auc_val:.4f}")
    except Exception as exc:
        logger.warning(f"Could not compute ROC AUC score: {exc}")

    # Identify top misclassifications
    top_errors = find_top_misclassifications(
        dataset_samples=dataset.samples,
        targets=targets,
        preds=preds,
        probs=probs,
        class_names=class_names,
        top_k=args.top_k_errors,
    )

    print("\n" + "=" * 80)
    print(f"TOP {len(top_errors)} HIGHEST-CONFIDENCE MISCLASSIFICATIONS (ERROR ANALYSIS)")
    print("=" * 80)
    if not top_errors:
        print("No misclassifications found! Perfect 100% test accuracy.")
    else:
        for idx, err in enumerate(top_errors, 1):
            sample_name = os.path.basename(err["sample_path"])
            print(
                f"[{idx:02d}] File: {sample_name} | "
                f"True: {err['true_class']:<14} | "
                f"Pred: {err['predicted_class']:<14} | "
                f"Conf: {err['confidence']:.4f} (True Class Prob: {err['true_class_probability']:.4f})"
            )
    print("=" * 80 + "\n")

    # Save structured summary report
    summary_report = {
        "checkpoint": args.checkpoint,
        "dataset": args.data_dir,
        "split": args.split,
        "arch": arch,
        "total_samples": len(targets),
        "overall_accuracy_percent": round(overall_acc, 2),
        "roc_auc_macro": round(roc_auc_val, 4) if roc_auc_val is not None else None,
        "confusion_matrix": cm.tolist(),
        "classification_report": report_dict,
        "top_misclassifications": top_errors,
    }

    report_json_path = os.path.join(args.output_dir, "evaluation_report.json")
    with open(report_json_path, "w", encoding="utf-8") as f:
        json.dump(summary_report, f, indent=2)

    logger.info(f"Evaluation report JSON saved to: {report_json_path}")


if __name__ == "__main__":
    main()
