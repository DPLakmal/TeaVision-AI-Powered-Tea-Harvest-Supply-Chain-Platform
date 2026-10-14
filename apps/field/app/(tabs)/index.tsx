import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HarvestCard from '../../components/HarvestCard';
import SyncIndicator from '../../components/SyncIndicator';
import Colors from '../../constants/colors';
import useAuth from '../../hooks/useAuth';
import useOfflineLots from '../../hooks/useOfflineLots';
import useSync from '../../hooks/useSync';

export default function DashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { lots, todayStats, refreshLots, refreshTodayStats, removeLot } = useOfflineLots();
  const { pendingCount, isSyncing, triggerSync, canSync, isConnected } = useSync();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshLots(), refreshTodayStats()]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshLots, refreshTodayStats]);

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = user?.name || user?.email?.split('@')[0] || 'Worker';

  // Calculate percentage of today's grades for the mini distribution bar
  const totalToday = todayStats.totalLots || 0;
  const highPct = totalToday > 0 ? (todayStats.highCount / totalToday) * 100 : 0;
  const medPct = totalToday > 0 ? (todayStats.mediumCount / totalToday) * 100 : 0;
  const lowPct = totalToday > 0 ? (todayStats.lowCount / totalToday) * 100 : 0;

  // Recent 5 lots
  const recentLots = lots.slice(0, 5);

  const handleSyncPress = async () => {
    try {
      await triggerSync();
    } catch (err: unknown) {
      Alert.alert('Sync Warning', (err as Error)?.message || 'Sync failed');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Top Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greetingText}>{getTimeGreeting()},</Text>
            <Text style={styles.nameText}>{displayName} 🍃</Text>
          </View>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => {
              Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: logout },
              ]);
            }}
          >
            <Ionicons name="log-out-outline" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Sync Status Banner if pending > 0 */}
        {pendingCount > 0 && (
          <View style={styles.syncBanner}>
            <View style={styles.syncBannerLeft}>
              <SyncIndicator pendingCount={pendingCount} isSyncing={isSyncing} size="sm" />
              <Text style={styles.syncBannerText}>
                {pendingCount} offline {pendingCount === 1 ? 'lot' : 'lots'} waiting to sync
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.syncNowButton,
                (!canSync || isSyncing) && styles.syncNowButtonDisabled,
              ]}
              disabled={!canSync || isSyncing}
              onPress={handleSyncPress}
            >
              <Text style={styles.syncNowButtonText}>
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Offline notification badge if disconnected */}
        {!isConnected && (
          <View style={styles.offlineAlert}>
            <Ionicons name="cloud-offline" size={16} color="#b45309" />
            <Text style={styles.offlineAlertText}>
              Offline mode active. All harvest entries are stored safely on device.
            </Text>
          </View>
        )}

        {/* Today's Summary Section */}
        <Text style={styles.sectionTitle}>Today's Harvest Summary</Text>
        <View style={styles.statsGrid}>
          {/* Card 1: Lots */}
          <View style={[styles.statCard, { borderLeftColor: Colors.primary }]}>
            <View style={styles.statIconBadge}>
              <Ionicons name="file-tray-full-outline" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.statValue}>{todayStats.totalLots}</Text>
            <Text style={styles.statLabel}>Lots Logged</Text>
          </View>

          {/* Card 2: Total Weight */}
          <View style={[styles.statCard, { borderLeftColor: Colors.primaryLight }]}>
            <View style={[styles.statIconBadge, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="scale-outline" size={20} color={Colors.primaryLight} />
            </View>
            <View style={styles.weightValueRow}>
              <Text style={styles.statValue}>{todayStats.totalWeight.toFixed(1)}</Text>
              <Text style={styles.statWeightUnit}>kg</Text>
            </View>
            <Text style={styles.statLabel}>Total Weight</Text>
          </View>

          {/* Card 3: Pending */}
          <View style={[styles.statCard, { borderLeftColor: Colors.secondary }]}>
            <View style={[styles.statIconBadge, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="cloud-upload-outline" size={20} color={Colors.secondary} />
            </View>
            <Text style={styles.statValue}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending Sync</Text>
          </View>
        </View>

        {/* Grade Breakdown Card */}
        <View style={styles.breakdownCard}>
          <View style={styles.breakdownHeader}>
            <Text style={styles.breakdownTitle}>Quality Breakdown (Today)</Text>
            <Text style={styles.breakdownSubtitle}>{todayStats.totalLots} total</Text>
          </View>

          {/* Stacked mini bar */}
          <View style={styles.stackedBar}>
            {highPct > 0 && <View style={[styles.barSegment, { width: `${highPct}%`, backgroundColor: Colors.high }]} />}
            {medPct > 0 && <View style={[styles.barSegment, { width: `${medPct}%`, backgroundColor: Colors.medium }]} />}
            {lowPct > 0 && <View style={[styles.barSegment, { width: `${lowPct}%`, backgroundColor: Colors.low }]} />}
            {totalToday === 0 && <View style={[styles.barSegment, { width: '100%', backgroundColor: '#e2e8f0' }]} />}
          </View>

          {/* Legends */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.high }]} />
              <Text style={styles.legendText}>High: {todayStats.highCount}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.medium }]} />
              <Text style={styles.legendText}>Med: {todayStats.mediumCount}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.low }]} />
              <Text style={styles.legendText}>Low: {todayStats.lowCount}</Text>
            </View>
          </View>
        </View>

        {/* Big Action Button to Camera */}
        <TouchableOpacity
          style={styles.actionBanner}
          activeOpacity={0.85}
          onPress={() => router.push('/(tabs)/capture')}
        >
          <View style={styles.actionIconContainer}>
            <Ionicons name="camera" size={28} color="#ffffff" />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>New Leaf Capture</Text>
            <Text style={styles.actionSubtitle}>
              Scan leaf with AI grading & log lot weight
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#ffffff" />
        </TouchableOpacity>

        {/* Recent Lots Section */}
        <View style={styles.recentSectionHeader}>
          <Text style={styles.sectionTitle}>Recent Harvest Lots</Text>
          {lots.length > 0 && (
            <TouchableOpacity onPress={() => router.push('/(tabs)/harvest')}>
              <Text style={styles.viewAllText}>View All ({lots.length})</Text>
            </TouchableOpacity>
          )}
        </View>

        {recentLots.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="leaf-outline" size={44} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No Harvests Logged Yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the capture button below to scan and grade your first tea harvest lot.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/(tabs)/capture')}
            >
              <Ionicons name="camera-outline" size={18} color="#ffffff" />
              <Text style={styles.emptyButtonText}>Start Capture</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recentLots.map((lot) => (
            <HarvestCard
              key={lot.id}
              lot={lot}
              onPress={() => router.push('/(tabs)/harvest')}
              onDelete={(id) => {
                Alert.alert('Delete Lot', 'Are you sure you want to delete this lot record?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => removeLot(id) },
                ]);
              }}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 28,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  greetingText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  nameText: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 0.2,
  },
  logoutBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  syncBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  syncBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  syncBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
    flex: 1,
  },
  syncNowButton: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  syncNowButtonDisabled: {
    opacity: 0.6,
  },
  syncNowButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  offlineAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fef3c7',
    padding: 10,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  offlineAlertText: {
    fontSize: 12,
    color: '#b45309',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  weightValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statWeightUnit: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    marginLeft: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 2,
  },
  breakdownCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  breakdownSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  stackedBar: {
    height: 12,
    borderRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    marginBottom: 10,
  },
  barSegment: {
    height: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  actionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  actionSubtitle: {
    color: '#bbf7d0',
    fontSize: 12,
    marginTop: 2,
  },
  recentSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 16,
    marginTop: 6,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primaryLight,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 24,
    marginHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginVertical: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 18,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
