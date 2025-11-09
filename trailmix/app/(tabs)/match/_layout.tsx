// app/(tabs)/match/_layout.tsx
import { Stack } from "expo-router";

export default function MatchLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "Match" }} />
    </Stack>
  );
}

