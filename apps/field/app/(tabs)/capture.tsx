import { Ionicons } from '@expo/vector-icons';
import { CameraType, CameraView, FlashMode, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ConfidenceBar from '../../components/ConfidenceBar';
import GradeBadge from '../../components/GradeBadge';
import Colors from '../../constants/colors';
import useAuth from '../../hooks/useAuth';
import { predictLeafQuality } from '../../services/mlApi';
import { useHarvestStore } from '../../store/harvestStore';
import { useSyncStore } from '../../store/syncStore';
import { GradeResult, QualityGrade } from '../../types';

export default function CaptureScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { addOfflineLot, currentSessionId } = useHarvestStore();
  const { autoSyncEnabled, triggerSync } = useSyncStore();

  // Camera permissions & configuration
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const cameraRef = useRef<CameraView | null>(null);

  // Capture & analysis state
  const [isCapturing, setIsCapturing] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);

  // ML grading state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);
  const [manualGrade, setManualGrade] = useState<QualityGrade | null>(null);
  const [mlError, setMlError] = useState<string | null>(null);

  // Harvest logging inputs
  const [weightText, setWeightText] = useState('12.5');
  const [workerId, setWorkerId] = useState(user?.worker_id || 'WRK-001');
  const [sessionId, setSessionId] = useState(currentSessionId || 'SES-001');
  const [isSaving, setIsSaving] = useState(false);

  // Success state
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Flash cycling: off -> on -> auto -> off
  const cycleFlash = () => {
    setFlash((prev) => (prev === 'off' ? 'on' : prev === 'on' ? 'auto' : 'off'));
  };

  // Flip camera: back <-> front
  const toggleFacing = () => {
    setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  };

  // Trigger AI grading analysis on an image
  const analyzeImage = async (uri: string) => {
    setIsAnalyzing(true);
    setMlError(null);
    setGradeResult(null);
    setManualGrade(null);

    try {
      const result = await predictLeafQuality(uri);
      setGradeResult(result);
    } catch (err: unknown) {
      console.warn('[Capture] ML prediction failed, switching to manual mode:', err);
      setMlError(
        'AI service is currently offline or unreachable. Please select leaf quality manually below.'
      );
      // Default to medium grade if ML is offline
      setManualGrade('medium');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Capture photo from camera
  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });

      if (photo?.uri) {
        setCapturedUri(photo.uri);
        setPreviewVisible(true);
        // Start background ML grading
        analyzeImage(photo.uri);
      }
    } catch (err: unknown) {
      Alert.alert('Capture Error', (err as Error)?.message || 'Failed to capture photo');
    } finally {
      setIsCapturing(false);
    }
  };

  // Pick photo from gallery (useful for testing or existing photos)
  const handlePickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setCapturedUri(uri);
        setPreviewVisible(true);
        analyzeImage(uri);
      }
    } catch (err: unknown) {
      Alert.alert('Gallery Error', (err as Error)?.message || 'Failed to select image');
    }
  };

  // Reset modal state for retaking photo
  const handleRetake = () => {
    setPreviewVisible(false);
    setCapturedUri(null);
    setGradeResult(null);
    setManualGrade(null);
    setMlError(null);
  };

  // Log harvest lot to SQLite
  const handleLogHarvest = async () => {
    const weightNum = parseFloat(weightText);
    if (isNaN(weightNum) || weightNum <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight in kg (greater than 0).');
      return;
    }

    const finalGrade: QualityGrade = manualGrade || gradeResult?.grade || 'medium';
    const finalConfidence = manualGrade ? 1.0 : gradeResult?.confidence || 0.85;

    setIsSaving(true);
    try {
      await addOfflineLot({
        weight_kg: weightNum,
        grade: finalGrade,
        confidence: finalConfidence,
        image_path: capturedUri || undefined,
        session_id: sessionId.trim() || 'SES-001',
        worker_id: workerId.trim() || 'WRK-001',
      });

      // Close preview modal and show brief success dialog
      setPreviewVisible(false);
      setShowSuccessModal(true);

      // Trigger background auto sync if enabled
      if (autoSyncEnabled) {
        triggerSync().catch((e) => console.log('[Capture] Background sync triggered:', e));
      }

      // Auto close success modal after 1.5s
      setTimeout(() => {
        setShowSuccessModal(false);
        setCapturedUri(null);
        setGradeResult(null);
        setManualGrade(null);
        setMlError(null);
      }, 1500);
    } catch (err: unknown) {
      Alert.alert('Save Error', (err as Error)?.message || 'Failed to save offline harvest.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle permission denial or request
  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <View style={styles.permissionCard}>
          <View style={styles.permissionIconBadge}>
            <Ionicons name="camera-outline" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionDescription}>
            TeaVision requires camera access to capture leaf photos and perform real-time AI quality
            grading.
          </Text>

          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
            activeOpacity={0.8}
          >
            <Ionicons name="shield-checkmark-outline" size={18} color="#ffffff" />
            <Text style={styles.permissionButtonText}>Grant Camera Access</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.galleryFallbackButton}
            onPress={handlePickFromGallery}
            activeOpacity={0.8}
          >
            <Ionicons name="images-outline" size={18} color={Colors.primary} />
            <Text style={styles.galleryFallbackText}>Choose Photo from Library</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera View */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing={facing}
        flash={flash}
      />

      {/* Top Header Bar */}
      <SafeAreaView style={styles.topControls} edges={['top']}>
        <TouchableOpacity
          style={styles.circleButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color="#ffffff" />
        </TouchableOpacity>

        {/* Session ID Pill */}
        <View style={styles.sessionBadge}>
          <Ionicons name="calendar-outline" size={14} color="#86efac" />
          <Text style={styles.sessionBadgeText}>{sessionId}</Text>
        </View>

        <View style={styles.topRightActions}>
          {/* Flash Toggle */}
          <TouchableOpacity style={styles.circleButton} onPress={cycleFlash}>
            <Ionicons
              name={
                flash === 'on' ? 'flash' : flash === 'auto' ? 'flash-outline' : 'flash-off-outline'
              }
              size={20}
              color={flash !== 'off' ? '#fde047' : '#ffffff'}
            />
          </TouchableOpacity>

          {/* Flip Camera */}
          <TouchableOpacity style={styles.circleButton} onPress={toggleFacing}>
            <Ionicons name="camera-reverse-outline" size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Viewfinder Target Guide */}
      <View style={styles.viewfinderContainer} pointerEvents="none">
        <View style={styles.reticle}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
          <View style={styles.guideContent}>
            <Ionicons name="leaf-outline" size={32} color="rgba(255,255,255,0.4)" />
            <Text style={styles.guideText}>Center two leaves & a bud</Text>
          </View>
        </View>
      </View>

      {/* Bottom Controls */}
      <SafeAreaView style={styles.bottomControls} edges={['bottom']}>
        <View style={styles.bottomBarRow}>
          {/* Gallery Picker Fallback */}
          <TouchableOpacity style={styles.secondaryButton} onPress={handlePickFromGallery}>
            <Ionicons name="images-outline" size={24} color="#ffffff" />
          </TouchableOpacity>

          {/* Big Circular Capture Button */}
          <TouchableOpacity
            style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
            onPress={handleCapture}
            disabled={isCapturing}
            activeOpacity={0.8}
          >
            <View style={styles.captureInnerCircle}>
              {isCapturing && <ActivityIndicator color={Colors.primary} size="small" />}
            </View>
          </TouchableOpacity>

          {/* Close/Dashboard Shortcut */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/(tabs)/harvest')}
          >
            <Ionicons name="clipboard-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Preview & AI Grading Modal */}
      <Modal visible={previewVisible} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardContainer}
          >
            <ScrollView
              contentContainerStyle={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
            >
              {/* Modal Top Bar */}
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={handleRetake} style={styles.modalRetakeHeaderBtn}>
                  <Ionicons name="chevron-back" size={20} color={Colors.primary} />
                  <Text style={styles.modalRetakeHeaderText}>Retake</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Grade & Log Lot</Text>
                <View style={{ width: 60 }} />
              </View>

              {/* Leaf Image Preview */}
              {capturedUri && (
                <View style={styles.imageContainer}>
                  <Image
                    source={{ uri: capturedUri }}
                    style={styles.previewImage}
                    contentFit="cover"
                  />
                  {isAnalyzing && (
                    <View style={styles.analyzingOverlay}>
                      <ActivityIndicator size="large" color="#ffffff" />
                      <Text style={styles.analyzingText}>AI analyzing tea leaf quality...</Text>
                    </View>
                  )}
                </View>
              )}

              {/* AI Grading Result Section */}
              <View style={styles.resultCard}>
                <Text style={styles.cardHeaderTitle}>Quality Assessment</Text>

                {isAnalyzing ? (
                  <View style={styles.analyzingPlaceholder}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={styles.analyzingPlaceholderText}>
                      Running MobileNetV3 inference...
                    </Text>
                  </View>
                ) : gradeResult ? (
                  <View style={styles.aiResultContent}>
                    <View style={styles.gradeResultHeader}>
                      <GradeBadge grade={gradeResult.grade} size="lg" />
                      <Text style={styles.inferenceMsText}>
                        ⚡ {gradeResult.inference_ms}ms
                      </Text>
                    </View>

                    <ConfidenceBar
                      confidence={gradeResult.confidence}
                      grade={gradeResult.grade}
                      showBreakdown={true}
                      scores={gradeResult.scores}
                    />
                  </View>
                ) : null}

                {/* ML Service Fallback / Manual Grade Selection */}
                {mlError && (
                  <View style={styles.mlErrorBox}>
                    <Ionicons name="cloud-offline" size={18} color="#b45309" />
                    <Text style={styles.mlErrorText}>{mlError}</Text>
                  </View>
                )}

                {/* Manual Grade Selector (always visible for override or offline mode) */}
                <View style={styles.manualGradeSection}>
                  <Text style={styles.manualGradeLabel}>
                    {mlError ? 'Select Grade Manually:' : 'Override Quality Grade (Optional):'}
                  </Text>
                  <View style={styles.gradeButtonsRow}>
                    {(['high', 'medium', 'low'] as QualityGrade[]).map((gradeOpt) => {
                      const isSelected =
                        manualGrade === gradeOpt || (!manualGrade && gradeResult?.grade === gradeOpt);
                      const isHigh = gradeOpt === 'high';
                      const isMed = gradeOpt === 'medium';
                      const activeColor = isHigh
                        ? Colors.high
                        : isMed
                        ? Colors.medium
                        : Colors.low;

                      return (
                        <TouchableOpacity
                          key={gradeOpt}
                          style={[
                            styles.gradeOptionBtn,
                            isSelected && {
                              borderColor: activeColor,
                              backgroundColor: isHigh
                                ? '#ecfdf5'
                                : isMed
                                ? '#fef3c7'
                                : '#fef2f2',
                            },
                          ]}
                          onPress={() => setManualGrade(gradeOpt)}
                        >
                          <Ionicons
                            name="leaf"
                            size={16}
                            color={isSelected ? activeColor : Colors.textMuted}
                          />
                          <Text
                            style={[
                              styles.gradeOptionText,
                              isSelected && { color: activeColor, fontWeight: '700' },
                            ]}
                          >
                            {gradeOpt.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* Harvest Lot Details Card */}
              <View style={styles.lotDetailsCard}>
                <Text style={styles.cardHeaderTitle}>Harvest Lot Details</Text>

                {/* Weight Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Measured Weight (kg) *</Text>
                  <View style={styles.weightInputRow}>
                    <TextInput
                      style={styles.weightInput}
                      value={weightText}
                      onChangeText={setWeightText}
                      keyboardType="decimal-pad"
                      placeholder="0.0"
                      placeholderTextColor="#94a3b8"
                    />
                    <Text style={styles.kgBadge}>KG</Text>
                  </View>

                  {/* Quick Weight Chips */}
                  <View style={styles.quickChipsRow}>
                    {['5.0', '10.0', '12.5', '15.0', '20.0'].map((chip) => (
                      <TouchableOpacity
                        key={chip}
                        style={styles.chipButton}
                        onPress={() => setWeightText(chip)}
                      >
                        <Text style={styles.chipText}>+{chip}kg</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Worker ID & Session ID */}
                <View style={styles.rowInputs}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Worker ID</Text>
                    <TextInput
                      style={styles.textInput}
                      value={workerId}
                      onChangeText={setWorkerId}
                      placeholder="e.g. WRK-001"
                      placeholderTextColor="#94a3b8"
                      autoCapitalize="characters"
                    />
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Session ID</Text>
                    <TextInput
                      style={styles.textInput}
                      value={sessionId}
                      onChangeText={setSessionId}
                      placeholder="e.g. SES-001"
                      placeholderTextColor="#94a3b8"
                      autoCapitalize="characters"
                    />
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActionButtons}>
                <TouchableOpacity
                  style={styles.retakeBtn}
                  onPress={handleRetake}
                  disabled={isSaving}
                >
                  <Ionicons name="refresh-outline" size={18} color={Colors.text} />
                  <Text style={styles.retakeBtnText}>Retake</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
                  onPress={handleLogHarvest}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done" size={20} color="#ffffff" />
                      <Text style={styles.saveBtnText}>Log Harvest Lot</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Success Feedback Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconBadge}>
              <Ionicons name="checkmark" size={36} color="#ffffff" />
            </View>
            <Text style={styles.successTitle}>Lot Logged!</Text>
            <Text style={styles.successMessage}>
              Harvest stored in offline database. Ready for next capture.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  permissionIconBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  permissionDescription: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  galleryFallbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 8,
  },
  galleryFallbackText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  topControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    zIndex: 10,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(134, 239, 172, 0.3)',
  },
  sessionBadgeText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  topRightActions: {
    flexDirection: 'row',
    gap: 10,
  },
  viewfinderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reticle: {
    width: 260,
    height: 260,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#22c55e',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  guideContent: {
    alignItems: 'center',
    gap: 8,
  },
  guideText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  bottomBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  secondaryButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ffffff',
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  captureInnerCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Modal Preview Styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  modalScroll: {
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: Colors.surface,
  },
  modalRetakeHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
  },
  modalRetakeHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  imageContainer: {
    width: '100%',
    height: 240,
    position: 'relative',
    backgroundColor: '#000',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  analyzingText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  analyzingPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  analyzingPlaceholderText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  aiResultContent: {
    marginBottom: 12,
  },
  gradeResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  inferenceMsText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  mlErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#fef3c7',
    marginBottom: 12,
  },
  mlErrorText: {
    fontSize: 12,
    color: '#b45309',
    flex: 1,
    lineHeight: 16,
  },
  manualGradeSection: {
    marginTop: 8,
  },
  manualGradeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 8,
  },
  gradeButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  gradeOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
  },
  gradeOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  lotDetailsCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  weightInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
  },
  weightInput: {
    flex: 1,
    height: 48,
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
  },
  kgBadge: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  quickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  chipButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    height: 44,
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
  },
  modalActionButtons: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 18,
    gap: 10,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  retakeBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Success feedback modal
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  successIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.high,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 6,
  },
  successMessage: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
