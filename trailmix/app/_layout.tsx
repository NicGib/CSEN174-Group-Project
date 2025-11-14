// app/_layout.tsx
import { Stack } from "expo-router";
import { useEffect } from "react";
import { useRouter, useSegments } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { View, ActivityIndicator } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inTabsGroup = segments[0] === "(tabs)";

    // Only redirect if we're not already on the correct screen
    if (!user) {
      // User is not signed in - should be in auth group
      if (!inAuthGroup) {
        router.replace("/(auth)/sign-in");
      }
    } else {
      // User is signed in - should be in tabs group
      if (inAuthGroup || (!inTabsGroup && segments.length > 0)) {
        router.replace("/(tabs)");
      }
    }
  }, [user, loading, segments]);

  if (loading) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="modal"
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <RootLayoutNav />
    </GestureHandlerRootView>
  );
}
