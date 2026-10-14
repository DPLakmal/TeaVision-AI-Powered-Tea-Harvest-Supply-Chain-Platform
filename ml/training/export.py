"""TorchScript export utility for TeaVision tea leaf quality models.

Exports fine-tuned MobileNetV3 or EfficientNet PyTorch checkpoints to
standalone TorchScript (.pt) model artifacts suitable for high-throughput
FastAPI production inference.
"""

import argparse
import logging
import os
import sys
import torch
import torch.nn as nn

from model import build_model

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("teavision-export")


def parse_arguments() -> argparse.Namespace:
    """Parse command line arguments for the TorchScript export tool.

    Returns:
        argparse.Namespace: Parsed CLI options.
    """
    parser = argparse.ArgumentParser(
        description="TeaVision TorchScript Model Export Utility",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--checkpoint",
        type=str,
        default=None,
        help="Path to trained PyTorch weights checkpoint (.pt file). If omitted, exports model architecture directly.",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="tea_grader.pt",
        help="Output destination path for the serialized TorchScript model artifact.",
    )
    parser.add_argument(
        "--arch",
        type=str,
        default="mobilenetv3",
        choices=["mobilenetv3", "efficientnet"],
        help="Model architecture name.",
    )
    parser.add_argument(
        "--num-classes",
        type=int,
        default=3,
        help="Number of target classification classes.",
    )
    parser.add_argument(
        "--input-size",
        type=int,
        default=224,
        help="Square pixel input resolution.",
    )
    parser.add_argument(
        "--device",
        type=str,
        default="cpu",
        choices=["cpu", "cuda", "mps"],
        help="Device to construct and verify the exported model on.",
    )
    return parser.parse_args()


def export_torchscript(
    model: nn.Module,
    output_path: str,
    input_size: int = 224,
    device: torch.device = torch.device("cpu"),
) -> None:
    """Serialize a PyTorch model into TorchScript format and verify its numerical equivalence.

    Performs script compilation via torch.jit.script(), saves the artifact,
    re-loads the saved file, and verifies numerical matching using a dummy input.

    Args:
        model: PyTorch model module in evaluation mode.
        output_path: Destination filesystem path for the .pt artifact.
        input_size: Spatial pixel dimension of the square input tensor.
        device: Device on which verification forward passes are executed.

    Raises:
        AssertionError: If exported model outputs deviate from the original model.
    """
    model.eval()
    model = model.to(device)

    logger.info("Compiling model via torch.jit.script()...")
    scripted_model = torch.jit.script(model)

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    scripted_model.save(output_path)
    logger.info(f"TorchScript model saved to: {output_path}")

    # Verification phase
    logger.info("Verifying exported TorchScript model artifact...")
    loaded_scripted = torch.jit.load(output_path, map_location=device)
    loaded_scripted.eval()

    dummy_input = torch.randn(1, 3, input_size, input_size, device=device)

    with torch.no_grad():
        original_output = model(dummy_input)
        scripted_output = loaded_scripted(dummy_input)

    # Numerical consistency check
    is_close = torch.allclose(original_output, scripted_output, atol=1e-5, rtol=1e-4)
    max_diff = torch.max(torch.abs(original_output - scripted_output)).item()

    if not is_close:
        raise AssertionError(
            f"Numerical verification failed! Maximum output difference: {max_diff:.6e}"
        )

    file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
    input_shape = tuple(dummy_input.shape)
    output_shape = tuple(scripted_output.shape)

    print("\n" + "=" * 55)
    print("TORCHSCRIPT EXPORT VERIFICATION REPORT")
    print("=" * 55)
    print(f"Artifact Path   : {os.path.abspath(output_path)}")
    print(f"File Size       : {file_size_mb:.2f} MB")
    print(f"Input Shape     : {input_shape} (Float32)")
    print(f"Output Shape    : {output_shape} (Logits)")
    print(f"Max Difference  : {max_diff:.2e}")
    print(f"Verification    : PASSED [Matches within 1e-5]")
    print("=" * 55 + "\n")


def main() -> None:
    """Main execution pipeline for model export."""
    args = parse_arguments()
    device = torch.device(args.device)

    # Build model architecture
    arch = args.arch
    num_classes = args.num_classes

    if args.checkpoint and os.path.isfile(args.checkpoint):
        logger.info(f"Loading checkpoint weights from: {args.checkpoint}")
        ckpt = torch.load(args.checkpoint, map_location=device)
        if isinstance(ckpt, dict):
            arch = ckpt.get("arch", args.arch)
            class_names = ckpt.get("class_names", None)
            if class_names:
                num_classes = len(class_names)
            state_dict = ckpt.get("model_state_dict", ckpt)
        else:
            state_dict = ckpt

        model = build_model(arch=arch, pretrained=False, num_classes=num_classes)
        model.load_state_dict(state_dict)
        logger.info("Checkpoint state_dict loaded successfully.")
    else:
        if args.checkpoint:
            logger.warning(
                f"Checkpoint file not found: {args.checkpoint}. Proceeding with fresh model."
            )
        logger.info(f"Instantiating fresh {arch} model (num_classes={num_classes})...")
        model = build_model(arch=arch, pretrained=True, num_classes=num_classes)

    export_torchscript(
        model=model,
        output_path=args.output,
        input_size=args.input_size,
        device=device,
    )


if __name__ == "__main__":
    main()
