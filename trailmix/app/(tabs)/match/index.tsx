import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  TextInput,
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
import { getConversations, Conversation } from '@/src/lib/messagingService';
import { auth } from '@/src/lib/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { theme } from "@/app/theme";

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CACHE_KEY = 'potential_matches_cache';
const MUTUAL_MATCHES_CACHE_KEY = 'mutual_matches_cache';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes (longer cache for better UX)

interface CachedMatches {
  matches: PotentialMatch[];
  timestamp: number;
}

interface CachedMutualMatches {
  matches: MutualMatch[];
  timestamp: number;
}

interface EnhancedMatch extends MutualMatch {
  hasUnreadMessages?: boolean;
  lastMessageTime?: string;
  hasNeverMessaged?: boolean;
}

type ViewMode = 'discover' | 'matches';

export default function MatchScreen() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('discover');
  const [matches, setMatches] = useState<PotentialMatch[]>([]);
  const [mutualMatches, setMutualMatches] = useState<MutualMatch[]>([]);
  const [enhancedMatches, setEnhancedMatches] = useState<EnhancedMatch[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swiping, setSwiping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingMutualMatches, setLoadingMutualMatches] = useState(false);

  const loadMatches = useCallback(async (useCache: boolean = true, skipCache: boolean = false) => {
    let hasCachedData = false;
    
    try {
      // Try to load from cache first and show immediately (unless skipCache is true)
      if (useCache && !skipCache) {
        try {
          const cached = await AsyncStorage.getItem(CACHE_KEY);
          if (cached) {
            const cachedData: CachedMatches = JSON.parse(cached);
            const now = Date.now();
            if (now - cachedData.timestamp < CACHE_EXPIRY && cachedData.matches.length > 0) {
              // Show cached data immediately
              setMatches(cachedData.matches);
              setCurrentIndex(0);
              setLoading(false);
              hasCachedData = true;
              // Continue to fetch fresh data in background
            } else {
              // Cache expired, need to fetch
              setLoading(true);
            }
          } else {
            setLoading(true);
          }
        } catch (e) {
          console.log('Cache read error:', e);
          setLoading(true);
        }
      } else {
        setLoading(true);
      }

      // Fetch fresh data from API (in background if cache was shown)
      try {
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
        // Only show error if we don't have cached data
        if (!hasCachedData) {
          Alert.alert('Error', error.message || 'Failed to load matches');
        }
      } finally {
        setLoading(false);
      }
    } catch (error: any) {
      console.error('Error loading matches:', error);
      if (!hasCachedData) {
        Alert.alert('Error', error.message || 'Failed to load matches');
      }
      setLoading(false);
    }
  }, []);

  // Load matches when component mounts - show cache immediately
  useEffect(() => {
    loadMatches(true, false); // Use cache, don't skip
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load conversations and enhance matches with message info
  const loadConversationsAndEnhanceMatches = useCallback(async (matches: MutualMatch[]) => {
    const user = auth.currentUser;
    if (!user) return matches;

    try {
      // Load conversations
      const convs = await getConversations(user.uid);
      setConversations(convs);

      // Create a map of conversations by other_user_uid
      const conversationMap = new Map<string, Conversation>();
      convs.forEach(conv => {
        conversationMap.set(conv.other_user_uid, conv);
      });

      // Enhance matches with conversation info
      const enhanced: EnhancedMatch[] = matches.map(match => {
        const conversation = conversationMap.get(match.uid);
        const hasConversation = !!conversation;
        const lastMessage = conversation?.last_message;
        
        // Check if there are unread messages (last message was sent by the other user)
        const hasUnread = hasConversation && lastMessage && lastMessage.sender_uid === match.uid;
        
        return {
          ...match,
          hasUnreadMessages: hasUnread,
          lastMessageTime: lastMessage?.created_at,
          hasNeverMessaged: !hasConversation,
        };
      });

      // Sort matches:
      // 1. Unread messages first (by most recent message)
      // 2. Never messaged (by match date)
      // 3. Messaged (by most recent message)
      enhanced.sort((a, b) => {
        // Priority 1: Unread messages first
        if (a.hasUnreadMessages && !b.hasUnreadMessages) return -1;
        if (!a.hasUnreadMessages && b.hasUnreadMessages) return 1;
        
        // If both have unread, sort by most recent message
        if (a.hasUnreadMessages && b.hasUnreadMessages) {
          const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
          const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
          return bTime - aTime;
        }
        
        // Priority 2: Never messaged (only if neither has unread)
        if (a.hasNeverMessaged && !b.hasNeverMessaged) return -1;
        if (!a.hasNeverMessaged && b.hasNeverMessaged) return 1;
        
        // If both never messaged, sort by match date
        if (a.hasNeverMessaged && b.hasNeverMessaged) {
          return new Date(b.matchedAt).getTime() - new Date(a.matchedAt).getTime();
        }
        
        // Priority 3: Both have messaged (sort by most recent message)
        const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : new Date(a.matchedAt).getTime();
        const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : new Date(b.matchedAt).getTime();
        return bTime - aTime;
      });

      setEnhancedMatches(enhanced);
    } catch (error: any) {
      console.error('Error loading conversations:', error);
      // If conversations fail, just use matches as-is
      setEnhancedMatches(matches.map(m => ({ ...m, hasNeverMessaged: true })));
    }
  }, []);

  const loadMutualMatches = useCallback(async (useCache: boolean = true) => {
    let hasCachedData = false;
    
    try {
      // Try to load from cache first and show immediately
      if (useCache) {
        try {
          const cached = await AsyncStorage.getItem(MUTUAL_MATCHES_CACHE_KEY);
          if (cached) {
            const cachedData: CachedMutualMatches = JSON.parse(cached);
            // Always show cached data if available (even if expired), then refresh in background
            if (cachedData.matches.length > 0) {
              // Show cached data immediately
              setMutualMatches(cachedData.matches);
              await loadConversationsAndEnhanceMatches(cachedData.matches);
              setLoadingMutualMatches(false);
              hasCachedData = true;
              // Always fetch fresh data in background (regardless of expiry)
            } else {
              setLoadingMutualMatches(true);
            }
          } else {
            setLoadingMutualMatches(true);
          }
        } catch (e) {
          console.log('Cache read error:', e);
          setLoadingMutualMatches(true);
        }
      } else {
        setLoadingMutualMatches(true);
      }

      // Fetch fresh data from API (in background if cache was shown)
      try {
        const matches = await getMutualMatches();
        setMutualMatches(matches);
        await loadConversationsAndEnhanceMatches(matches);
        
        // Cache the results
        try {
          const cacheData: CachedMutualMatches = {
            matches: matches,
            timestamp: Date.now(),
          };
          await AsyncStorage.setItem(MUTUAL_MATCHES_CACHE_KEY, JSON.stringify(cacheData));
        } catch (e) {
          console.log('Cache write error:', e);
        }
      } catch (error: any) {
        console.error('Error loading mutual matches:', error);
        // Only show error if we don't have cached data
        if (!hasCachedData) {
          Alert.alert('Error', error.message || 'Failed to load matches');
        }
      } finally {
        setLoadingMutualMatches(false);
      }
    } catch (error: any) {
      console.error('Error loading mutual matches:', error);
      if (!hasCachedData) {
        Alert.alert('Error', error.message || 'Failed to load matches');
      }
      setLoadingMutualMatches(false);
    }
  }, [loadConversationsAndEnhanceMatches]);

  // Reload matches when tab comes into focus (user switches to this tab)
  useFocusEffect(
    useCallback(() => {
      if (viewMode === 'discover') {
        // Show cache immediately, fetch fresh in background
        loadMatches(true, false);
      } else {
        // Show cache immediately, fetch fresh in background
        loadMutualMatches(true);
      }
    }, [loadMatches, loadMutualMatches, viewMode])
  );

  // Load mutual matches when switching to matches view - show cache immediately but always refresh
  useEffect(() => {
    if (viewMode === 'matches') {
      // Show cache immediately, but always fetch fresh data in background
      loadMutualMatches(true); // Use cache for immediate display, but always refresh in background
    }
  }, [viewMode, loadMutualMatches]);

  // Filter mutual matches based on search query (use enhanced matches for sorting)
  const filteredMutualMatches = useMemo(() => {
    const matchesToFilter = enhancedMatches.length > 0 ? enhancedMatches : mutualMatches;
    if (!searchQuery.trim()) {
      return matchesToFilter;
    }
    const query = searchQuery.toLowerCase().trim();
    return matchesToFilter.filter((match) => {
      const name = (match.name || '').toLowerCase();
      const username = (match.username || '').toLowerCase();
      return name.includes(query) || username.includes(query);
    });
  }, [enhancedMatches, mutualMatches, searchQuery]);

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
        // Refresh mutual matches cache when a new match is made
        // Clear cache to force refresh on next load
        try {
          await AsyncStorage.removeItem(MUTUAL_MATCHES_CACHE_KEY);
        } catch (e) {
          console.log('Error clearing mutual matches cache:', e);
        }
        // Refresh mutual matches if we're in matches view
        if (viewMode === 'matches') {
          loadMutualMatches(false); // Force refresh
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
  }, [currentIndex, matches, swiping, loadMatches, viewMode, loadMutualMatches]);

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
            <Text style={styles.headerTitle}>Matches</Text>
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

        {/* Search bar */}
        {mutualMatches.length > 0 && (
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search matches by name or username..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        )}

        {loadingMutualMatches && mutualMatches.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary.medium} />
            <Text style={styles.loadingText}>Loading matches...</Text>
          </View>
        ) : filteredMutualMatches.length === 0 ? (
          <View style={styles.emptyContainer}>
            {searchQuery.trim() ? (
              <>
                <Text style={styles.emptyTitle}>No matches found</Text>
                <Text style={styles.emptyText}>
                  No matches match "{searchQuery}"
                </Text>
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={() => setSearchQuery('')}
                >
                  <Text style={styles.refreshButtonText}>Clear Search</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
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
              </>
            )}
          </View>
        ) : (
          <ScrollView 
            style={styles.matchesListContainer}
            contentContainerStyle={styles.matchesListContent}
          >
            {loadingMutualMatches && mutualMatches.length > 0 && (
              <View style={styles.refreshingIndicator}>
                <ActivityIndicator size="small" color={theme.colors.primary.medium} />
                <Text style={styles.refreshingText}>Refreshing...</Text>
              </View>
            )}
            {filteredMutualMatches.map((match) => {
              const enhancedMatch = match as EnhancedMatch;
              return (
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
                    <View style={styles.matchAvatarContainer}>
                      <View style={styles.matchAvatar}>
                        {match.profilePicture ? (
                          <Text style={styles.matchAvatarText}>📷</Text>
                        ) : (
                          <Text style={styles.matchAvatarText}>
                            {(match.name || match.username || '?')[0].toUpperCase()}
                          </Text>
                        )}
                      </View>
                      {enhancedMatch.hasUnreadMessages && (
                        <View style={styles.unreadBadge} />
                      )}
                    </View>
                    <View style={styles.matchInfo}>
                      <View style={styles.matchNameRow}>
                        <Text style={styles.matchName}>
                          {match.name || match.username || 'Unknown User'}
                        </Text>
                        {enhancedMatch.hasUnreadMessages && (
                          <View style={styles.unreadIndicator}>
                            <Text style={styles.unreadIndicatorText}>●</Text>
                          </View>
                        )}
                      </View>
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
              );
            })}
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
          <ActivityIndicator size="large" color={theme.colors.primary.medium} />
          <Text style={styles.loadingText}>Loading matches...</Text>
        </View>
      </View>
    );
  }

  // Discover view - no matches at all
  if (!loading && matches.length === 0) {
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
            No matches available
          </Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No matches found</Text>
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

  // Discover view - no more matches (went through all of them)
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
    backgroundColor: theme.colors.secondary.light, //was #f5f5f5
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter',
    fontWeight: '400',
    color: theme.colors.primary.medium, //was #666
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: 'InterExtraBold',
    fontWeight: '800',
    color: theme.colors.primary.dark, //was #333
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter',
    fontWeight: '400',
    color: theme.colors.primary.medium, //was #666
    textAlign: 'center',
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: theme.colors.primary.medium,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  refreshButtonText: {
    color: theme.colors.secondary.light, //was #fff
    fontSize: 16,
    fontFamily: 'InterSemiBold',
    fontWeight: '600',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: theme.colors.primary.light, //was #fff
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.primary.medium, //was #E0E0E0
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: 'InterExtraBold',
    fontWeight: '800',
    color: theme.colors.primary.dark, //was #333
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'InterBold',
    fontWeight: '700',
    color: theme.colors.secondary.light, //was #666
    marginTop: 4,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: 'Inter',
    fontWeight: '400',
    color: theme.colors.primary.dark, //was #333
  },
  refreshingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  refreshingText: {
    fontSize: 14,
    fontFamily: 'Inter',
    fontWeight: '400',
    color: theme.colors.primary.medium, //was #666
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
    backgroundColor: theme.colors.secondary.light,
  },
  toggleButtonActive: {
    backgroundColor: theme.colors.primary.medium,
  },
  toggleButtonText: {
    fontSize: 14,
    fontFamily: 'InterSemiBold',
    fontWeight: '600',
    color: theme.colors.primary.medium, //was #666
  },
  toggleButtonTextActive: {
    color: theme.colors.secondary.light, //was #fff
  },
  matchesListContainer: {
    flex: 1,
  },
  matchesListContent: {
    padding: 20,
    paddingBottom: 40,
  },
  matchCard: {
    backgroundColor: theme.colors.neutrallight.white, //was #fff
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: theme.colors.primary.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3.84,
    elevation: 5,
  },
  matchCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  matchAvatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  matchAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchAvatarText: {
    fontSize: 24,
    fontFamily: 'InterExtraBold',
    color: theme.colors.neutrallight.white, //was #fff
    fontWeight: '800',
  },
  unreadBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.support.error, //was #FF3B30
    borderWidth: 2,
    borderColor: theme.colors.neutrallight.white, //was #fff
  },
  matchInfo: {
    flex: 1,
  },
  matchNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  matchName: {
    fontSize: 18,
    fontFamily: 'InterExtraBold',
    fontWeight: '800',
    color: theme.colors.primary.dark, //was #333
  },
  unreadIndicator: {
    marginLeft: 8,
  },
  unreadIndicatorText: {
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '400',
    color: theme.colors.support.error, //was #FF3B30
  },
  matchUsername: {
    fontSize: 14,
    fontFamily: 'Inter',
    fontWeight: '400',
    color: theme.colors.primary.medium, //was #666
    marginBottom: 4,
  },
  matchDate: {
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '400',
    color: theme.colors.primary.medium, //was #999
  },
  arrowText: {
    fontSize: 20,
    fontFamily: 'InterSemiBold',
    color: theme.colors.primary.medium,
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
    shadowColor: theme.colors.primary.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  passButton: {
    backgroundColor: theme.colors.support.error, //was #F44336
  },
  likeButton: {
    backgroundColor: theme.colors.primary.medium,
  },
  actionButtonText: {
    fontSize: 28,
    fontFamily: 'InterSemiBold',
    fontWeight: '600',
    color: theme.colors.secondary.light, //was #fff
  },
});

