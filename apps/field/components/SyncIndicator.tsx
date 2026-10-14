import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Colors from '../constants/colors';

interface SyncIndicatorProps {
  pendingCount: number;
  isSyncing?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const SyncIndicator: React.FC<SyncIndicatorProps> = ({
  pendingCount,
  isSyncing = false,
  size = 'md',
  showLabel = false,
}) => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (isSyncing) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      cancelAnimation(rotation);
      rotation.value = 0;
    }
  }, [isSyncing, rotation]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 22 : 18;

  if (isSyncing) {
    return (
      <View style={[styles.container, styles[`container_${size}`], styles.syncingContainer]}>
        <Animated.View style={animatedStyle}>
          <Ionicons name="sync" size={iconSize} color={Colors.primaryLight} />
        </Animated.View>
        {showLabel && <Text style={[styles.label, { color: Colors.primaryDark }]}>Syncing...</Text>}
      </View>
    );
  }

  if (pendingCount > 0) {
    return (
      <View style={[styles.container, styles[`container_${size}`], styles.pendingContainer]}>
        <Ionicons name="cloud-upload-outline" size={iconSize} color={Colors.secondary} />
        <View style={styles.badgeCount}>
          <Text style={styles.badgeText}>{pendingCount}</Text>
        </View>
        {showLabel && (
          <Text style={[styles.label, { color: Colors.secondary }]}>
            {pendingCount} pending
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, styles[`container_${size}`], styles.syncedContainer]}>
      <Ionicons name="checkmark-circle" size={iconSize} color={Colors.high} />
      {showLabel && <Text style={[styles.label, { color: Colors.high }]}>All synced</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
  },
  container_sm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
  },
  container_md: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
  },
  container_lg: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 8,
  },
  syncingContainer: {
    backgroundColor: '#dcfce7',
  },
  pendingContainer: {
    backgroundColor: '#fef3c7',
  },
  syncedContainer: {
    backgroundColor: '#ecfdf5',
  },
  badgeCount: {
    backgroundColor: Colors.secondary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default SyncIndicator;
