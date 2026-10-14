# TeaVision Model Training & Fine-Tuning Pipeline

Complete end-to-end training pipeline for fine-tuning deep convolutional neural networks (**MobileNetV3-Large** and **EfficientNet-B0**) to classify freshly harvested tea leaves into commercial quality grades.

---

## 3-Class Tea Harvest Grading Scheme

Fresh tea leaf harvesting (plucking) determines the grade and market valuation of orthodox and CTC black tea. The platform classifies tea leaf images into three standard agricultural quality grades:

| Grade | Description | Botanical Standard | Commercial Impact |
|---|---|---|---|
| **`high_quality`** | Tender terminal shoot | "Two leaves and a bud" (apical bud + 2 tender leaves). Vibrant green, unblemished, high polyphenol/catechin concentration. | Premium orthodox tea, golden tips, highest factory auction price. |
| **`medium_quality`** | Mature shoot / coarse foliage | Three leaves and a bud, slightly fibrous lower leaves, minor mechanical plucking bruising, mature shoots. | Standard CTC / commercial blend, medium factory valuation. |
| **`low_quality`** | Defective / diseased foliage | Foliage with fungal infection (Blister blight, Red rust, Grey blight), insect damage (Tea mosquito bug), overgrown woody stems, or wilted/fermented leaves. | Factory batch deduction, rejected leaf, causes bitterness and muddy liquor. |

---

## Recommended Datasets

1. **Kaggle Tea Leaf Disease & Quality Datasets**:
   - [Tea Leaf Disease Dataset (Kaggle)](https://www.kaggle.com/datasets/theblackmamba31/tea-leaf-disease-dataset)
   - Contains high-resolution tea estate images of healthy leaves, blister blight, red rust, and algal leaf spot.
2. **Sri Lankan Tea Research Institute (TRI) Agronomic Datasets**:
   - Field harvest collections categorized by plucking standard (two leaves and a bud vs. mature leaves).

### Dataset Preparation & Layout
Arrange your raw dataset into standard `ImageFolder` directory hierarchy:

```
data/
├── train/
│   ├── high_quality/
│   │   ├── high_0001.jpg
│   │   └── ...
│   ├── medium_quality/
│   │   ├── med_0001.jpg
│   │   └── ...
│   └── low_quality/
│       ├── low_0001.jpg
│       └── ...
└── val/
    ├── high_quality/
    ├── medium_quality/
    └── low_quality/
```

*(Optional: You may also include a `test/` folder with the same structure for final holdout testing).*

---

## Environment Setup

Install training prerequisites:
```bash
pip install -r requirements.txt
```

Verify GPU acceleration availability:
```bash
python -c "import torch; print('CUDA Available:', torch.cuda.is_available(), '| MPS Available:', hasattr(torch.backends, 'mps') and torch.backends.mps.is_available())"
```

---

## Two-Phase Transfer Learning Strategy

Training is divided into two distinct phases to maximize feature retention and prevent catastrophic forgetting:

```
[Phase 1: Feature Adapter]
Pretrained Backbone (Frozen) ──> Classifier Head (Trainable, LR=1e-3, 10-15 Epochs)
                                       │
                                       ▼ (Saves best_phase1.pt)
[Phase 2: End-to-End Fine-Tuning]
Full Backbone + Head (Trainable, LR=1e-4, 20-30 Epochs, OneCycleLR)
                                       │
                                       ▼ (Saves best_phase2.pt)
                                [Export to TorchScript]
```

### 1. Phase 1: Train Classification Head (Backbone Frozen)
In Phase 1, all feature extractor backbone layers are frozen (`requires_grad = False`). Only the custom linear classifier is optimized using an initial base learning rate ($10^{-3}$).

**MobileNetV3-Large:**
```bash
python train.py \
  --data-dir /path/to/data \
  --arch mobilenetv3 \
  --phase 1 \
  --epochs 15 \
  --batch-size 32 \
  --lr 1e-3 \
  --output-dir checkpoints
```

**EfficientNet-B0:**
```bash
python train.py \
  --data-dir /path/to/data \
  --arch efficientnet \
  --phase 1 \
  --epochs 15 \
  --batch-size 32 \
  --lr 1e-3 \
  --output-dir checkpoints
```

### 2. Phase 2: Full Fine-Tuning (All Layers Unfrozen)
In Phase 2, the backbone is unfrozen, and all network parameters are fine-tuned simultaneously. The learning rate is automatically scaled down by $0.1\times$ ($10^{-4}$) to carefully adjust feature maps without destroying pretrained representations.

**MobileNetV3-Large:**
```bash
python train.py \
  --data-dir /path/to/data \
  --arch mobilenetv3 \
  --phase 2 \
  --checkpoint checkpoints/best_mobilenetv3_phase1.pt \
  --epochs 25 \
  --batch-size 32 \
  --lr 1e-3 \
  --output-dir checkpoints
```

**EfficientNet-B0:**
```bash
python train.py \
  --data-dir /path/to/data \
  --arch efficientnet \
  --phase 2 \
  --checkpoint checkpoints/best_efficientnet_phase1.pt \
  --epochs 25 \
  --batch-size 32 \
  --lr 1e-3 \
  --output-dir checkpoints
```

### Weights & Biases Logging
To log training metrics (loss curves, learning rate, per-class accuracies) to Weights & Biases:
```bash
python train.py \
  --data-dir /path/to/data \
  --arch mobilenetv3 \
  --wandb \
  --wandb-project teavision-grader \
  --wandb-run-name mobilenetv3-finetune
```

---

## Model Evaluation & Diagnostics

Evaluate your best checkpoint on the validation or test split:

```bash
python evaluate.py \
  --checkpoint checkpoints/best_mobilenetv3_phase2.pt \
  --data-dir /path/to/data \
  --split val \
  --output-dir evaluation_results
```

### Generated Artifacts
1. **`confusion_matrix.png`**: High-resolution heatmap visualizing class misclassifications and normalized recall percentages.
2. **`evaluation_report.json`**: Structured JSON report containing overall accuracy, per-class precision, recall, F1-score, and macro ROC AUC.
3. **Top Misclassifications Table**: Console error analysis report listing individual images misclassified with highest model confidence.

---

## TorchScript Model Export

Once trained, compile the PyTorch model into TorchScript format. The export script verifies numerical consistency by checking that predictions match within $10^{-5}$ tolerance.

```bash
python export.py \
  --checkpoint checkpoints/best_mobilenetv3_phase2.pt \
  --output ../../services/ml/tea_grader.pt \
  --arch mobilenetv3
```

### Output Summary
```
=======================================================
TORCHSCRIPT EXPORT VERIFICATION REPORT
=======================================================
Artifact Path   : /Users/.../services/ml/tea_grader.pt
File Size       : 16.24 MB
Input Shape     : (1, 3, 224, 224) (Float32)
Output Shape    : (1, 3) (Logits)
Max Difference  : 0.00e+00
Verification    : PASSED [Matches within 1e-5]
=======================================================
```

Copy or point the FastAPI inference service (`MODEL_PATH`) to this exported `.pt` file for production deployment.
