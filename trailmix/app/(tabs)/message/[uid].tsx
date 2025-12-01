import React, { useState, useEffect, useRef } from 'react';
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
  ScrollView,
  FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams, useSegments } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { getUserProfile, UserProfile } from '@/src/lib/userService';
import { popRoute } from '@/src/lib/navigationStack';
import { useAuth } from '@/hooks/use-auth';
import {
  sendMessage,
  getConversationMessages,
  MessagingWebSocket,
  Message,
} from '@/src/lib/messagingService';

import { theme } from "@/app/theme";

export default function MessageScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const segments = useSegments();
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const wsRef = useRef<MessagingWebSocket | null>(null);
  const flatListRef = useRef<FlatList>(null);

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

  const handleNewMessage = (newMessage: Message) => {
    // Only add message if it's for this conversation
    if (
      (newMessage.sender_uid === uid && newMessage.receiver_uid === user?.uid) ||
      (newMessage.sender_uid === user?.uid && newMessage.receiver_uid === uid)
    ) {
      setMessages((prev) => {
        // Check if message already exists (avoid duplicates)
        if (prev.some((m) => m.id === newMessage.id)) {
          return prev;
        }
        return [...prev, newMessage];
      });
      
      // Scroll to bottom when new message arrives
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  useEffect(() => {
    loadProfile();
    loadMessages();
    
    // Set up WebSocket connection
    if (user?.uid) {
      wsRef.current = new MessagingWebSocket(user.uid, handleNewMessage);
      wsRef.current.connect();
    }
    
    return () => {
      // Cleanup WebSocket on unmount
      if (wsRef.current) {
        wsRef.current.disconnect();
      }
    };
  }, [uid, user?.uid]);

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

  const loadMessages = async () => {
    if (!user?.uid || !uid) return;
    
    try {
      const conversationMessages = await getConversationMessages(user.uid, uid);
      setMessages(conversationMessages);
      
      // Scroll to bottom after loading
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error: any) {
      console.error('Error loading messages:', error);
      // Don't show alert for initial load errors
    }
  };

  const handleViewProfile = () => {
    router.push(`/(tabs)/profile/${uid}`);
  };

  const handleSend = async () => {
    if (!message.trim() || !user?.uid || sending) return;
    
    const messageContent = message.trim();
    setMessage('');
    setSending(true);
    
    try {
      const sentMessage = await sendMessage(user.uid, uid, messageContent);
      
      // Add message to local state immediately
      setMessages((prev) => [...prev, sentMessage]);
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert('Error', error.message || 'Failed to send message');
      setMessage(messageContent); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.sender_uid === user?.uid;
    
    return (
      <View
        style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessage : styles.otherMessage,
        ]}
      >
        <Text style={isMyMessage ? styles.myMessageText : styles.otherMessageText}>
          {item.content}
        </Text>
        <Text
          style={[
            styles.messageTime,
            isMyMessage ? styles.myMessageTime : styles.otherMessageTime,
          ]}
        >
          {new Date(item.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    );
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
          <ActivityIndicator size="large" color={theme.colors.support.success} />
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
        {messages.length === 0 ? (
          <View style={styles.emptyMessagesContainer}>
            <Text style={styles.emptyMessagesText}>
              No messages yet. Start a conversation!
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.messagesList}
            inverted={false}
          />
        )}
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
          style={[styles.sendButton, (!message.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!message.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.secondary.light, //was #F5F5F5
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
    color: theme.colors.support.success, //was #4CAF50
    fontWeight: '600',
    fontFamily: 'InterSemiBold',
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
    backgroundColor: theme.colors.support.success, //was #4CAF50
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    color: theme.colors.secondary.light, //was #fff
    fontWeight: '700',
    fontFamily: 'InterBold',
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'InterBold',
    color: theme.colors.primary.dark, //was #333
  },
  username: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'Inter',
    color: theme.colors.primary.medium, //was #666
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
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 18,
    marginBottom: 8,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.support.success, //was #4CAF50
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.secondary.light, //was #E0E0E0
    borderBottomLeftRadius: 4,
  },
  myMessageText: {
    color: theme.colors.secondary.light, //was #fff
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'Inter',
  },
  otherMessageText: {
    color: theme.colors.primary.dark, //was #333
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'Inter',
  },
  messageTime: {
    fontSize: 11,
    fontWeight: '400',
    fontFamily: 'Inter',
    marginTop: 4,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: theme.colors.primary.medium, //was #666
    textAlign: 'left',
  },
  emptyMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyMessagesText: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'Inter',
    color: theme.colors.primary.medium, //was #999
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: theme.colors.secondary.light, //was #fff
    borderTopWidth: 1,
    borderTopColor: theme.colors.secondary.dark, //was #E0E0E0
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.secondary.dark, //was #E0E0E0
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    marginRight: 8,
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'Inter',
  },
  sendButton: {
    backgroundColor: theme.colors.support.success, //was #4CAF50
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.neutraldark.medium, // was #ccc
  },
  sendButtonText: {
    color: theme.colors.secondary.light, //was #fff
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'InterSemiBold',
  },
});

