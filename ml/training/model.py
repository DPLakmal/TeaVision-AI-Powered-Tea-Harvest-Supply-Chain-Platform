"""Model architectures and transfer learning utilities for tea harvest quality grading.

Supports MobileNetV3-Large and EfficientNet-B0 architectures with custom
linear classification heads for 3-class quality grading.
"""

from typing import List
import torch
import torch.nn as nn
import torchvision.models as models

CLASS_NAMES: List[str] = ["high_quality", "medium_quality", "low_quality"]
NUM_CLASSES: int = len(CLASS_NAMES)


def build_model(
    arch: str = "mobilenetv3",
    pretrained: bool = True,
    num_classes: int = NUM_CLASSES,
) -> nn.Module:
    """Build a fine-tunable CNN model with a replaced final classification layer.

    Args:
        arch: Model architecture name, either 'mobilenetv3' or 'efficientnet'.
        pretrained: If True, initializes backbone weights with ImageNet pretrained checkpoints.
        num_classes: Number of target quality output classes.

    Returns:
        nn.Module: Configured PyTorch neural network.

    Raises:
        ValueError: If an unsupported architecture string is provided.
    """
    normalized_arch = arch.lower().strip()

    if normalized_arch in {"mobilenetv3", "mobilenet_v3", "mobilenet_v3_large"}:
        weights = (
            models.MobileNet_V3_Large_Weights.IMAGENET1K_V2 if pretrained else None
        )
        model = models.mobilenet_v3_large(weights=weights)
        in_features = model.classifier[3].in_features
        model.classifier[3] = nn.Linear(in_features, num_classes)
    elif normalized_arch in {"efficientnet", "efficientnet_b0", "efficientnetb0"}:
        weights = (
            models.EfficientNet_B0_Weights.IMAGENET1K_V1 if pretrained else None
        )
        model = models.efficientnet_b0(weights=weights)
        in_features = model.classifier[1].in_features
        model.classifier[1] = nn.Linear(in_features, num_classes)
    else:
        raise ValueError(
            f"Unsupported architecture '{arch}'. Supported options: 'mobilenetv3', 'efficientnet'."
        )

    return model


def freeze_backbone(model: nn.Module, arch: str = "mobilenetv3") -> None:
    """Freeze all feature extraction backbone layers, leaving only the classifier head trainable.

    Used during Phase 1 training to adapt the classification head to tea quality
    without corrupting pretrained ImageNet representations.

    Args:
        model: PyTorch model instance built via build_model().
        arch: Architecture name ('mobilenetv3' or 'efficientnet').
    """
    # Freeze all parameters across the network
    for param in model.parameters():
        param.requires_grad = False

    # Unfreeze only the classifier module
    if hasattr(model, "classifier"):
        for param in model.classifier.parameters():
            param.requires_grad = True
    else:
        raise AttributeError("Model does not have an identifiable 'classifier' attribute to unfreeze.")


def unfreeze_all(model: nn.Module) -> None:
    """Unfreeze all layers across the entire model for full fine-tuning.

    Used during Phase 2 training to allow end-to-end parameter adaptation
    with a lower learning rate.

    Args:
        model: PyTorch model instance.
    """
    for param in model.parameters():
        param.requires_grad = True


if __name__ == "__main__":
    print("Testing model factory and layer freezing:")
    for test_arch in ["mobilenetv3", "efficientnet"]:
        net = build_model(arch=test_arch, pretrained=False, num_classes=3)
        total_params = sum(p.numel() for p in net.parameters())

        freeze_backbone(net, arch=test_arch)
        trainable_phase1 = sum(p.numel() for p in net.parameters() if p.requires_grad)

        unfreeze_all(net)
        trainable_phase2 = sum(p.numel() for p in net.parameters() if p.requires_grad)

        print(
            f"[{test_arch.upper()}] Total: {total_params:,} | "
            f"Phase 1 Trainable: {trainable_phase1:,} | "
            f"Phase 2 Trainable: {trainable_phase2:,}"
        )
