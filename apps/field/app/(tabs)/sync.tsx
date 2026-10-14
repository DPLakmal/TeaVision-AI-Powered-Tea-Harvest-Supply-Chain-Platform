import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SyncIndicator from '../../components/SyncIndicator';
import Colors from '../../constants/colors';
import useSync from '../../hooks/useSync';
import { SyncHistoryEntry } from '../../types';

export default function SyncScreen() {
  const {
    pendingCount,
    isSyncing,
    lastSyncAt,
    syncStatus,
    errorMessage,
    syncHistory,
    autoSyncEnabled,
    setAutoSyncEnabled,
    triggerSync,
    refreshPendingCount,
    loadSyncHistory,
    isConnected,
    isInternetReachable,
  } = useSync();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshPendingCount(), loadSyncHistory()]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshPendingCount, loadSyncHistory]);

  const handleManualSync = async () => {
    if (!isConnected) {
      Alert.alert(
        'Offline',
        'Device is not connected to the internet. Please connect to Wi-Fi or cellular data.'
      );
      return;
    }

    try {
      const result = await triggerSync();
      Alert.alert(
        'Sync Complete',
        `Successfully synced ${result.synced} lot(s). ${
          result.failed > 0 ? `${result.failed} lot(s) failed.` : 'All up to date!'
        }`
      );
    } catch (err: unknown) {
      Alert.alert('Sync Error', (err as Error)?.message || 'Sync failed.');
    }
  };

  const formatTimestamp = (isoString?: string | null) => {
    if (!isoString) return 'Never';
    try {
      const date = new Date(isoString);
      return `${date.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
      })}, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    } catch {
      return isoString;
    }
  };

  const renderHistoryItem = ({ item }: { item: SyncHistoryEntry }) => (
    <View style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <View style={styles.historyIcon}>
          {item.failed === 0 ? (
            <Ionicons name="checkmark-circle" size={18} color={Colors.high} />
          ) : (
            <Ionicons name="warning" size={18} color={Colors.medium} />
          )}
        </View>
        <Text style={styles.historyTime}>{formatTimestamp(item.timestamp)}</Text>
      </View>

      <View style={styles.historyStats}>
        <View style={styles.historyPill}>
          <Text style={styles.historyPillText}>✓ {item.synced} synced</Text>
        </View>
        {item.failed > 0 && (
          <View style={[styles.historyPill, styles.historyFailPill]}>
            <Text style={[styles.historyPillText, styles.historyFailText]}>
              ✕ {item.failed} failed
            </Text>
          </View>
        )}
      </View>

      {item.details && <Text style={styles.historyDetails}>{item.details}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <FlatList
        data={syncHistory}
        keyExtractor={(item, index) => item.id || String(index)}
        renderItem={renderHistoryItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Data Synchronization</Text>
              <Text style={styles.headerSubtitle}>
                Manage offline tea lot uploads to TeaVision cloud
              </Text>
            </View>

            {/* Network Status Card */}
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.cardLeft}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: isConnected ? Colors.high : Colors.low },
                    ]}
                  />
                  <Text style={styles.cardLabel}>Network Status</Text>
                </View>
                <View
                  style={[
                    styles.networkBadge,
                    { backgroundColor: isConnected ? '#ecfdf5' : '#fef2f2' },
                  ]}
                >
                  <Text
                    style={[
                      styles.networkBadgeText,
                      { color: isConnected ? Colors.high : Colors.low },
                    ]}
                  >
                    {isConnected ? 'ONLINE' : 'OFFLINE'}
                  </Text>
                </View>
              </View>

              {!isConnected && (
                <Text style={styles.networkNote}>
                  Harvest lots are safely saved in local SQLite. They will automatically upload
                  when internet is restored.
                </Text>
              )}
            </View>

            {/* Sync Queue Card */}
            <View style={styles.card}>
              <View style={styles.queueHeader}>
                <View>
                  <Text style={styles.queueTitle}>Pending Queue</Text>
                  <Text style={styles.queueSubtitle}>
                    {pendingCount === 0
                      ? 'Local database is fully synchronized'
                      : `${pendingCount} harvest ${
                          pendingCount === 1 ? 'lot' : 'lots'
                        } waiting for upload`}
                  </Text>
                </View>
                <SyncIndicator pendingCount={pendingCount} isSyncing={isSyncing} size="lg" />
              </View>

              {errorMessage && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color={Colors.low} />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {/* Sync Now Button */}
              <TouchableOpacity
                style={[
                  styles.syncButton,
                  (!isConnected || isSyncing || pendingCount === 0) && styles.syncButtonDisabled,
                ]}
                onPress={handleManualSync}
                disabled={!isConnected || isSyncing || pendingCount === 0}
                activeOpacity={0.8}
              >
                {isSyncing ? (
                  <View style={styles.syncBtnContent}>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={styles.syncButtonText}>Syncing In Progress...</Text>
                  </View>
                ) : (
                  <View style={styles.syncBtnContent}>
                    <Ionicons name="cloud-upload" size={20} color="#ffffff" />
                    <Text style={styles.syncButtonText}>
                      {pendingCount > 0 ? `Sync Now (${pendingCount} Lots)` : 'All Lots Synced'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Last Sync Info */}
              <View style={styles.metaRow}>
                <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.metaLabel}>Last Sync:</Text>
                <Text style={styles.metaValue}>{formatTimestamp(lastSyncAt)}</Text>
              </View>
            </View>

            {/* Settings Card */}
            <View style={styles.card}>
              <View style={styles.settingRow}>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Automatic Background Sync</Text>
                  <Text style={styles.settingDescription}>
                    Periodically checks network and uploads pending lots every 30 seconds
                  </Text>
                </View>
                <Switch
                  value={autoSyncEnabled}
                  onValueChange={setAutoSyncEnabled}
                  trackColor={{ false: '#cbd5e1', true: Colors.primaryLight }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            {/* Sync History Title */}
            <View style={styles.historyTitleRow}>
              <Text style={styles.sectionTitle}>Sync History</Text>
              <Text style={styles.historyCount}>{syncHistory.length} events</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyHistory}>
            <Ionicons name="time-outline" size={36} color="#cbd5e1" />
            <Text style={styles.emptyHistoryText}>No sync events recorded yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    paddingBottom: 32,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  card: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  networkBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  networkBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  networkNote: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 8,
    lineHeight: 16,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  queueTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  queueSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
    maxWidth: 220,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: Colors.low,
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  syncButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  syncButtonDisabled: {
    backgroundColor: '#94a3b8',
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  syncBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    justifyContent: 'center',
  },
  metaLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  settingDescription: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  historyTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  historyCount: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  historyCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  historyIcon: {
    marginRight: 2,
  },
  historyTime: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  historyStats: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  historyPill: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  historyPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.high,
  },
  historyFailPill: {
    backgroundColor: '#fee2e2',
  },
  historyFailText: {
    color: Colors.low,
  },
  historyDetails: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  emptyHistory: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyHistoryText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
});
