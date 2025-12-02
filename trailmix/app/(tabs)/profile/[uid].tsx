import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams, Redirect } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { getUserProfile, UserProfile } from '@/src/lib/userService';
import { auth } from '@/src/lib/firebase';
import { pushRoute } from '@/src/lib/navigationStack';
import { normalizeProfilePictureUrl } from '@/src/utils/imageUpload';

import { LinearGradient } from "expo-linear-gradient";
import { theme } from "@/app/theme";

export default function ViewProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profilePictureUri, setProfilePictureUri] = useState<string | null>(null);

  // If viewing own profile via [uid] route, redirect to index
  const currentUserUid = auth.currentUser?.uid;
  if (uid && currentUserUid && uid === currentUserUid) {
    return <Redirect href="/(tabs)/profile" />;
  }

  const handleBack = () => {
    // Navigate back to previous screen
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/profile');
    }
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
      // Normalize profile picture URL to use current API base URL
      setProfilePictureUri(normalizeProfilePictureUrl(userProfile.profilePicture));
    } catch (error: any) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', error.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = () => {
    // Store current route before navigating to messages
    const currentRoute = `/(tabs)/profile/${uid}`;
    pushRoute(currentRoute);
    router.push(`/(tabs)/message/${uid}`);
  };

  const isOwnProfile = auth.currentUser?.uid === uid;

  if (loading) {
    return (
      <LinearGradient
        colors={theme.colors.gradient.lightgreen}
        style={styles.gradientContainer}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Profile</Text>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.support.success} />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        </View>
      </LinearGradient>
    );
  }

  if (!profile) {
    return (
      <LinearGradient
        colors={theme.colors.gradient.lightgreen}
        style={styles.gradientContainer}
      >
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
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
        colors={theme.colors.gradient.lightgreen}
        style={styles.gradientContainer}
      >
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              {profilePictureUri ? (
                <Image
                  source={{ uri: profilePictureUri }}
                  style={styles.avatarImage}
                  onError={(error) => {
                    console.error('Error loading profile picture:', error.nativeEvent.error);
                    console.error('Failed URL:', profilePictureUri);
                    setProfilePictureUri(null); // Fall back to placeholder
                  }}
                  onLoad={() => {
                    console.log('Profile picture loaded successfully:', profilePictureUri);
                  }}
                />
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  container: {
    // flex: 1,
    // backgroundColor: theme.colors.primary.light, //was #f5f5f5
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    backgroundColor: theme.colors.primary.light, //was #fff
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.primary.medium, //was #E0E0E0
  },
  backButton: {
    padding: 8,
    minWidth: 60,
    minHeight: 44,
  },
  backButtonText: {
    fontSize: 16,
    color: theme.colors.secondary.light, //was #4CAF50
    fontWeight: '600',
    fontFamily: 'InterSemiBold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'InterBold',
    color: theme.colors.primary.dark, //was #333
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
    fontWeight: '400',
    fontFamily: 'Inter',
    color: theme.colors.primary.medium, //was #666
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'Inter',
    color: theme.colors.primary.medium, //was #666
  },
  content: {
    padding: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.primary.medium, //was #E0E0E0
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.support.success, //was #4CAF50
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarText: {
    fontSize: 40,
    color: theme.colors.secondary.light, //was #fff
    fontWeight: '700',
    fontFamily: 'InterBold',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'InterBold',
    color: theme.colors.primary.dark, //was #333
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'Inter',
    color: theme.colors.primary.medium, //was #666
    marginBottom: 16,
  },
  messageButton: {
    backgroundColor: theme.colors.support.success, //was #4CAF50
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  messageButtonText: {
    color: theme.colors.secondary.light, //was #fff
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'InterSemiBold',
  },
  section: {
    marginBottom: 24,
    backgroundColor: theme.colors.secondary.light, //was #fff
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'InterBold',
    color: theme.colors.primary.dark, //was #333
    marginBottom: 12,
  },
  sectionContent: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'Inter',
    color: theme.colors.primary.medium, //was #666
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
    borderColor: theme.colors.support.success,
    borderWidth: 1,
  },
  interestText: {
    fontSize: 14,
    color: theme.colors.support.success, //was #4CAF50
    fontWeight: '500',
    fontFamily: 'Inter',
  },
});

