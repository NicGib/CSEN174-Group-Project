import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { auth } from "../src/lib/firebase";
import { signOut } from "firebase/auth";
import { theme } from "./theme";

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
    <LinearGradient colors={theme.colors.gradient.lightgreen} style={theme.components.container}>
      <View style={theme.components.header}>
        <Text style={theme.components.titleWhite}>Welcome to TrailMix!</Text>
        <Text style={theme.components.subtitle}>Your hiking companion</Text>
      </View>

      <View style={theme.components.card}>
        <Text style={theme.components.statusText}>Signed In</Text>
        <Text style={theme.components.emailText}>{user?.email}</Text>
        <Text style={theme.components.userIdText}>User ID: {user?.uid.slice(0, 8)}...</Text>
      </View>

      <View style={theme.components.actions}>
        <TouchableOpacity 
          style={[theme.components.baseButton, { backgroundColor: '#ff4444' }]}
          onPress={handleSignOut}
        >
          <Text style={[theme.components.primaryButtonText, { color: '#FFFFFF' }]}>
            Sign Out
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

// All styles now use the centralized theme.components
