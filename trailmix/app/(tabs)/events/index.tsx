import React from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, Modal, ActivityIndicator, RefreshControl, StyleSheet, ScrollView, Platform, Alert } from "react-native";
import { useRouter } from "expo-router";
import { listEvents, createEvent, joinEvent, leaveEvent, deleteEvent, EventDetails } from "../../../src/api/events";
import { auth } from "../../../src/lib/firebase";
import { AddressSearchBar } from "@/components/maps/AddressSearchBar";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import { PlaceDetails } from "@/src/lib/locationService";
import { getUserProfile, UserProfile } from "@/src/lib/userService";
import DateTimePicker from '@react-native-community/datetimepicker';

import { theme } from "@/app/theme";

export default function EventsScreen() {
  const router = useRouter();
  const [events, setEvents] = React.useState<EventDetails[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [showCreate, setShowCreate] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [selectedLocation, setSelectedLocation] = React.useState<{ latitude: number; longitude: number; address?: string; placeDetails?: PlaceDetails } | null>(null);
  const [eventDate, setEventDate] = React.useState<Date>(() => {
    const now = new Date();
    const future = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    future.setSeconds(0, 0); // Set seconds and milliseconds to 0
    return future;
  });
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [showTimePicker, setShowTimePicker] = React.useState(false);
  const [description, setDescription] = React.useState("");
  const [difficulty, setDifficulty] = React.useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [maxAttendees, setMaxAttendees] = React.useState("20");
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
  const [canCreateEvents, setCanCreateEvents] = React.useState(false);

  // Use location tracking for AddressSearchBar
  const { currentLocation } = useLocationTracking({
    autoStart: true,
    trackingOptions: {
      accuracy: 4,
      timeInterval: 10000,
      distanceInterval: 50,
    },
  });

  const load = React.useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await listEvents(50);
      setEvents(data);
    } catch (e: any) {
      setErr(e.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  // Load user profile and check permissions
  React.useEffect(() => {
    const checkPermissions = async () => {
      const user = auth.currentUser;
      if (user?.uid) {
        try {
          const profile = await getUserProfile(user.uid);
          setUserProfile(profile);
          // Check if user is wayfarer or admin
          const status = profile?.status || 'user';
          setCanCreateEvents(status === 'wayfarer' || status === 'admin');
        } catch (error) {
          console.error('Error loading user profile:', error);
          setCanCreateEvents(false);
        }
      } else {
        setCanCreateEvents(false);
      }
    };
    checkPermissions();
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const onCreate = async () => {
    if (!title.trim() || !location.trim() || !eventDate) {
      setErr("Title, location and date are required");
      return;
    }
    setErr(null);
    try {
      const user = auth.currentUser;
      // Format date as ISO string in UTC to avoid timezone issues
      // Use UTC methods directly to get the UTC representation of the selected date/time
      // Always set seconds to 00 (everything happens on the minute)
      const year = eventDate.getUTCFullYear();
      const month = String(eventDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(eventDate.getUTCDate()).padStart(2, '0');
      const hours = String(eventDate.getUTCHours()).padStart(2, '0');
      const minutes = String(eventDate.getUTCMinutes()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}T${hours}:${minutes}:00`;
      await createEvent({
        title: title.trim(),
        location: location.trim(),
        event_date: dateString,
        description: description,
        max_attendees: Number(maxAttendees) || 20,
        difficulty_level: difficulty,
        organizer_uid: user?.uid || "",
      });
      setShowCreate(false);
      setErr(null); // Clear errors on success
      setTitle("");
      setLocation("");
      setSelectedLocation(null);
      // Reset to 1 hour from now
      const now = new Date();
      const future = new Date(now.getTime() + 60 * 60 * 1000);
      future.setSeconds(0, 0); // Set seconds and milliseconds to 0
      setEventDate(future);
      setDescription("");
      setDifficulty("beginner");
      setMaxAttendees("20");
      await load();
    } catch (e: any) {
      setErr(e.message || "Failed to create event");
      // Keep modal open so user can see the error and fix it
    }
  };

  const formatDateTime = (date: Date): string => {
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      // No seconds displayed
    });
  };

  // Helper to check if a date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // Get minimum time for today (current time + 1 minute to ensure it's in the future)
  const getMinimumTime = (): Date => {
    const now = new Date();
    const minTime = new Date(now);
    minTime.setMinutes(now.getMinutes() + 1); // Add 1 minute buffer
    minTime.setSeconds(0, 0); // Set seconds and milliseconds to 0
    return minTime;
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type === 'dismissed') {
        return; // User cancelled
      }
    }
    if (selectedDate) {
      // Preserve the time when changing date
      const newDate = new Date(selectedDate);
      newDate.setHours(eventDate.getHours());
      newDate.setMinutes(eventDate.getMinutes());
      
      // Always set seconds to 0
      newDate.setSeconds(0, 0);
      
      // If the selected date is today and the time is in the past, set to minimum time
      if (isToday(newDate)) {
        const minTime = getMinimumTime();
        if (newDate < minTime) {
          newDate.setHours(minTime.getHours());
          newDate.setMinutes(minTime.getMinutes());
          newDate.setSeconds(0, 0);
        }
      }
      
      setEventDate(newDate);
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (event.type === 'dismissed') {
        return; // User cancelled
      }
    }
    if (selectedTime) {
      // Preserve the date when changing time
      const newDate = new Date(eventDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      newDate.setSeconds(0, 0); // Always set seconds and milliseconds to 0
      
      // If the date is today, ensure the time is in the future
      if (isToday(newDate)) {
        const minTime = getMinimumTime();
        if (newDate < minTime) {
          // Set to minimum time if selected time is in the past
          newDate.setHours(minTime.getHours());
          newDate.setMinutes(minTime.getMinutes());
          newDate.setSeconds(0, 0);
        }
      }
      
      setEventDate(newDate);
    }
  };

  const onJoin = async (eventId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("You must be signed in to join");
      await joinEvent(eventId, user.uid, user.displayName || user.email || "");
      await load();
    } catch (e: any) {
      setErr(e.message || "Failed to join event");
    }
  };

  const onLeave = async (eventId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("You must be signed in to leave");
      await leaveEvent(eventId, user.uid);
      await load();
    } catch (e: any) {
      setErr(e.message || "Failed to leave event");
    }
  };


  const onDeleteEvent = async (eventId: string) => {
    console.log("🗑️ [FRONTEND] onDeleteEvent called with eventId:", eventId);
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error("   ❌ No user found");
        throw new Error("You must be signed in");
      }
      
      console.log("   User UID:", user.uid);
      
      Alert.alert(
        "Delete Event",
        "Are you sure you want to delete this event? This action cannot be undone.",
        [
          { 
            text: "Cancel", 
            style: "cancel",
            onPress: () => {
              console.log("   User cancelled deletion");
            }
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              console.log("   User confirmed deletion, calling deleteEvent...");
              try {
                await deleteEvent(eventId, user.uid);
                console.log("   ✅ Event deleted successfully, reloading...");
                await load();
              } catch (e: any) {
                console.error("   ❌ Error deleting event:", e);
                setErr(e.message || "Failed to delete event");
              }
            },
          },
        ]
      );
    } catch (e: any) {
      console.error("   ❌ Error in onDeleteEvent:", e);
      setErr(e.message || "Failed to delete event");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.secondary.light }}>
      <View style={{ 
        flexDirection: "row", 
        justifyContent: "space-between", 
        alignItems: "center",
        padding: 20,
        paddingTop: 60,
        backgroundColor: theme.colors.primary.light,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.primary.medium,
      }}>
        <Text style={{ fontSize: 20, fontFamily: "InterBold", fontWeight: "700", color: theme.colors.primary.dark }}>Events</Text>
        {canCreateEvents && (
          <TouchableOpacity 
            onPress={() => {
              if (!canCreateEvents) {
                Alert.alert('Permission Denied', 'Only wayfarers and admins can create events.');
                return;
              }
              // Reset event date to 1 hour from now when opening modal
              const now = new Date();
              const future = new Date(now.getTime() + 60 * 60 * 1000);
              future.setSeconds(0, 0); // Set seconds and milliseconds to 0
              setEventDate(future);
              setShowCreate(true);
            }} 
            style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: theme.colors.support.success, borderRadius: 8 }}
          >
            <Text style={{ color: theme.colors.neutrallight.white, fontFamily: "InterSemiBold", fontWeight: "600" }}>Create</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={{ flex: 1, padding: 16, gap: 12 }}>

      {err ? <Text style={{ color: theme.colors.support.error }}>{err}</Text> : null}

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.event_id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => {
            const uid = auth.currentUser?.uid || "";
            const isJoined = !!uid && Array.isArray(item.attendees) && item.attendees.includes(uid);
            const isOrganizer = uid === item.organizer_uid;
            
            return (
              <TouchableOpacity
                onPress={() => router.push(`/(tabs)/events/${item.event_id}`)}
                style={{ padding: 12, borderWidth: 1, borderColor: theme.colors.secondary.dark, borderRadius: 10, marginBottom: 10, backgroundColor: theme.colors.secondary.light }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontFamily: "InterBold", fontWeight: "700" }}>{item.title}</Text>
                    <Text style={{ marginTop: 4 }}>{item.location} • {new Date(item.event_date).toLocaleString()}</Text>
                    <Text numberOfLines={3} style={{ marginTop: 4, color: theme.colors.secondary.medium }}>{item.description}</Text>
                    <Text style={{ marginTop: 4, color: theme.colors.secondary.dark }}>Difficulty: {item.difficulty_level} • {item.attendees?.length || 0}/{item.max_attendees} going</Text>
                    {isOrganizer && (
                      <Text style={{ marginTop: 4, color: theme.colors.support.success, fontWeight: "600", fontFamily: "InterSemiBold", fontSize: 12 }}>You are the organizer</Text>
                    )}
                  </View>
                  {isOrganizer && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        onDeleteEvent(item.event_id);
                      }}
                      style={{ padding: 8, marginLeft: 8 }}
                    >
                      <Text style={{ color: theme.colors.support.error, fontSize: 20 }}>🗑️</Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                  {isJoined ? (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        onLeave(item.event_id);
                      }}
                      style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: theme.colors.support.error, borderRadius: 8 }}
                    >
                      <Text style={{ color: theme.colors.neutrallight.white, fontFamily: "InterSemiBold", fontWeight: "600" }}>Leave</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        onJoin(item.event_id);
                      }}
                      style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: theme.colors.primary.light, borderRadius: 8 }}
                    >
                      <Text style={{ color: theme.colors.neutrallight.white, fontFamily: "InterSemiBold", fontWeight: "600" }}>Join</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
      </View>

      <Modal visible={showCreate} animationType="slide" onRequestClose={() => {
        setShowCreate(false);
        setErr(null); // Clear errors when closing modal
      }}>
        <ScrollView 
          style={styles.modalContainer}
          contentContainerStyle={styles.modalContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.modalTitle}>Create Event</Text>
          {err && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{err}</Text>
            </View>
          )}
          <TextInput 
            placeholder="Title" 
            value={title} 
            onChangeText={(text) => {
              setTitle(text);
              if (err) setErr(null); // Clear error when user starts typing
            }}
            style={styles.input} 
          />
          
          {/* Location search using AddressSearchBar */}
          <View style={styles.locationContainer}>
            <AddressSearchBar
              variant="form"
              placeholder="Location"
              skipPlaceDetails={true}
              initialAddress={location}
              onLocationSelect={(loc) => {
                setSelectedLocation(loc);
                setLocation(loc.address || `${loc.latitude}, ${loc.longitude}`);
              }}
              onClear={() => {
                setSelectedLocation(null);
                setLocation("");
              }}
              userLocation={currentLocation ? { latitude: currentLocation.latitude, longitude: currentLocation.longitude } : null}
            />
          </View>

          {/* Date and Time Picker */}
          <View style={styles.dateTimeContainer}>
            <Text style={styles.label}>Date & Time</Text>
            {Platform.OS === 'ios' ? (
              <>
                <TouchableOpacity 
                  style={styles.dateTimeButton}
                  onPress={() => {
                    setShowDatePicker(!showDatePicker);
                    setShowTimePicker(false);
                  }}
                >
                  <Text style={styles.dateTimeText}>{formatDateTime(eventDate)}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <View style={styles.pickerContainer}>
                    <DateTimePicker
                      value={eventDate}
                      mode="date"
                      display="spinner"
                      onChange={onDateChange}
                      minimumDate={new Date()}
                    />
                    <TouchableOpacity 
                      style={styles.pickerDoneButton}
                      onPress={() => {
                        setShowDatePicker(false);
                        setShowTimePicker(true);
                      }}
                    >
                      <Text style={styles.pickerDoneText}>Next: Set Time</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {showTimePicker && (
                  <View style={styles.pickerContainer}>
                    <DateTimePicker
                      value={eventDate}
                      mode="time"
                      display="spinner"
                      onChange={onTimeChange}
                      minimumDate={isToday(eventDate) ? getMinimumTime() : undefined}
                    />
                    <TouchableOpacity 
                      style={styles.pickerDoneButton}
                      onPress={() => setShowTimePicker(false)}
                    >
                      <Text style={styles.pickerDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <>
                <TouchableOpacity 
                  style={styles.dateTimeButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateTimeText}>{formatDateTime(eventDate)}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={eventDate}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                    minimumDate={new Date()}
                  />
                )}
                {showTimePicker && (
                  <DateTimePicker
                    value={eventDate}
                    mode="time"
                    display="default"
                    onChange={onTimeChange}
                    minimumDate={isToday(eventDate) ? getMinimumTime() : undefined}
                  />
                )}
                <View style={styles.timeButtonRow}>
                  <TouchableOpacity 
                    style={[styles.timeButton, styles.dateButton]}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={styles.timeButtonText}>Change Date</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.timeButton, styles.timeButtonStyle]}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Text style={styles.timeButtonText}>Change Time</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
          <TextInput 
            placeholder="Description" 
            value={description} 
            onChangeText={setDescription} 
            style={[styles.input, styles.textArea]} 
            multiline 
          />
          <TextInput 
            placeholder="Max attendees (default 20)" 
            value={maxAttendees} 
            onChangeText={setMaxAttendees} 
            keyboardType="number-pad" 
            style={styles.input} 
          />
          {/* Difficulty Selector */}
          <View style={styles.difficultyContainer}>
            <Text style={styles.label}>Difficulty</Text>
            <View style={styles.difficultyRow}>
              {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.difficultyButton,
                    difficulty === level && styles.difficultyButtonActive
                  ]}
                  onPress={() => setDifficulty(level)}
                >
                  <Text style={[
                    styles.difficultyButtonText,
                    difficulty === level && styles.difficultyButtonTextActive
                  ]}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={onCreate} style={[styles.button, styles.saveButton]}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => {
                setShowCreate(false);
                setErr(null); // Clear errors when canceling
                setSelectedLocation(null);
                setLocation("");
              }} 
              style={[styles.button, styles.cancelButton]}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalContent: {
    padding: 16,
    gap: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "InterBold",
    fontWeight: "700",
    marginBottom: 8,
  },
  errorContainer: {
    backgroundColor: "#ffebee",
    borderWidth: 1,
    borderColor: theme.colors.support.error,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: theme.colors.support.error,
    fontSize: 14,
    fontWeight: "500",
    fontFamily: 'Inter',
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.secondary.medium, //was #ccc
    borderRadius: 8,
    padding: 10,
    backgroundColor: theme.colors.secondary.light, //was #fff
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  locationContainer: {
    marginVertical: 8,
    minHeight: 50,
  },
  label: {
    fontFamily: 'InterSemiBold',
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary.dark, //was #333
    marginBottom: 8,
  },
  dateTimeContainer: {
    marginVertical: 8,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTimeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.secondary.medium, //was #ccc
    borderRadius: 8,
    padding: 12,
    backgroundColor: theme.colors.secondary.light, //was #fff
  },
  dateTimeText: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: theme.colors.primary.dark, //was #202124
  },
  timeButtonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  timeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  dateButton: {
    backgroundColor: theme.colors.primary.light, //was #e8f0fe
  },
  timeButtonStyle: {
    backgroundColor: theme.colors.primary.light, //was #f1f3f4
  },
  timeButtonText: {
    fontFamily: 'InterSemiBold',
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.support.success, //was 1967d2
  },
  difficultyContainer: {
    marginVertical: 8,
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  difficultyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.secondary.medium, //was #ccc
    backgroundColor: theme.colors.neutrallight.white, //was #fff
    alignItems: 'center',
  },
  difficultyButtonActive: {
    backgroundColor: theme.colors.support.success,
    borderColor: theme.colors.support.success,
  },
  difficultyButtonText: {
    fontFamily: 'InterSemiBold',
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary.dark, //was #333
  },
  difficultyButtonTextActive: {
    color: theme.colors.neutrallight.white, //was #fff
  },
  pickerContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: theme.colors.secondary.light, //was #f8f9fa
    borderRadius: 8,
  },
  pickerDoneButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.support.success,
    borderRadius: 8,
    alignItems: 'center',
  },
  pickerDoneText: {
    color: theme.colors.neutrallight.white, //was #fff
    fontFamily: 'InterSemiBold',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButton: {
    backgroundColor: theme.colors.support.success,
  },
  cancelButton: {
    backgroundColor: theme.colors.primary.medium, //was #999
  },
  buttonText: {
    color: theme.colors.neutrallight.white, //was #fff
    fontFamily: 'InterSemiBold',
    fontWeight: "600",
  },
});


