import * as ImageManipulator from 'expo-image-manipulator';
import { GradeResult, QualityGrade } from '../types';

const ML_BASE_URL = process.env.EXPO_PUBLIC_ML_URL || 'http://localhost:8000';

export async function compressImageForInference(imageUri: string): Promise<string> {
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 512, height: 512 } }],
      {
        compress: 0.85,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    return manipResult.uri;
  } catch (err) {
    console.warn('[ML] Image compression failed, using original URI:', err);
    return imageUri;
  }
}

function normalizeGrade(rawGrade: string): QualityGrade {
  const lower = (rawGrade || '').toLowerCase();
  if (lower.includes('high')) return 'high';
  if (lower.includes('medium')) return 'medium';
  if (lower.includes('low')) return 'low';
  return 'medium';
}

export async function predictLeafQuality(imageUri: string): Promise<GradeResult> {
  const startTime = Date.now();
  
  // 1. Compress image to max 512x512 JPEG 85%
  const compressedUri = await compressImageForInference(imageUri);

  // 2. Build FormData
  const formData = new FormData();
  const filename = compressedUri.split('/').pop() || 'leaf.jpg';
  
  const fileData = {
    uri: compressedUri,
    name: filename,
    type: 'image/jpeg',
  } as unknown as Blob;

  formData.append('file', fileData);

  // 3. Send to ML inference endpoint
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(`${ML_BASE_URL}/predict`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`ML server returned status ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const inferenceMs = Date.now() - startTime;

    // Support multiple possible response formats from ML service:
    // Format A: { grade: "high", confidence: 0.94, scores: { high_quality: 0.94, medium_quality: 0.04, low_quality: 0.02 }, inference_ms: 120 }
    // Format B: { prediction: "high_quality", confidence: 0.94, probabilities: { ... } }
    const rawGrade = data.grade || data.prediction || 'medium';
    const confidence = Number(data.confidence ?? data.score ?? 0.85);

    const scores = data.scores || data.probabilities || {
      high_quality: rawGrade.includes('high') ? confidence : (1 - confidence) / 2,
      medium_quality: rawGrade.includes('medium') ? confidence : (1 - confidence) / 2,
      low_quality: rawGrade.includes('low') ? confidence : (1 - confidence) / 2,
    };

    return {
      grade: normalizeGrade(rawGrade),
      confidence: Math.round(confidence * 100) / 100,
      scores: {
        high_quality: Math.round((scores.high_quality ?? 0) * 100) / 100,
        medium_quality: Math.round((scores.medium_quality ?? 0) * 100) / 100,
        low_quality: Math.round((scores.low_quality ?? 0) * 100) / 100,
      },
      inference_ms: data.inference_ms ?? inferenceMs,
    };
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    console.warn('[ML] Inference request failed:', error);
    throw error;
  }
}
