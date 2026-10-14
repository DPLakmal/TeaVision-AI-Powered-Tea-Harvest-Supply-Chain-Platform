import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Colors from '../constants/colors';
import { initDatabase } from '../services/db';
import { startAutoSync } from '../services/offlineSync';
import { useAuthStore } from '../store/authStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function RootNavigation() {
  const segments = useSegments();
  const router = useRouter();
  const { isAuthenticated, isLoading, loadFromStorage } = useAuthStore();
  const [dbReady, setDbReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // 1. Initialize SQLite Database & load stored auth session
  useEffect(() => {
    let cleanupAutoSync: (() => void) | null = null;

    async function initialize() {
      try {
        console.log('[App] Initializing SQLite database...');
        await initDatabase();
        setDbReady(true);
        console.log('[App] SQLite initialized successfully.');

        console.log('[App] Loading auth session from SecureStore...');
        await loadFromStorage();

        console.log('[App] Starting background auto-sync service...');
        cleanupAutoSync = await startAutoSync();
      } catch (err: unknown) {
        console.error('[App] Startup initialization failed:', err);
        setInitError((err as Error)?.message || 'Initialization failed');
      }
    }

    initialize();

    return () => {
      if (cleanupAutoSync) {
        cleanupAutoSync();
      }
    };
  }, [loadFromStorage]);

  // 2. Auth routing guard
  useEffect(() => {
    if (isLoading || !dbReady) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // User is not authenticated and trying to access tabs/screens -> send to login
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // User is authenticated and currently on auth screen -> send to main tabs
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, dbReady, segments, router]);

  if (isLoading || !dbReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingTitle}>TeaVision Field</Text>
        <Text style={styles.loadingSubtitle}>
          {initError ? `Error: ${initError}` : 'Preparing offline database...'}
        </Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <RootNavigation />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: 16,
    letterSpacing: 0.5,
  },
  loadingSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 6,
    textAlign: 'center',
  },
});
