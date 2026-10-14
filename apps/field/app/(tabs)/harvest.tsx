import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HarvestCard from '../../components/HarvestCard';
import Colors from '../../constants/colors';
import useOfflineLots from '../../hooks/useOfflineLots';
import { HarvestLotOffline, LotFilter } from '../../types';

export default function HarvestLogScreen() {
  const router = useRouter();
  const {
    lots,
    activeFilter,
    setActiveFilter,
    refreshLots,
    refreshTodayStats,
    removeLot,
    isLoading,
  } = useOfflineLots();

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshLots(), refreshTodayStats()]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshLots, refreshTodayStats]);

  // Filter lots based on active filter tab and text search
  const filteredLots = useMemo(() => {
    return lots.filter((lot) => {
      // 1. Tab filter
      if (activeFilter === 'pending' && lot.synced) return false;
      if (activeFilter === 'synced' && !lot.synced) return false;

      // 2. Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesWorker = lot.worker_id.toLowerCase().includes(query);
        const matchesSession = lot.session_id.toLowerCase().includes(query);
        const matchesGrade = lot.grade.toLowerCase().includes(query);
        const matchesWeight = `${lot.weight_kg}kg`.toLowerCase().includes(query);
        return matchesWorker || matchesSession || matchesGrade || matchesWeight;
      }

      return true;
    });
  }, [lots, activeFilter, searchQuery]);

  // Aggregate stats for filtered lots
  const filteredStats = useMemo(() => {
    let weight = 0;
    for (const lot of filteredLots) {
      weight += lot.weight_kg;
    }
    return {
      count: filteredLots.length,
      weight: Math.round(weight * 10) / 10,
    };
  }, [filteredLots]);

  const handleDelete = (id: string) => {
    Alert.alert('Delete Harvest Lot', 'Are you sure you want to delete this offline lot record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeLot(id);
          } catch (err: unknown) {
            Alert.alert('Error', (err as Error)?.message || 'Failed to delete lot');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: HarvestLotOffline }) => (
    <HarvestCard lot={item} onDelete={handleDelete} />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Screen Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Harvest Log</Text>
          <Text style={styles.headerSubtitle}>
            Offline SQLite storage • {lots.length} total lots
          </Text>
        </View>

        <TouchableOpacity
          style={styles.newCaptureButton}
          onPress={() => router.push('/(tabs)/capture')}
        >
          <Ionicons name="add" size={20} color="#ffffff" />
          <Text style={styles.newCaptureText}>Capture</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabsRow}>
        {(['all', 'pending', 'synced'] as LotFilter[]).map((filter) => {
          const isActive = activeFilter === filter;
          const label =
            filter === 'all'
              ? 'All'
              : filter === 'pending'
              ? 'Pending Sync'
              : 'Synced';

          return (
            <TouchableOpacity
              key={filter}
              style={[styles.filterTab, isActive && styles.filterTabActive]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Filter by worker, session, or grade..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter summary strip */}
      <View style={styles.summaryStrip}>
        <Text style={styles.summaryStripText}>
          Showing <Text style={styles.summaryBold}>{filteredStats.count}</Text> entries (
          <Text style={styles.summaryBold}>{filteredStats.weight} kg</Text>)
        </Text>
      </View>

      {/* Lots List */}
      <FlatList
        data={filteredLots}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="documents-outline" size={54} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>
                {searchQuery
                  ? 'No Matching Lots Found'
                  : activeFilter === 'pending'
                  ? 'No Lots Pending Sync'
                  : activeFilter === 'synced'
                  ? 'No Synced Lots'
                  : 'No Harvests Recorded Yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'Try modifying your search keywords.'
                  : 'Take photos and log tea leaf batches to see them here.'}
              </Text>

              <TouchableOpacity
                style={styles.emptyCaptureButton}
                onPress={() => router.push('/(tabs)/capture')}
              >
                <Ionicons name="camera-outline" size={18} color="#ffffff" />
                <Text style={styles.emptyCaptureText}>Capture New Lot</Text>
              </TouchableOpacity>
            </View>
          ) : null
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
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
  newCaptureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  newCaptureText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  filterTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 10,
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  filterTabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 13,
    color: Colors.text,
  },
  searchClearBtn: {
    padding: 4,
  },
  summaryStrip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 4,
  },
  summaryStripText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  summaryBold: {
    fontWeight: '700',
    color: Colors.text,
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 18,
  },
  emptyCaptureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyCaptureText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
