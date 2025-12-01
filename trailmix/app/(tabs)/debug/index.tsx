import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '@/src/lib/firebase';
import { getUserProfile, updateUserProfile, UserProfile, UserStatus } from '@/src/lib/userService';
import { endpoints } from '@/src/constants/api';
import { clearAllSavedMaps } from '@/src/lib/mapStorage';

import { LinearGradient } from "expo-linear-gradient";
import { theme } from "@/app/theme";

const CACHE_KEYS = {
  matches: 'potential_matches_cache',
  maps: '@trailmix_saved_maps',
  // Add other cache keys as needed
};

const USER_STATUSES: UserStatus[] = ['user', 'wayfarer', 'admin'];

const GOOGLE_MAPS_ENABLED_KEY = '@trailmix_google_maps_enabled';

export default function DebugScreen() {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentStatus, setCurrentStatus] = useState<UserStatus>('user');
  const [newStatus, setNewStatus] = useState<UserStatus>('user');
  const [googleMapsEnabled, setGoogleMapsEnabled] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        return;
      }

      const userProfile = await getUserProfile(user.uid);
      if (userProfile) {
        setProfile(userProfile);
        setCurrentStatus(userProfile.status || 'user');
        setNewStatus(userProfile.status || 'user');
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', error.message || 'Failed to load profile');
    }
  }, []);

  useEffect(() => {
    loadProfile();
    loadGoogleMapsSetting();
  }, [loadProfile]);

  const loadGoogleMapsSetting = async () => {
    try {
      const enabled = await AsyncStorage.getItem(GOOGLE_MAPS_ENABLED_KEY);
      setGoogleMapsEnabled(enabled === 'true');
    } catch (error) {
      console.warn('Failed to load Google Maps setting:', error);
    }
  };

  const toggleGoogleMaps = async () => {
    try {
      const newValue = !googleMapsEnabled;
      await AsyncStorage.setItem(GOOGLE_MAPS_ENABLED_KEY, String(newValue));
      setGoogleMapsEnabled(newValue);
      Alert.alert('Success', `Google Maps ${newValue ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to toggle Google Maps');
    }
  };

  const clearAllCache = async () => {
    try {
      setLoading(true);
      
      // Clear all known cache keys
      const keysToClear = Object.values(CACHE_KEYS);
      for (const key of keysToClear) {
        try {
          await AsyncStorage.removeItem(key);
        } catch (e) {
          console.warn(`Failed to clear ${key}:`, e);
        }
      }
      
      // Clear saved maps
      await clearAllSavedMaps();
      
      // Clear all AsyncStorage (nuclear option)
      // Uncomment if you want to clear everything:
      // await AsyncStorage.clear();
      
      Alert.alert('Success', 'All cache cleared successfully!');
    } catch (error: any) {
      console.error('Error clearing cache:', error);
      Alert.alert('Error', error.message || 'Failed to clear cache');
    } finally {
      setLoading(false);
    }
  };

  const clearMatchesCache = async () => {
    try {
      setLoading(true);
      await AsyncStorage.removeItem(CACHE_KEYS.matches);
      Alert.alert('Success', 'Matches cache cleared!');
    } catch (error: any) {
      console.error('Error clearing matches cache:', error);
      Alert.alert('Error', error.message || 'Failed to clear matches cache');
    } finally {
      setLoading(false);
    }
  };

  const clearMapsCache = async () => {
    try {
      setLoading(true);
      await clearAllSavedMaps();
      Alert.alert('Success', 'Saved maps cleared!');
    } catch (error: any) {
      console.error('Error clearing maps cache:', error);
      Alert.alert('Error', error.message || 'Failed to clear maps cache');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        return;
      }

      if (newStatus === currentStatus) {
        Alert.alert('Info', 'Status is already set to this value');
        return;
      }

      setLoading(true);

      // Update status via Firestore directly (for debug purposes)
      // Note: In production, you'd want proper authorization checks
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('@/src/lib/firebase');
      
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { status: newStatus });

      Alert.alert('Success', `Status updated to ${newStatus}!`);
      await loadProfile(); // Reload profile
    } catch (error: any) {
      console.error('Error updating status:', error);
      Alert.alert('Error', error.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const rebuildMatchingIndex = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${endpoints.matching}/rebuild-index`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to rebuild index: ${response.statusText}`);
      }

      const data = await response.json();
      Alert.alert('Success', data.message || 'Matching index rebuilt successfully!');
    } catch (error: any) {
      console.error('Error rebuilding index:', error);
      Alert.alert('Error', error.message || 'Failed to rebuild matching index');
    } finally {
      setLoading(false);
    }
  };

  const showCacheInfo = async () => {
    try {
      const matchesCache = await AsyncStorage.getItem(CACHE_KEYS.matches);
      const mapsCache = await AsyncStorage.getItem(CACHE_KEYS.maps);
      
      const info = {
        'Matches Cache': matchesCache ? 'Present' : 'Empty',
        'Maps Cache': mapsCache ? 'Present' : 'Empty',
      };

      Alert.alert('Cache Info', Object.entries(info).map(([k, v]) => `${k}: ${v}`).join('\n'));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to get cache info');
    }
  };

  return (
    <LinearGradient
      colors={theme.colors.gradient.lightgreen}
      style={styles.gradientContainer}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Debug Tools</Text>
          <Text style={styles.headerSubtitle}>Development utilities</Text>
        </View>

        {/* Cache Management Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cache Management</Text>
          
          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={clearAllCache}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Clear All Cache</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={clearMatchesCache}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Clear Matches Cache</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={clearMapsCache}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Clear Saved Maps</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.infoButton]}
            onPress={showCacheInfo}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Show Cache Info</Text>
          </TouchableOpacity>
        </View>

        {/* User Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Status</Text>
          
          <View style={styles.statusContainer}>
            <Text style={styles.label}>Current Status:</Text>
            <Text style={styles.currentStatus}>{currentStatus}</Text>
          </View>

          <Text style={styles.label}>Change Status To:</Text>
          <View style={styles.statusButtonsContainer}>
            {USER_STATUSES.map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusButton,
                  newStatus === status && styles.statusButtonSelected,
                ]}
                onPress={() => setNewStatus(status)}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    newStatus === status && styles.statusButtonTextSelected,
                  ]}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={updateStatus}
            disabled={loading || newStatus === currentStatus}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Update Status</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Server Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Server Actions</Text>
          
          <TouchableOpacity
            style={[styles.button, styles.warningButton]}
            onPress={rebuildMatchingIndex}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Rebuild Matching Index</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Feature Flags Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Feature Flags</Text>
          
          <View style={styles.toggleContainer}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Google Maps Place Details</Text>
              <Text style={styles.toggleDescription}>
                Enable Google Maps for place details and photos (100 requests/day limit)
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                googleMapsEnabled && styles.toggleButtonActive,
              ]}
              onPress={toggleGoogleMaps}
            >
              <Text style={[
                styles.toggleButtonText,
                googleMapsEnabled && styles.toggleButtonTextActive,
              ]}>
                {googleMapsEnabled ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* User Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Info</Text>
          {profile && (
            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>UID: {profile.uid}</Text>
              <Text style={styles.infoText}>Email: {profile.email}</Text>
              <Text style={styles.infoText}>Username: {profile.username}</Text>
              <Text style={styles.infoText}>Status: {profile.status || 'user'}</Text>
              <Text style={styles.infoText}>Interests: {profile.interests?.length || 0}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  container: {
    // flex: 1,
    // backgroundColor: theme.colors.primary.light, //was #F5F5F5
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: theme.colors.primary.light, //was #fff
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.primary.medium, //was #E0E0E0
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: 'InterExtraBold',
    fontWeight: '800',
    color: theme.colors.primary.dark, //was #333
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'InterBold',
    fontWeight: '700',
    color: theme.colors.secondary.light, //was #666
  },
  section: {
    padding: 20,
    marginTop: 20,
    backgroundColor: theme.colors.secondary.light, //was #fff
    marginHorizontal: 20,
    borderRadius: 10,
    shadowColor: theme.colors.primary.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'InterBold',
    fontWeight: '700',
    color: theme.colors.secondary.dark, //was #333
    marginBottom: 16,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    minHeight: 48,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary.medium, //was #4CAF50
  },
  secondaryButton: {
    backgroundColor: theme.colors.support.success, //was #2196F3
  },
  dangerButton: {
    backgroundColor: theme.colors.support.error, //was #F44336
  },
  warningButton: {
    backgroundColor: theme.colors.support.warning, //was #FF9800
  },
  infoButton: {
    backgroundColor: theme.colors.primary.light, //was 9E9E9E
  },
  buttonText: {
    color: theme.colors.secondary.light, //was #fff
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'InterSemiBold',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: theme.colors.neutrallight.white, //was #F5F5F5
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.neutrallight.lightgray,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'InterSemiBold',
    color: theme.colors.primary.dark, //was #333
    marginTop: 8,
    marginBottom: 8,
  },
  currentStatus: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'InterBold',
    color: theme.colors.support.success, //was #4CAF50
    textTransform: 'capitalize',
  },
  statusButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.neutrallight.lightgray, //was #E0E0E0
    backgroundColor: theme.colors.neutrallight.white, //was #fff
    alignItems: 'center',
  },
  statusButtonSelected: {
    backgroundColor: theme.colors.support.success, //was #4CAF50
    borderColor: theme.colors.support.success, //was #4CAF50
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: "InterSemiBold",
    color: theme.colors.primary.dark, //was #333
    textTransform: 'capitalize',
  },
  statusButtonTextSelected: {
    color: theme.colors.neutrallight.white, //was #fff
  },
  infoContainer: {
    backgroundColor: theme.colors.neutrallight.white, //was #F5F5F5
    padding: 12,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.secondary.medium, //was #666
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: theme.colors.neutrallight.white, //was #F5F5F5
    borderRadius: 8,
    marginBottom: 12,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: "InterSemiBold",
    color: theme.colors.primary.dark, //was #333
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 12,
    fontFamily: "Inter",
    fontWeight: "400",
    color: theme.colors.primary.medium, //was #666
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: theme.colors.neutrallight.lightgray, //was #E0E0E0
    borderWidth: 2,
    borderColor: theme.colors.neutrallight.gray, //was #BDBDBD
  },
  toggleButtonActive: {
    backgroundColor: theme.colors.support.success, //was #4CAF50
    borderColor: theme.colors.support.success, //was #4CAF50
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: "InterSemiBold",
    color: theme.colors.primary.medium, //was #666
  },
  toggleButtonTextActive: {
    color: theme.colors.neutrallight.white, //was #fff
  },
});

