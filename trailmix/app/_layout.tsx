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
    console.log("Routing check:", { ready, user: user?.email, pathname, inAuthStack });
    
    if (!user && !inAuthStack) {
      console.log("Redirecting to sign-in");
      router.replace("/(auth)/sign-in");
    } else if (user && inAuthStack) {
      console.log("Redirecting to home");
      router.replace("/");
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