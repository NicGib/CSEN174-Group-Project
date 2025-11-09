// app/(tabs)/message/_layout.tsx
import { Stack } from "expo-router";

export default function MessageLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[uid]" options={{ title: "Message" }} />
    </Stack>
  );
}

