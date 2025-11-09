import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { pushRoute } from '@/src/lib/navigationStack';
import { SwipeableCard } from '@/components/swipeable-card';
import {
  getPotentialMatches,
  getMutualMatches,
  swipe,
  PotentialMatch,
  MutualMatch,
} from '@/src/lib/matchingService';
import { auth } from '@/src/lib/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CACHE_KEY = 'potential_matches_cache';
const CACHE_EXPIRY = 30 * 1000; // 30 seconds (reduced for faster updates)

interface CachedMatches {
  matches: PotentialMatch[];
  timestamp: number;
}

type ViewMode = 'discover' | 'matches';

export default function MatchScreen() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('discover');
  const [matches, setMatches] = useState<PotentialMatch[]>([]);
  const [mutualMatches, setMutualMatches] = useState<MutualMatch[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swiping, setSwiping] = useState(false);

  const loadMatches = useCallback(async (useCache: boolean = true, skipCache: boolean = false) => {
    try {
      setLoading(true);

      // Try to load from cache first (unless skipCache is true)
      if (useCache && !skipCache) {
        try {
          const cached = await AsyncStorage.getItem(CACHE_KEY);
          if (cached) {
            const cachedData: CachedMatches = JSON.parse(cached);
            const now = Date.now();
            if (now - cachedData.timestamp < CACHE_EXPIRY && cachedData.matches.length > 0) {
              setMatches(cachedData.matches);
              setCurrentIndex(0);
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          console.log('Cache read error:', e);
        }
      }

      // Fetch from API
      const data = await getPotentialMatches(50, true);
      setMatches(data.matches);
      setCurrentIndex(0);

      // Cache the results
      try {
        const cacheData: CachedMatches = {
          matches: data.matches,
          timestamp: Date.now(),
        };
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      } catch (e) {
        console.log('Cache write error:', e);
      }
    } catch (error: any) {
      console.error('Error loading matches:', error);
      Alert.alert('Error', error.message || 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load matches when component mounts
  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const loadMutualMatches = useCallback(async () => {
    try {
      setLoading(true);
      const matches = await getMutualMatches();
      setMutualMatches(matches);
    } catch (error: any) {
      console.error('Error loading mutual matches:', error);
      Alert.alert('Error', error.message || 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload matches when tab comes into focus (user switches to this tab)
  useFocusEffect(
    useCallback(() => {
      if (viewMode === 'discover') {
        // Skip cache when tab is focused to get fresh data
        // This ensures updated interests are reflected immediately
        loadMatches(true, true); // useCache=true but skipCache=true means fetch fresh
      } else {
        loadMutualMatches();
      }
    }, [loadMatches, loadMutualMatches, viewMode])
  );

  // Load mutual matches when switching to matches view
  useEffect(() => {
    if (viewMode === 'matches') {
      loadMutualMatches();
    }
  }, [viewMode, loadMutualMatches]);

  const handleSwipeLeft = useCallback(async () => {
    if (swiping || currentIndex >= matches.length) return;

    const currentMatch = matches[currentIndex];
    setSwiping(true);

    try {
      await swipe(currentMatch.uid, 'pass');
      setCurrentIndex((prev) => prev + 1);

      // Load more if we're running low
      if (currentIndex >= matches.length - 3) {
        loadMatches(false);
      }
    } catch (error: any) {
      console.error('Error swiping:', error);
      Alert.alert('Error', error.message || 'Failed to record swipe');
    } finally {
      setSwiping(false);
    }
  }, [currentIndex, matches, swiping, loadMatches]);

  const handleSwipeRight = useCallback(async () => {
    if (swiping || currentIndex >= matches.length) return;

    const currentMatch = matches[currentIndex];
    setSwiping(true);

    try {
      const result = await swipe(currentMatch.uid, 'like');
      setCurrentIndex((prev) => prev + 1);

      if (result.isMatch) {
        Alert.alert('🎉 It\'s a Match!', `You and ${currentMatch.name || currentMatch.username} liked each other!`);
        // Refresh mutual matches if we're in matches view
        if (viewMode === 'matches') {
          loadMutualMatches();
        }
      }

      // Load more if we're running low
      if (currentIndex >= matches.length - 3) {
        loadMatches(false);
      }
    } catch (error: any) {
      console.error('Error swiping:', error);
      Alert.alert('Error', error.message || 'Failed to record swipe');
    } finally {
      setSwiping(false);
    }
  }, [currentIndex, matches, swiping, loadMatches]);

  const handleManualPass = useCallback(() => {
    handleSwipeLeft();
  }, [handleSwipeLeft]);

  const handleManualLike = useCallback(() => {
    handleSwipeRight();
  }, [handleSwipeRight]);

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch {
      return 'Recently';
    }
  };

  // Matches view
  if (viewMode === 'matches') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>My Matches</Text>
            <View style={styles.viewModeToggle}>
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setViewMode('discover')}
              >
                <Text style={styles.toggleButtonText}>
                  Discover
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, styles.toggleButtonActive]}
                onPress={() => setViewMode('matches')}
              >
                <Text style={[styles.toggleButtonText, styles.toggleButtonTextActive]}>
                  Matches
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>
            {mutualMatches.length} mutual match{mutualMatches.length !== 1 ? 'es' : ''}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Loading matches...</Text>
          </View>
        ) : mutualMatches.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No matches yet</Text>
            <Text style={styles.emptyText}>
              Start swiping to find your hiking buddies!
            </Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={() => setViewMode('discover')}
            >
              <Text style={styles.refreshButtonText}>Start Discovering</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView 
            style={styles.matchesListContainer}
            contentContainerStyle={styles.matchesListContent}
          >
            {mutualMatches.map((match) => (
              <TouchableOpacity
                key={match.uid}
                style={styles.matchCard}
                onPress={() => {
                  // Store current route before navigating to messages
                  const currentRoute = '/(tabs)/match';
                  pushRoute(currentRoute);
                  router.push(`/(tabs)/message/${match.uid}` as any);
                }}
              >
                <View style={styles.matchCardContent}>
                  <View style={styles.matchAvatar}>
                    {match.profilePicture ? (
                      <Text style={styles.matchAvatarText}>📷</Text>
                    ) : (
                      <Text style={styles.matchAvatarText}>
                        {(match.name || match.username || '?')[0].toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.matchInfo}>
                    <Text style={styles.matchName}>
                      {match.name || match.username || 'Unknown User'}
                    </Text>
                    <Text style={styles.matchUsername}>
                      @{match.username || 'user'}
                    </Text>
                    <Text style={styles.matchDate}>
                      Matched {formatDate(match.matchedAt)}
                    </Text>
                  </View>
                  <Text style={styles.arrowText}>→</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    );
  }

  // Discover view - loading state
  if (loading && matches.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Discover</Text>
            <View style={styles.viewModeToggle}>
              <TouchableOpacity
                style={[styles.toggleButton, styles.toggleButtonActive]}
                onPress={() => setViewMode('discover')}
              >
                <Text style={[styles.toggleButtonText, styles.toggleButtonTextActive]}>
                  Discover
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setViewMode('matches')}
              >
                <Text style={styles.toggleButtonText}>
                  Matches {mutualMatches.length > 0 && `(${mutualMatches.length})`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading matches...</Text>
        </View>
      </View>
    );
  }

  // Discover view - no more matches
  if (currentIndex >= matches.length && matches.length > 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Discover</Text>
            <View style={styles.viewModeToggle}>
              <TouchableOpacity
                style={[styles.toggleButton, styles.toggleButtonActive]}
                onPress={() => setViewMode('discover')}
              >
                <Text style={[styles.toggleButtonText, styles.toggleButtonTextActive]}>
                  Discover
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setViewMode('matches')}
              >
                <Text style={styles.toggleButtonText}>
                  Matches {mutualMatches.length > 0 && `(${mutualMatches.length})`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>
            {matches.length - currentIndex} matches remaining
          </Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No more matches</Text>
          <Text style={styles.emptyText}>
            Check back later for more potential matches!
          </Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => loadMatches(false)}
          >
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Discover view - show cards
  const visibleCards = matches.slice(currentIndex, currentIndex + 3);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Discover</Text>
          <View style={styles.viewModeToggle}>
            <TouchableOpacity
              style={[styles.toggleButton, styles.toggleButtonActive]}
              onPress={() => setViewMode('discover')}
            >
              <Text style={[styles.toggleButtonText, styles.toggleButtonTextActive]}>
                Discover
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setViewMode('matches')}
            >
              <Text style={styles.toggleButtonText}>
                Matches {mutualMatches.length > 0 && `(${mutualMatches.length})`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>
          {matches.length - currentIndex} matches remaining
        </Text>
      </View>

      <View style={styles.cardsContainer}>
        {visibleCards.map((match, index) => (
          <SwipeableCard
            key={match.uid}
            match={match}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            isTopCard={index === 0}
          />
        ))}
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.passButton]}
          onPress={handleManualPass}
          disabled={swiping}
        >
          <Text style={styles.actionButtonText}>✕</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.likeButton]}
          onPress={handleManualLike}
          disabled={swiping}
        >
          <Text style={styles.actionButtonText}>♥</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    padding: 2,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 18,
  },
  toggleButtonActive: {
    backgroundColor: '#4CAF50',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  matchesListContainer: {
    flex: 1,
  },
  matchesListContent: {
    padding: 20,
    paddingBottom: 40,
  },
  matchCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  matchCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  matchAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  matchAvatarText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  matchInfo: {
    flex: 1,
  },
  matchName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  matchUsername: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  matchDate: {
    fontSize: 12,
    color: '#999',
  },
  arrowText: {
    fontSize: 20,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 12,
  },
  cardsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
    gap: 40,
  },
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  passButton: {
    backgroundColor: '#F44336',
  },
  likeButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    fontSize: 28,
    color: '#fff',
  },
});

