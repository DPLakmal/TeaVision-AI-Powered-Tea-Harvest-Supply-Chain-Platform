"""Dataset loading and data augmentation pipelines for tea harvest leaf imagery.

Provides ImageFolder wrappers with robust data augmentation for training
and deterministic evaluation transforms for validation and testing.
"""

import os
from typing import Dict, List
import torch
from torchvision import datasets, transforms


def get_transforms(split: str, input_size: int = 224) -> transforms.Compose:
    """Construct data transformation pipelines for training or evaluation.

    Applies heavy domain-specific augmentations (flips, rotations, color jitter,
    random erasing) during training to simulate fluctuating field lighting and
    leaf orientations in tea estates. Applies standard resizing and center-cropping
    for evaluation.

    Args:
        split: Dataset split ('train', 'val', or 'test').
        input_size: Target square pixel dimension (width and height).

    Returns:
        transforms.Compose: Composed torchvision transformation pipeline.
    """
    if split.lower() == "train":
        return transforms.Compose(
            [
                transforms.RandomResizedCrop(input_size, scale=(0.7, 1.0)),
                transforms.RandomHorizontalFlip(),
                transforms.RandomVerticalFlip(),
                transforms.RandomRotation(30),
                transforms.ColorJitter(
                    brightness=0.3,
                    contrast=0.3,
                    saturation=0.2,
                    hue=0.1,
                ),
                transforms.RandomGrayscale(p=0.05),
                transforms.ToTensor(),
                transforms.Normalize(
                    mean=[0.485, 0.456, 0.406],
                    std=[0.229, 0.224, 0.225],
                ),
                transforms.RandomErasing(p=0.2),
            ]
        )
    else:
        return transforms.Compose(
            [
                transforms.Resize(int(input_size * 1.14)),
                transforms.CenterCrop(input_size),
                transforms.ToTensor(),
                transforms.Normalize(
                    mean=[0.485, 0.456, 0.406],
                    std=[0.229, 0.224, 0.225],
                ),
            ]
        )


def get_dataset(
    data_dir: str,
    split: str,
    input_size: int = 224,
) -> datasets.ImageFolder:
    """Load an ImageFolder dataset for the specified split.

    Expects the directory structure:
        data_dir/
            split/
                class_a/
                class_b/
                ...

    Args:
        data_dir: Root directory path containing split subdirectories.
        split: Subdirectory name representing data split (e.g., 'train', 'val', 'test').
        input_size: Image spatial resolution for transform pipeline.

    Returns:
        datasets.ImageFolder: PyTorch dataset with applied transforms.

    Raises:
        FileNotFoundError: If the split directory does not exist on disk.
    """
    split_dir = os.path.join(data_dir, split)
    if not os.path.isdir(split_dir):
        raise FileNotFoundError(f"Dataset split directory not found: '{split_dir}'")

    return datasets.ImageFolder(
        root=split_dir,
        transform=get_transforms(split=split, input_size=input_size),
    )


def compute_class_weights(dataset: datasets.ImageFolder) -> torch.Tensor:
    """Compute balanced inverse-frequency class weights for CrossEntropyLoss.

    Weight for class c is calculated as:
        weight[c] = total_samples / (num_classes * class_count[c])

    This prevents the model from biasing towards overrepresented harvest grades.

    Args:
        dataset: Instantiated ImageFolder dataset.

    Returns:
        torch.Tensor: 1D float tensor of normalized class weights.
    """
    targets: List[int] = [label for _, label in dataset.samples]
    num_classes: int = len(dataset.classes)
    class_counts: torch.Tensor = torch.bincount(
        torch.tensor(targets, dtype=torch.long),
        minlength=num_classes,
    )
    total_samples: int = len(targets)

    # Calculate inverse class frequency, avoiding division by zero
    weights: torch.Tensor = total_samples / (
        num_classes * class_counts.float().clamp(min=1.0)
    )

    # Normalize weights so mean equals 1.0
    normalized_weights = weights / weights.mean()
    return normalized_weights


def get_class_distribution(dataset: datasets.ImageFolder) -> Dict[str, int]:
    """Inspect and return sample counts per class in an ImageFolder dataset.

    Args:
        dataset: Instantiated ImageFolder dataset.

    Returns:
        Dict[str, int]: Mapping of class name to sample count.
    """
    targets = [label for _, label in dataset.samples]
    counts = torch.bincount(torch.tensor(targets, dtype=torch.long), minlength=len(dataset.classes))
    return {dataset.classes[idx]: int(count.item()) for idx, count in enumerate(counts)}


if __name__ == "__main__":
    print("Dataset transforms initialized successfully.")
    print("Train transform:", get_transforms("train", input_size=224))
    print("Val transform:", get_transforms("val", input_size=224))
