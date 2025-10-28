import React from "react";
import { View, Text, Button, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { auth } from "../src/lib/firebase";
import { signOut } from "firebase/auth";
import { theme, styles } from "./theme";

export default function Home() {
  const user = auth.currentUser;

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              console.log("Attempting to sign out...");
              await signOut(auth);
              console.log("Sign out successful");
            } catch (error) {
              console.error("Sign out error:", error);
              Alert.alert("Error", "Failed to sign out. Please try again.");
            }
          },
        },
      ]
    );
  };

  return (
    <LinearGradient colors={theme.colors.gradient.lightgreen} style={styles.homeContainer}>
      <View style={styles.homeHeader}>
        <Text style={styles.homeTitle}>Welcome to TrailMix!</Text>
        <Text style={styles.homeSubtitle}>Your hiking companion</Text>
      </View>

      <View style={styles.homeUserInfo}>
        <Text style={styles.homeStatusText}>Signed In</Text>
        <Text style={styles.homeEmailText}>{user?.email}</Text>
        <Text style={styles.homeUserIdText}>User ID: {user?.uid.slice(0, 8)}...</Text>
      </View>

      <View style={styles.homeActions}>
        <Button 
          title="Sign Out" 
          onPress={handleSignOut}
          color="#ff4444"
        />
      </View>
    </LinearGradient>
  );
}
