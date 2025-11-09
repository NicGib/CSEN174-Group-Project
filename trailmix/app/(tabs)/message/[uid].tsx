import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, useSegments } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { getUserProfile, UserProfile } from '@/src/lib/userService';
import { popRoute } from '@/src/lib/navigationStack';

export default function MessageScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const segments = useSegments();
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const handleBack = () => {
    // Try to get the previous route from navigation stack
    const previousRoute = popRoute();
    
    if (previousRoute) {
      console.log('Navigating back to stored route:', previousRoute);
      router.replace(previousRoute as any);
    } else if (router.canGoBack()) {
      // Fallback to router's back navigation
      console.log('Using router.back()');
      router.back();
    } else {
      // Default fallback to match tab
      console.log('Defaulting to match tab');
      router.replace('/(tabs)/match');
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
    } catch (error: any) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', error.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = () => {
    router.push(`/(tabs)/profile/${uid}`);
  };

  const handleSend = () => {
    // TODO: Implement messaging functionality
    Alert.alert('Coming Soon', 'Messaging functionality will be available soon!');
    setMessage('');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Messages</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading...</Text>
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
          <Text style={styles.headerTitle}>Messages</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Profile not found</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.profileHeader}
          onPress={handleViewProfile}
          activeOpacity={0.7}
        >
          <View style={styles.avatar}>
            {profile.profilePicture ? (
              <Text style={styles.avatarText}>📷</Text>
            ) : (
              <Text style={styles.avatarText}>
                {(profile.name || profile.username || '?')[0].toUpperCase()}
              </Text>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name} numberOfLines={1}>
              {profile.name || profile.username || 'Unknown User'}
            </Text>
            <Text style={styles.username} numberOfLines={1}>
              @{profile.username || 'user'}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.messagesContainer}>
        <View style={styles.emptyMessagesContainer}>
          <Text style={styles.emptyMessagesText}>
            No messages yet. Start a conversation!
          </Text>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!message.trim()}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    minWidth: 60,
    minHeight: 44,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  username: {
    fontSize: 12,
    color: '#666',
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
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  emptyMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyMessagesText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    marginRight: 8,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

