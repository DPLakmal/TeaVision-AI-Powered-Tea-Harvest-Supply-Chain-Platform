"""Main training script for fine-tuning CNNs on tea harvest quality grading.

Supports two-phase transfer learning:
- Phase 1: Train classification head with frozen backbone.
- Phase 2: Full fine-tuning of all layers with a reduced learning rate.

Includes OneCycleLR scheduler, class-weighted loss, AMP mixed precision,
best checkpoint serialization, and optional Weights & Biases tracking.
"""

import argparse
import logging
import os
import random
import sys
import time
from typing import Dict, List, Optional, Tuple

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from dataset import compute_class_weights, get_dataset
from model import build_model, freeze_backbone, unfreeze_all

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("teavision-train")


def set_seed(seed: int = 42) -> None:
    """Set random seeds across libraries for strict reproducibility.

    Args:
        seed: Random seed value.
    """
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False


def get_device() -> torch.device:
    """Detect and select best available training device.

    Returns:
        torch.device: CUDA GPU, Apple Silicon MPS, or CPU device.
    """
    if torch.cuda.is_available():
        device = torch.device("cuda")
        logger.info(f"Using CUDA device: {torch.cuda.get_device_name(0)}")
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        device = torch.device("mps")
        logger.info("Using Apple Silicon MPS device")
    else:
        device = torch.device("cpu")
        logger.info("Using CPU device")
    return device


def parse_arguments() -> argparse.Namespace:
    """Parse command line arguments for the training job.

    Returns:
        argparse.Namespace: Parsed CLI options.
    """
    parser = argparse.ArgumentParser(
        description="TeaVision Tea Harvest Leaf Quality Classifier Training",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--data-dir",
        type=str,
        required=True,
        help="Path to dataset root directory containing 'train' and 'val' subfolders.",
    )
    parser.add_argument(
        "--arch",
        type=str,
        default="mobilenetv3",
        choices=["mobilenetv3", "efficientnet"],
        help="CNN architecture to fine-tune.",
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=20,
        help="Total training epochs.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=32,
        help="Batch size for training and evaluation dataloaders.",
    )
    parser.add_argument(
        "--lr",
        type=float,
        default=1e-3,
        help="Base learning rate (will be scaled 0.1x in Phase 2).",
    )
    parser.add_argument(
        "--phase",
        type=int,
        default=1,
        choices=[1, 2],
        help="Phase 1: Frozen backbone (head only). Phase 2: Full fine-tuning.",
    )
    parser.add_argument(
        "--checkpoint",
        type=str,
        default=None,
        help="Path to pre-existing checkpoint to resume from or initialize Phase 2.",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="checkpoints",
        help="Directory to save model checkpoints and logs.",
    )
    parser.add_argument(
        "--input-size",
        type=int,
        default=224,
        help="Square pixel image resolution.",
    )
    parser.add_argument(
        "--num-workers",
        type=int,
        default=4,
        help="Number of DataLoader worker processes.",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for data shuffling and initialization.",
    )
    parser.add_argument(
        "--wandb",
        action="store_true",
        help="Enable Weights & Biases experiment tracking.",
    )
    parser.add_argument(
        "--wandb-project",
        type=str,
        default="teavision-grader",
        help="Weights & Biases project name.",
    )
    parser.add_argument(
        "--wandb-run-name",
        type=str,
        default=None,
        help="Optional Weights & Biases run name.",
    )
    return parser.parse_args()


def train_one_epoch(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    optimizer: torch.optim.Optimizer,
    scheduler: Optional[torch.optim.lr_scheduler._LRScheduler],
    scaler: Optional[torch.cuda.amp.GradScaler],
    device: torch.device,
) -> Tuple[float, float]:
    """Execute one training epoch over the dataset.

    Args:
        model: PyTorch model being trained.
        dataloader: Training split DataLoader.
        criterion: Loss function.
        optimizer: Optimization algorithm.
        scheduler: Learning rate scheduler.
        scaler: AMP gradient scaler if CUDA is available.
        device: Target compute device.

    Returns:
        Tuple[float, float]: Average training loss and training accuracy percentage.
    """
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0
    use_amp = scaler is not None and scaler.is_enabled()

    for images, targets in dataloader:
        images = images.to(device, non_blocking=True)
        targets = targets.to(device, non_blocking=True)

        optimizer.zero_grad()

        with torch.cuda.amp.autocast(enabled=use_amp):
            outputs = model(images)
            loss = criterion(outputs, targets)

        if use_amp:
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
        else:
            loss.backward()
            optimizer.step()

        if scheduler is not None:
            scheduler.step()

        running_loss += loss.item() * images.size(0)
        _, preds = torch.max(outputs, 1)
        correct += torch.sum(preds == targets).item()
        total += targets.size(0)

    epoch_loss = running_loss / max(total, 1)
    epoch_acc = (correct / max(total, 1)) * 100.0
    return epoch_loss, epoch_acc


def validate(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    class_names: List[str],
    device: torch.device,
) -> Tuple[float, float, Dict[str, float]]:
    """Evaluate model on the validation split and calculate per-class metrics.

    Args:
        model: PyTorch model being evaluated.
        dataloader: Validation split DataLoader.
        criterion: Loss function.
        class_names: List of class labels in class index order.
        device: Target compute device.

    Returns:
        Tuple[float, float, Dict[str, float]]: Validation loss, overall accuracy percentage,
            and dictionary mapping class name to per-class accuracy percentage.
    """
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0

    num_classes = len(class_names)
    class_correct = torch.zeros(num_classes, dtype=torch.long)
    class_total = torch.zeros(num_classes, dtype=torch.long)

    with torch.no_grad():
        for images, targets in dataloader:
            images = images.to(device, non_blocking=True)
            targets = targets.to(device, non_blocking=True)

            outputs = model(images)
            loss = criterion(outputs, targets)

            running_loss += loss.item() * images.size(0)
            _, preds = torch.max(outputs, 1)

            correct += torch.sum(preds == targets).item()
            total += targets.size(0)

            for t, p in zip(targets.view(-1), preds.view(-1)):
                c_idx = int(t.item())
                class_total[c_idx] += 1
                if t == p:
                    class_correct[c_idx] += 1

    epoch_loss = running_loss / max(total, 1)
    epoch_acc = (correct / max(total, 1)) * 100.0

    per_class_acc: Dict[str, float] = {}
    for idx, name in enumerate(class_names):
        c_tot = int(class_total[idx].item())
        c_cor = int(class_correct[idx].item())
        per_class_acc[name] = (c_cor / c_tot * 100.0) if c_tot > 0 else 0.0

    return epoch_loss, epoch_acc, per_class_acc


def save_checkpoint(
    state: dict,
    checkpoint_path: str,
) -> None:
    """Save training checkpoint dictionary to filesystem.

    Args:
        state: Checkpoint dictionary containing model state and metadata.
        checkpoint_path: Destination file path.
    """
    os.makedirs(os.path.dirname(checkpoint_path), exist_ok=True)
    torch.save(state, checkpoint_path)
    logger.info(f"Checkpoint successfully saved to {checkpoint_path}")


def main() -> None:
    """Main execution pipeline for model fine-tuning."""
    args = parse_arguments()
    set_seed(args.seed)
    device = get_device()
    os.makedirs(args.output_dir, exist_ok=True)

    # Initialize optional Weights & Biases logging
    wandb_run = None
    if args.wandb:
        try:
            import wandb

            wandb_run = wandb.init(
                project=args.wandb_project,
                name=args.wandb_run_name
                or f"{args.arch}-phase{args.phase}-{int(time.time())}",
                config=vars(args),
            )
            logger.info("Weights & Biases logging initialized.")
        except ImportError:
            logger.warning(
                "wandb package is not installed. Continuing without Weights & Biases logging."
            )

    logger.info(f"Loading datasets from '{args.data_dir}' (input_size={args.input_size})...")
    train_dataset = get_dataset(args.data_dir, split="train", input_size=args.input_size)
    val_dataset = get_dataset(args.data_dir, split="val", input_size=args.input_size)

    class_names = train_dataset.classes
    num_classes = len(class_names)
    logger.info(f"Target classes ({num_classes}): {class_names}")
    logger.info(f"Train samples: {len(train_dataset):,} | Val samples: {len(val_dataset):,}")

    # Calculate class weighting for balanced loss
    class_weights = compute_class_weights(train_dataset).to(device)
    logger.info(f"Computed inverse class weights: {class_weights.tolist()}")
    criterion = nn.CrossEntropyLoss(weight=class_weights)

    train_loader = DataLoader(
        train_dataset,
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=args.num_workers,
        pin_memory=(device.type == "cuda"),
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=args.num_workers,
        pin_memory=(device.type == "cuda"),
    )

    # Build model architecture
    logger.info(f"Building {args.arch} model (pretrained=True, num_classes={num_classes})...")
    model = build_model(arch=args.arch, pretrained=True, num_classes=num_classes)

    # Load pre-existing checkpoint if supplied
    start_epoch = 1
    if args.checkpoint:
        if os.path.isfile(args.checkpoint):
            logger.info(f"Loading checkpoint weights from: {args.checkpoint}")
            ckpt = torch.load(args.checkpoint, map_location=device)
            state_dict = (
                ckpt["model_state_dict"] if "model_state_dict" in ckpt else ckpt
            )
            model.load_state_dict(state_dict)
            logger.info("Model weights restored successfully.")
        else:
            logger.warning(f"Checkpoint path not found: {args.checkpoint}. Proceeding with fresh weights.")

    model = model.to(device)

    # Phase configuration
    if args.phase == 1:
        logger.info("=== Phase 1: Freezing backbone layers, training classifier head only ===")
        freeze_backbone(model, arch=args.arch)
        effective_lr = args.lr
    else:
        logger.info("=== Phase 2: Unfreezing all layers for full end-to-end fine-tuning ===")
        unfreeze_all(model)
        effective_lr = args.lr * 0.1
        logger.info(f"Phase 2 learning rate scaled by 0.1x -> {effective_lr:.6f}")

    trainable_params = [p for p in model.parameters() if p.requires_grad]
    logger.info(
        f"Trainable parameters: {sum(p.numel() for p in trainable_params):,} / "
        f"{sum(p.numel() for p in model.parameters()):,}"
    )

    optimizer = torch.optim.AdamW(
        trainable_params,
        lr=effective_lr,
        weight_decay=1e-4,
    )

    scheduler = torch.optim.lr_scheduler.OneCycleLR(
        optimizer,
        max_lr=effective_lr,
        steps_per_epoch=max(len(train_loader), 1),
        epochs=args.epochs,
    )

    scaler = (
        torch.cuda.amp.GradScaler(enabled=True) if device.type == "cuda" else None
    )

    best_val_acc = 0.0
    best_checkpoint_path = os.path.join(
        args.output_dir, f"best_{args.arch}_phase{args.phase}.pt"
    )
    latest_checkpoint_path = os.path.join(
        args.output_dir, f"latest_{args.arch}_phase{args.phase}.pt"
    )
    interrupted_path = os.path.join(
        args.output_dir, f"interrupted_{args.arch}_phase{args.phase}.pt"
    )

    current_epoch = start_epoch

    try:
        for epoch in range(start_epoch, args.epochs + 1):
            current_epoch = epoch
            epoch_start_time = time.perf_counter()

            train_loss, train_acc = train_one_epoch(
                model=model,
                dataloader=train_loader,
                criterion=criterion,
                optimizer=optimizer,
                scheduler=scheduler,
                scaler=scaler,
                device=device,
            )

            val_loss, val_acc, per_class_acc = validate(
                model=model,
                dataloader=val_loader,
                criterion=criterion,
                class_names=class_names,
                device=device,
            )

            epoch_time = time.perf_counter() - epoch_start_time
            current_lr = optimizer.param_groups[0]["lr"]

            # Log metrics
            per_class_str = ", ".join(
                f"{k}: {v:.1f}%" for k, v in per_class_acc.items()
            )
            logger.info(
                f"Epoch [{epoch:02d}/{args.epochs:02d}] ({epoch_time:.1f}s) "
                f"| Train Loss: {train_loss:.4f} - Train Acc: {train_acc:.2f}% "
                f"| Val Loss: {val_loss:.4f} - Val Acc: {val_acc:.2f}% "
                f"| LR: {current_lr:.6f}"
            )
            logger.info(f"  Validation Per-Class Acc -> {per_class_str}")

            checkpoint_state = {
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "val_acc": val_acc,
                "val_loss": val_loss,
                "train_acc": train_acc,
                "train_loss": train_loss,
                "per_class_acc": per_class_acc,
                "arch": args.arch,
                "class_names": class_names,
                "phase": args.phase,
            }

            save_checkpoint(checkpoint_state, latest_checkpoint_path)

            if val_acc > best_val_acc:
                best_val_acc = val_acc
                save_checkpoint(checkpoint_state, best_checkpoint_path)
                logger.info(
                    f"  >>> New best validation accuracy: {best_val_acc:.2f}%. Saved to {best_checkpoint_path}"
                )

            if wandb_run is not None:
                log_data = {
                    "epoch": epoch,
                    "train_loss": train_loss,
                    "train_acc": train_acc,
                    "val_loss": val_loss,
                    "val_acc": val_acc,
                    "learning_rate": current_lr,
                }
                for c_name, c_acc in per_class_acc.items():
                    log_data[f"val_acc/{c_name}"] = c_acc
                wandb_run.log(log_data)

    except KeyboardInterrupt:
        logger.warning(
            "Training interrupted by user (KeyboardInterrupt)! "
            "Saving emergency recovery checkpoint..."
        )
        emergency_state = {
            "epoch": current_epoch,
            "model_state_dict": model.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "arch": args.arch,
            "class_names": class_names,
            "phase": args.phase,
            "interrupted": True,
        }
        save_checkpoint(emergency_state, interrupted_path)
        logger.info(f"Emergency checkpoint saved to {interrupted_path}. Exiting cleanly.")
        sys.exit(0)

    logger.info(
        f"Training completed successfully! Best validation accuracy: {best_val_acc:.2f}%. "
        f"Artifact saved at: {best_checkpoint_path}"
    )

    if wandb_run is not None:
        wandb_run.finish()


if __name__ == "__main__":
    main()
