import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Colors from '../constants/colors';
import { HarvestLotOffline } from '../types';
import GradeBadge from './GradeBadge';

interface HarvestCardProps {
  lot: HarvestLotOffline;
  onPress?: () => void;
  onDelete?: (id: string) => void;
}

export const HarvestCard: React.FC<HarvestCardProps> = ({ lot, onPress, onDelete }) => {
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (isToday) {
        return `Today, ${timeStr}`;
      }
      return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
    } catch {
      return isoString;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.75 : 1}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.topRow}>
        <View style={styles.badgeRow}>
          <GradeBadge grade={lot.grade} size="sm" />
          <Text style={styles.confidenceText}>
            {Math.round(lot.confidence <= 1 ? lot.confidence * 100 : lot.confidence)}% conf
          </Text>
        </View>

        <View style={styles.syncStatus}>
          {lot.synced ? (
            <View style={styles.syncedPill}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.high} />
              <Text style={styles.syncedText}>Synced</Text>
            </View>
          ) : (
            <View style={styles.pendingPill}>
              <Ionicons name="cloud-upload-outline" size={14} color={Colors.secondary} />
              <Text style={styles.pendingText}>Pending</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.mainContent}>
        {lot.image_path ? (
          <Image
            source={{ uri: lot.image_path }}
            style={styles.thumbnail}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.thumbnail, styles.imagePlaceholder]}>
            <Ionicons name="leaf-outline" size={24} color={Colors.primary} />
          </View>
        )}

        <View style={styles.details}>
          <View style={styles.weightRow}>
            <Text style={styles.weightValue}>{lot.weight_kg.toFixed(1)}</Text>
            <Text style={styles.weightUnit}>kg</Text>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="person-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.metaText}>{lot.worker_id}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.metaText}>{lot.session_id}</Text>
            </View>
          </View>

          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.timeText}>{formatTime(lot.created_at)}</Text>
          </View>
        </View>

        {onDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => onDelete(lot.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginVertical: 6,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confidenceText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  syncedText: {
    fontSize: 11,
    color: Colors.high,
    fontWeight: '600',
  },
  pendingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  pendingText: {
    fontSize: 11,
    color: Colors.secondary,
    fontWeight: '600',
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dcfce7',
  },
  details: {
    flex: 1,
    marginLeft: 12,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  weightValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
  },
  weightUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
    marginLeft: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  deleteButton: {
    padding: 6,
    marginLeft: 8,
  },
});

export default HarvestCard;
