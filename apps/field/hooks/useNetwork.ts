import * as Network from 'expo-network';
import { useCallback, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export interface NetworkInfo {
  isConnected: boolean;
  isInternetReachable: boolean;
  connectionType: string;
  refreshNetwork: () => Promise<boolean>;
}

export function useNetwork(): NetworkInfo {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean>(true);
  const [connectionType, setConnectionType] = useState<string>('UNKNOWN');

  const checkNetwork = useCallback(async (): Promise<boolean> => {
    try {
      const state = await Network.getNetworkStateAsync();
      const connected = Boolean(state.isConnected);
      const reachable = state.isInternetReachable !== false;

      setIsConnected(connected);
      setIsInternetReachable(reachable);
      setConnectionType(state.type ? String(state.type) : 'UNKNOWN');

      return connected && reachable;
    } catch (err) {
      console.warn('[useNetwork] Error checking state:', err);
      return false;
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkNetwork();

    // Check on interval
    const interval = setInterval(checkNetwork, 10000);

    // Check on app foreground
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkNetwork();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [checkNetwork]);

  return {
    isConnected,
    isInternetReachable,
    connectionType,
    refreshNetwork: checkNetwork,
  };
}

export default useNetwork;
