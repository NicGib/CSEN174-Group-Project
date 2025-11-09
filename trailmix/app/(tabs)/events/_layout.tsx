// app/(tabs)/events/_layout.tsx
import { Stack } from "expo-router";

export default function EventsLayout() {
  return (
    <Stack screenOptions={{ headerTitle: "Events" }}>
      <Stack.Screen name="index" options={{ title: "Events" }} />
      <Stack.Screen name="[eventId]" options={{ title: "Event" }} />
    </Stack>
  );
}
