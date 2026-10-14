import { CameraType, CameraView, FlashMode, useCameraPermissions } from 'expo-camera';
import { useCallback, useRef, useState } from 'react';

export function useCamera() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const cameraRef = useRef<CameraView | null>(null);

  const toggleFacing = useCallback(() => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  }, []);

  const toggleFlash = useCallback(() => {
    setFlash((current) => {
      if (current === 'off') return 'on';
      if (current === 'on') return 'auto';
      return 'off';
    });
  }, []);

  const takePhoto = useCallback(async (): Promise<string | null> => {
    if (!cameraRef.current || isCapturing) {
      return null;
    }

    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });
      return photo?.uri ?? null;
    } catch (error) {
      console.error('[useCamera] takePictureAsync failed:', error);
      throw error;
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing]);

  return {
    permission,
    requestPermission,
    facing,
    toggleFacing,
    flash,
    toggleFlash,
    cameraRef,
    isCapturing,
    takePhoto,
  };
}

export default useCamera;
