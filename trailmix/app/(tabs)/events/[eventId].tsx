import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { listEvents, EventDetails, removeAttendee } from '@/src/api/events';
import { getUserProfile, UserProfile } from '@/src/lib/userService';
import { auth } from '@/src/lib/firebase';

interface AttendeeProfile {
  uid: string;
  profile: UserProfile | null;
}

export default function EventAttendeesScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [attendees, setAttendees] = useState<AttendeeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingAttendee, setRemovingAttendee] = useState<string | null>(null);

  const handleBack = () => {
    // Navigate back to previous screen
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/events');
    }
  };

  useEffect(() => {
    loadEventAndAttendees();
  }, [eventId]);

  const loadEventAndAttendees = async () => {
    try {
      setLoading(true);
      // Load all events to find the one we need
      const events = await listEvents(100);
      const foundEvent = events.find((e) => e.event_id === eventId);
      
      if (!foundEvent) {
        Alert.alert('Error', 'Event not found');
        handleBack();
        return;
      }

      setEvent(foundEvent);

      // Load profiles for all attendees
      const attendeeProfiles = await Promise.all(
        (foundEvent.attendees || []).map(async (uid) => {
          try {
            const profile = await getUserProfile(uid);
            return { uid, profile };
          } catch (error) {
            console.error(`Error loading profile for ${uid}:`, error);
            return { uid, profile: null };
          }
        })
      );

      setAttendees(attendeeProfiles);
    } catch (error: any) {
      console.error('Error loading event:', error);
      Alert.alert('Error', error.message || 'Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = (uid: string) => {
    router.push(`/(tabs)/profile/${uid}`);
  };

  const handleRemoveAttendee = async (attendeeUid: string, attendeeName: string) => {
    if (!event) return;
    
    Alert.alert(
      "Remove Attendee",
      `Are you sure you want to remove ${attendeeName} from this event?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              setRemovingAttendee(attendeeUid);
              await removeAttendee(event.event_id, attendeeUid);
              // Reload the event and attendees
              await loadEventAndAttendees();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove attendee');
            } finally {
              setRemovingAttendee(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Attendees</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading attendees...</Text>
        </View>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Attendees</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Event not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{event.title}</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.subheader}>
        <Text style={styles.subheaderText}>
          {attendees.length} {attendees.length === 1 ? 'attendee' : 'attendees'}
        </Text>
      </View>

      {attendees.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No attendees yet</Text>
        </View>
      ) : (
        <FlatList
          data={attendees}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const profile = item.profile;
            const currentUserUid = auth.currentUser?.uid || "";
            const isOrganizer = event && currentUserUid === event.organizer_uid;
            const isCurrentUser = currentUserUid === item.uid;
            const isRemoving = removingAttendee === item.uid;
            
            // Handle unknown users (profile not found)
            if (!profile) {
              const displayName = 'Unknown User';
              return (
                <View style={styles.attendeeCard}>
                  <TouchableOpacity
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                    onPress={() => handleViewProfile(item.uid)}
                  >
                    <View style={styles.attendeeAvatar}>
                      <Text style={styles.attendeeAvatarText}>?</Text>
                    </View>
                    <View style={styles.attendeeInfo}>
                      <Text style={styles.attendeeName}>{displayName}</Text>
                      <Text style={styles.attendeeUsername}>ID: {item.uid.substring(0, 8)}...</Text>
                    </View>
                    <Text style={styles.arrowText}>→</Text>
                  </TouchableOpacity>
                  {isOrganizer && !isCurrentUser && (
                    <TouchableOpacity
                      onPress={() => handleRemoveAttendee(item.uid, displayName)}
                      disabled={isRemoving}
                      style={[styles.removeButton, isRemoving && styles.removeButtonDisabled]}
                    >
                      {isRemoving ? (
                        <ActivityIndicator size="small" color="#b00020" />
                      ) : (
                        <Text style={styles.removeButtonText}>Remove</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            }

            const displayName = profile.name || profile.username || 'Unknown User';
            const username = profile.username || 'user';

            return (
              <View style={styles.attendeeCard}>
                <TouchableOpacity
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                  onPress={() => handleViewProfile(item.uid)}
                >
                  <View style={styles.attendeeAvatar}>
                    {profile.profilePicture ? (
                      <Text style={styles.attendeeAvatarText}>📷</Text>
                    ) : (
                      <Text style={styles.attendeeAvatarText}>
                        {(displayName)[0].toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.attendeeInfo}>
                    <Text style={styles.attendeeName}>
                      {displayName}
                    </Text>
                    <Text style={styles.attendeeUsername}>
                      @{username}
                    </Text>
                    {profile.bio && (
                      <Text style={styles.attendeeBio} numberOfLines={2}>
                        {profile.bio}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.arrowText}>→</Text>
                </TouchableOpacity>
                {isOrganizer && !isCurrentUser && (
                  <TouchableOpacity
                    onPress={() => handleRemoveAttendee(item.uid, displayName)}
                    disabled={isRemoving}
                    style={[styles.removeButton, isRemoving && styles.removeButtonDisabled]}
                  >
                    {isRemoving ? (
                      <ActivityIndicator size="small" color="#b00020" />
                    ) : (
                      <Text style={styles.removeButtonText}>Remove</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
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
  subheader: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  subheaderText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
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
  listContent: {
    padding: 16,
  },
  attendeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    justifyContent: 'space-between',
  },
  attendeeAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  attendeeAvatarText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  attendeeInfo: {
    flex: 1,
  },
  attendeeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  attendeeUsername: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  attendeeBio: {
    fontSize: 12,
    color: '#999',
  },
  arrowText: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 8,
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ffebee',
    borderRadius: 6,
    marginLeft: 8,
  },
  removeButtonDisabled: {
    opacity: 0.5,
  },
  removeButtonText: {
    color: '#b00020',
    fontSize: 12,
    fontWeight: '600',
  },
});

