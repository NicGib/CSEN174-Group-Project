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
    
    console.log("🔍 ROUTING DEBUG:", { 
      ready, 
      user: user?.email, 
      pathname, 
      inAuthStack,
      isMainApp,
      timestamp: new Date().toISOString()
    });
    
    if (!user) {
      // User is not authenticated
      if (isMainApp) {
        console.log("🚨 REDIRECTING: Not authenticated and on main app -> going to auth home");
        router.replace("/(auth)/home");
      }
      // If not authenticated and in auth stack, stay there (allow navigation)
    } else {
      // User is authenticated
      if (inAuthStack) {
        console.log("🚨 REDIRECTING: Authenticated user in auth stack -> going to main app");
        router.replace("/");
      }
      // If authenticated and on main app, stay there
    }
  }, [ready, user, pathname]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Slot />;
}