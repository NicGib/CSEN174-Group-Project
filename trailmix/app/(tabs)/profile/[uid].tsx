import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { getUserProfile, UserProfile } from '@/src/lib/userService';
import { auth } from '@/src/lib/firebase';

export default function ViewProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const handleBack = () => {
    // Navigate directly to match tab using the exact screen name from _layout.tsx
    navigation.navigate('match/index' as never);
  };

  useEffect(() => {
    loadProfile();
  }, [uid]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      if (!uid) {
        Alert.alert('Error', 'User ID is required');
        handleBack();
        return;
      }

      const userProfile = await getUserProfile(uid);
      if (!userProfile) {
        Alert.alert('Error', 'Profile not found');
        handleBack();
        return;
      }

      setProfile(userProfile);
    } catch (error: any) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', error.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = () => {
    router.push(`/(tabs)/message/${uid}`);
  };

  const isOwnProfile = auth.currentUser?.uid === uid;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Profile not found</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            {profile.profilePicture ? (
              <Text style={styles.avatarText}>📷</Text>
            ) : (
              <Text style={styles.avatarText}>
                {(profile.name || profile.username || '?')[0].toUpperCase()}
              </Text>
            )}
          </View>
          <Text style={styles.name}>{profile.name || profile.username || 'Unknown User'}</Text>
          <Text style={styles.username}>@{profile.username || 'user'}</Text>
          {!isOwnProfile && (
            <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
              <Text style={styles.messageButtonText}>Message</Text>
            </TouchableOpacity>
          )}
        </View>

        {profile.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bio</Text>
            <Text style={styles.sectionContent}>{profile.bio}</Text>
          </View>
        )}

        {profile.profileDescription && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.sectionContent}>{profile.profileDescription}</Text>
          </View>
        )}

        {profile.hikingLevel && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hiking Level</Text>
            <Text style={styles.sectionContent}>
              {profile.hikingLevel.charAt(0).toUpperCase() + profile.hikingLevel.slice(1)}
            </Text>
          </View>
        )}

        {profile.interests && profile.interests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interests</Text>
            <View style={styles.interestsContainer}>
              {profile.interests.map((interest, index) => (
                <View key={index} style={styles.interestTag}>
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {profile.gender && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gender</Text>
            <Text style={styles.sectionContent}>{profile.gender}</Text>
          </View>
        )}

        {profile.totalHikes !== undefined && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Total Hikes</Text>
            <Text style={styles.sectionContent}>{profile.totalHikes}</Text>
          </View>
        )}

        {profile.totalDistance !== undefined && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Total Distance</Text>
            <Text style={styles.sectionContent}>
              {profile.totalDistance.toFixed(1)} miles
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 60,
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
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    padding: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 40,
    color: '#fff',
    fontWeight: 'bold',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  messageButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  messageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  sectionContent: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  interestText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
});

