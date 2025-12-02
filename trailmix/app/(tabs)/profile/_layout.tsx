// app/(tabs)/profile/_layout.tsx
import { Stack } from "expo-router";

export default function ProfileLayout() {
  return (
    <Stack 
      screenOptions={{ headerShown: false }}
      initialRouteName="index"
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: "Profile",
          // Ensure index is the default route
        }} 
      />
      <Stack.Screen 
        name="[uid]" 
        options={{ 
          title: "Profile",
          // This route is for viewing other users' profiles
        }} 
      />
    </Stack>
  );
}

