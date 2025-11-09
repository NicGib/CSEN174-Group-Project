import React from "react";
import { Slot, usePathname, useRouter } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../src/lib/firebase";
import { ActivityIndicator, View } from "react-native";

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = React.useState(false);
  const [user, setUser] = React.useState<User | null>(null);
  const [isNavigating, setIsNavigating] = React.useState(false);
  const [lastPathname, setLastPathname] = React.useState<string | null>(null);

  React.useEffect(() => {
    console.log("Setting up auth state listener...");
    const unsub = onAuthStateChanged(auth, (u) => {
      console.log("Auth state changed:", u ? `User: ${u.email}` : "No user");
      setUser(u);
      setReady(true);
    });
    return unsub;
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    
    const inAuthStack = pathname?.startsWith("/(auth)");
    const isMainApp = pathname === "/";
    // Check for tab routes - Expo Router pathnames don't include the (tabs) prefix
    // Tab routes are: /, /explore, /events, /events/..., /maps, /match, /match/..., /profile, /profile/..., /message/..., /debug
    const isTabRoute = pathname === "/" || 
      pathname === "/explore" ||
      pathname?.startsWith("/events") ||
      pathname?.startsWith("/maps") ||
      pathname?.startsWith("/match") ||
      pathname?.startsWith("/profile") ||
      pathname?.startsWith("/message") ||
      pathname?.startsWith("/debug");
    
    // Check if pathname changed (user is navigating)
    const pathnameChanged = lastPathname !== pathname;
    setLastPathname(pathname);
    
    console.log("🔍 ROUTING DEBUG:", { 
      ready, 
      user: user?.email, 
      pathname, 
      inAuthStack,
      isMainApp,
      isTabRoute,
      pathnameChanged,
      timestamp: new Date().toISOString()
    });
    
    if (!user) {
      // User is not authenticated
      if (isMainApp || isTabRoute) {
        console.log("🚨 REDIRECTING: Not authenticated and on main app/tabs -> going to auth home");
        router.replace("/(auth)/home");
      }
      // If not authenticated and in auth stack, stay there (allow navigation)
    } else {
      // User is authenticated
      if (inAuthStack) {
        console.log("🚨 REDIRECTING: Authenticated user in auth stack -> going to tabs");
        router.replace("/(tabs)");
      } else if (isMainApp) {
        // Only redirect on initial load (when lastPathname is null)
        // Don't redirect if we're passing through "/" during navigation
        if (lastPathname === null) {
          // Initial load - redirect immediately
          console.log("🚨 REDIRECTING: Initial load on root -> going to tabs");
          router.replace("/(tabs)");
        }
        // If we're on "/" but lastPathname is not null, we might be in the middle of navigation
        // Don't redirect - let the navigation complete
      }
      // If authenticated and in tabs, stay there (don't redirect)
    }
  }, [ready, user, pathname, lastPathname]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Slot />;
}