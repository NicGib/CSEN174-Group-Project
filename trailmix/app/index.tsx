import { useEffect } from "react";
import { useRouter } from "expo-router";

// Root index now just redirects to tabs
// The actual home page is now at (tabs)/index.tsx
export default function RootIndex() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to tabs immediately
    router.replace("/(tabs)");
  }, []);

  return null;
}
