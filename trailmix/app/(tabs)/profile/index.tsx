import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { auth } from '@/src/lib/firebase';
import { getUserProfile, updateUserProfile, UserProfile } from '@/src/lib/userService';
import { Timestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pickImageFromLibrary, takePhoto, uploadProfilePicture } from '@/src/utils/imageUpload';

const HIKING_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'] as const;

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [bio, setBio] = useState('');
  const [profileDescription, setProfileDescription] = useState('');
  const [gender, setGender] = useState<string>('');
  const [hikingLevel, setHikingLevel] = useState<string>('');
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [birthday, setBirthday] = useState<string>('');
  const [profilePictureUri, setProfilePictureUri] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'You must be logged in to view your profile');
        return;
      }

      const userProfile = await getUserProfile(user.uid);
      if (userProfile) {
        setProfile(userProfile);
        setName(userProfile.name || '');
        setUsername(userProfile.username || '');
        setPreferredName(userProfile.preferredName || '');
        setBio(userProfile.bio || '');
        setProfileDescription(userProfile.profileDescription || '');
        setGender(userProfile.gender || '');
        setHikingLevel(userProfile.hikingLevel || '');
        setInterests(userProfile.interests || []);
        setProfilePictureUri(userProfile.profilePicture || null);
        
        // Handle birthday - convert from Timestamp to date string if needed
        if (userProfile.birthday) {
          if (userProfile.birthday instanceof Timestamp) {
            const date = userProfile.birthday.toDate();
            setBirthday(date.toISOString().split('T')[0]);
          } else if (userProfile.birthday instanceof Date) {
            setBirthday(userProfile.birthday.toISOString().split('T')[0]);
          }
        }
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', error.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleAddInterest = () => {
    const trimmed = newInterest.trim();
    if (trimmed && !interests.includes(trimmed)) {
      setInterests([...interests, trimmed]);
      setNewInterest('');
    }
  };

  const handleRemoveInterest = (interest: string) => {
    setInterests(interests.filter(i => i !== interest));
  };

  const handleSelectPhoto = async () => {
    Alert.alert(
      'Select Photo',
      'Choose an option',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Choose from Library', onPress: handlePickFromLibrary },
      ]
    );
  };

  const handleTakePhoto = async () => {
    try {
      const uri = await takePhoto();
      if (uri) {
        setProfilePictureUri(uri);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to take photo');
    }
  };

  const handlePickFromLibrary = async () => {
    try {
      const uri = await pickImageFromLibrary();
      if (uri) {
        setProfilePictureUri(uri);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to pick image from library');
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'You must be logged in to save your profile');
        return;
      }

      // Validate required fields
      if (!name.trim()) {
        Alert.alert('Validation Error', 'Name is required');
        return;
      }
      if (!username.trim()) {
        Alert.alert('Validation Error', 'Username is required');
        return;
      }

      // Upload profile picture if a new one was selected
      let profilePictureUrl = profile?.profilePicture;
      if (profilePictureUri && profilePictureUri !== profile?.profilePicture) {
        try {
          setUploadingImage(true);
          profilePictureUrl = await uploadProfilePicture(profilePictureUri, user.uid);
        } catch (error: any) {
          Alert.alert('Error', error.message || 'Failed to upload profile picture');
          setUploadingImage(false);
          return;
        } finally {
          setUploadingImage(false);
        }
      }

      // Prepare updates
      const updates: Partial<UserProfile> = {
        name: name.trim(),
        username: username.trim(),
        preferredName: preferredName.trim() || undefined,
        bio: bio.trim() || undefined,
        profileDescription: profileDescription.trim() || undefined,
        gender: gender || undefined,
        hikingLevel: hikingLevel as any || undefined,
        interests: interests.length > 0 ? interests : undefined,
        profilePicture: profilePictureUrl || undefined,
      };

      // Handle birthday
      if (birthday) {
        const date = new Date(birthday);
        if (!isNaN(date.getTime())) {
          updates.birthday = date;
        }
      }

      // Check if interests changed
      const interestsChanged = updates.interests !== undefined;
      
      await updateUserProfile(user.uid, updates);
      
      // Clear matches cache if interests changed
      if (interestsChanged) {
        try {
          await AsyncStorage.removeItem('potential_matches_cache');
          console.log('Matches cache cleared due to interests update');
        } catch (e) {
          console.warn('Failed to clear matches cache:', e);
        }
      }
      
      Alert.alert('Success', 'Profile updated successfully!');
      await loadProfile(); // Reload to get updated data
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <Text style={styles.headerSubtitle}>Update your personal information</Text>
      </View>

      <View style={styles.form}>
        {/* Profile Picture */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Profile Picture</Text>
          <View style={styles.profilePictureContainer}>
            <View style={styles.profilePictureWrapper}>
              {profilePictureUri ? (
                <Image 
                  source={{ uri: profilePictureUri }} 
                  style={styles.profilePicture}
                  onError={(error) => {
                    console.error('Error loading profile picture:', error.nativeEvent.error);
                    console.error('Failed URL:', profilePictureUri);
                  }}
                  onLoad={() => {
                    console.log('Profile picture loaded successfully:', profilePictureUri);
                  }}
                />
              ) : (
                <View style={styles.profilePicturePlaceholder}>
                  <Text style={styles.profilePicturePlaceholderText}>
                    {(name || username || '?')[0].toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.profilePictureButtons}>
              <TouchableOpacity
                style={styles.profilePictureButton}
                onPress={handleSelectPhoto}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <ActivityIndicator size="small" color="#4CAF50" />
                ) : (
                  <Text style={styles.profilePictureButtonText}>Change Photo</Text>
                )}
              </TouchableOpacity>
              {profilePictureUri && (
                <TouchableOpacity
                  style={[styles.profilePictureButton, styles.removePhotoButton]}
                  onPress={() => setProfilePictureUri(null)}
                  disabled={uploadingImage}
                >
                  <Text style={[styles.profilePictureButtonText, styles.removePhotoButtonText]}>
                    Remove
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Name */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your full name"
            placeholderTextColor="#999"
          />
        </View>

        {/* Username */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Username *</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Enter your username"
            placeholderTextColor="#999"
            autoCapitalize="none"
          />
        </View>

        {/* Preferred Name */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Preferred Name</Text>
          <TextInput
            style={styles.input}
            value={preferredName}
            onChangeText={setPreferredName}
            placeholder="What should we call you?"
            placeholderTextColor="#999"
          />
        </View>

        {/* Email (read-only) */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, styles.readOnlyInput]}
            value={profile?.email || ''}
            editable={false}
            placeholderTextColor="#999"
          />
          <Text style={styles.helperText}>Email cannot be changed</Text>
        </View>

        {/* Bio */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about yourself..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Profile Description */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Profile Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={profileDescription}
            onChangeText={setProfileDescription}
            placeholder="Describe your hiking interests and experience..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Gender */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Gender</Text>
          <View style={styles.optionsContainer}>
            {GENDER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionButton,
                  gender === option && styles.optionButtonSelected,
                ]}
                onPress={() => setGender(gender === option ? '' : option)}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    gender === option && styles.optionButtonTextSelected,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Hiking Level */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Hiking Level</Text>
          <View style={styles.optionsContainer}>
            {HIKING_LEVELS.map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.optionButton,
                  hikingLevel === level && styles.optionButtonSelected,
                ]}
                onPress={() => setHikingLevel(hikingLevel === level ? '' : level)}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    hikingLevel === level && styles.optionButtonTextSelected,
                  ]}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Birthday */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Birthday</Text>
          <TextInput
            style={styles.input}
            value={birthday}
            onChangeText={setBirthday}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#999"
          />
          {Platform.OS === 'ios' && (
            <Text style={styles.helperText}>Use date picker on iOS</Text>
          )}
        </View>

        {/* Interests */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Interests</Text>
          <View style={styles.interestsContainer}>
            {interests.map((interest, index) => (
              <View key={index} style={styles.interestTag}>
                <Text style={styles.interestTagText}>{interest}</Text>
                <TouchableOpacity
                  onPress={() => handleRemoveInterest(interest)}
                  style={styles.interestRemoveButton}
                >
                  <Text style={styles.interestRemoveText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
          <View style={styles.addInterestContainer}>
            <TextInput
              style={[styles.input, styles.addInterestInput]}
              value={newInterest}
              onChangeText={setNewInterest}
              placeholder="Add an interest..."
              placeholderTextColor="#999"
              onSubmitEditing={handleAddInterest}
            />
            <TouchableOpacity
              style={styles.addInterestButton}
              onPress={handleAddInterest}
            >
              <Text style={styles.addInterestButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats (read-only) */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Statistics</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile?.totalHikes || 0}</Text>
              <Text style={styles.statLabel}>Total Hikes</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {profile?.totalDistance ? `${profile.totalDistance.toFixed(1)} km` : '0 km'}
              </Text>
              <Text style={styles.statLabel}>Total Distance</Text>
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  contentContainer: {
    paddingBottom: 40,
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
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  form: {
    padding: 20,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 15,
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#333',
  },
  readOnlyInput: {
    backgroundColor: '#F5F5F5',
    color: '#666',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 15,
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  optionButtonSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  optionButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  optionButtonTextSelected: {
    color: '#fff',
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  interestTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  interestTagText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '500',
  },
  interestRemoveButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1976D2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  interestRemoveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 14,
  },
  addInterestContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  addInterestInput: {
    flex: 1,
  },
  addInterestButton: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    justifyContent: 'center',
  },
  addInterestButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  profilePictureContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  profilePictureWrapper: {
    marginBottom: 16,
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E0E0E0',
  },
  profilePicturePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePicturePlaceholderText: {
    fontSize: 48,
    color: '#fff',
    fontWeight: 'bold',
  },
  profilePictureButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  profilePictureButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    minWidth: 120,
    alignItems: 'center',
  },
  profilePictureButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  removePhotoButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  removePhotoButtonText: {
    color: '#666',
  },
});

