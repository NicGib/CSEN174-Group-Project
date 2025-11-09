import React from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, Modal, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { listEvents, createEvent, joinEvent, leaveEvent, EventDetails } from "../../../src/api/events";
import { auth } from "../../../src/lib/firebase";

export default function EventsScreen() {
  const router = useRouter();
  const [events, setEvents] = React.useState<EventDetails[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [showCreate, setShowCreate] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [eventDate, setEventDate] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [difficulty, setDifficulty] = React.useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [maxAttendees, setMaxAttendees] = React.useState("20");

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

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const onCreate = async () => {
    if (!title.trim() || !location.trim() || !eventDate.trim()) {
      setErr("Title, location and date are required");
      return;
    }
    setErr(null);
    try {
      const user = auth.currentUser;
      await createEvent({
        title: title.trim(),
        location: location.trim(),
        event_date: eventDate.trim(),
        description: description,
        max_attendees: Number(maxAttendees) || 20,
        difficulty_level: difficulty,
        organizer_uid: user?.uid || "",
      });
      setShowCreate(false);
      setTitle("");
      setLocation("");
      setEventDate("");
      setDescription("");
      setDifficulty("beginner");
      setMaxAttendees("20");
      await load();
    } catch (e: any) {
      setErr(e.message || "Failed to create event");
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

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      <View style={{ 
        flexDirection: "row", 
        justifyContent: "space-between", 
        alignItems: "center",
        padding: 20,
        paddingTop: 60,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
      }}>
        <Text style={{ fontSize: 20, fontWeight: "bold", color: '#333' }}>Events</Text>
        <TouchableOpacity onPress={() => setShowCreate(true)} style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#2d6cdf", borderRadius: 8 }}>
          <Text style={{ color: "white", fontWeight: "600" }}>Create</Text>
        </TouchableOpacity>
      </View>
      
      <View style={{ flex: 1, padding: 16, gap: 12 }}>

      {err ? <Text style={{ color: "#b00020" }}>{err}</Text> : null}

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.event_id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/(tabs)/events/${item.event_id}`)}
              style={{ padding: 12, borderWidth: 1, borderColor: "#ddd", borderRadius: 10, marginBottom: 10, backgroundColor: "#fff" }}
            >
              <Text style={{ fontSize: 16, fontWeight: "700" }}>{item.title}</Text>
              <Text style={{ marginTop: 4 }}>{item.location} • {new Date(item.event_date).toLocaleString()}</Text>
              <Text numberOfLines={3} style={{ marginTop: 4, color: "#555" }}>{item.description}</Text>
              <Text style={{ marginTop: 4, color: "#333" }}>Difficulty: {item.difficulty_level} • {item.attendees?.length || 0}/{item.max_attendees} going</Text>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                {(() => {
                  const uid = auth.currentUser?.uid || "";
                  const isJoined = !!uid && Array.isArray(item.attendees) && item.attendees.includes(uid);
                  if (isJoined) {
                    return (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          onLeave(item.event_id);
                        }}
                        style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#b00020", borderRadius: 8 }}
                      >
                        <Text style={{ color: "white", fontWeight: "600" }}>Leave</Text>
                      </TouchableOpacity>
                    );
                  }
                  return (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        onJoin(item.event_id);
                      }}
                      style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#1e8e3e", borderRadius: 8 }}
                    >
                      <Text style={{ color: "white", fontWeight: "600" }}>Join</Text>
                    </TouchableOpacity>
                  );
                })()}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
      </View>

      <Modal visible={showCreate} animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <View style={{ flex: 1, padding: 16, gap: 10 }}>
          <Text style={{ fontSize: 20, fontWeight: "700" }}>Create Event</Text>
          <TextInput placeholder="Title" value={title} onChangeText={setTitle} style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10 }} />
          <TextInput placeholder="Location" value={location} onChangeText={setLocation} style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10 }} />
          <TextInput placeholder="Date (YYYY-MM-DD or ISO)" value={eventDate} onChangeText={setEventDate} style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10 }} />
          <TextInput placeholder="Description" value={description} onChangeText={setDescription} style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10 }} multiline />
          <TextInput placeholder="Max attendees (default 20)" value={maxAttendees} onChangeText={setMaxAttendees} keyboardType="number-pad" style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10 }} />
          <TextInput placeholder="Difficulty (beginner|intermediate|advanced)" value={difficulty} onChangeText={(t) => setDifficulty((t as any) || "beginner")} style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10 }} />

          <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
            <TouchableOpacity onPress={onCreate} style={{ paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#2d6cdf", borderRadius: 8 }}>
              <Text style={{ color: "white", fontWeight: "600" }}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCreate(false)} style={{ paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#999", borderRadius: 8 }}>
              <Text style={{ color: "white", fontWeight: "600" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}


