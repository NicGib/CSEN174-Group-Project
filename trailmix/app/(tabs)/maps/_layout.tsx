// app/(tabs)/maps/_layout.tsx
import { Stack } from "expo-router";

export default function MapsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "Maps" }} />
      <Stack.Screen name="download" options={{ title: "Download Maps" }} />
    </Stack>
  );
}

