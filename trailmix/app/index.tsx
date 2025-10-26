import React from "react";
import { View, Text, Button, StyleSheet, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { auth } from "../src/lib/firebase";
import { signOut } from "firebase/auth";

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
    <LinearGradient colors={["#617337", "#455429"]} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to TrailMix!</Text>
        <Text style={styles.subtitle}>Your hiking companion</Text>
      </View>

      <View style={styles.userInfo}>
        <Text style={styles.statusText}>Signed In</Text>
        <Text style={styles.emailText}>{user?.email}</Text>
        <Text style={styles.userIdText}>User ID: {user?.uid.slice(0, 8)}...</Text>
      </View>

      <View style={styles.actions}>
        <Button 
          title="Sign Out" 
          onPress={handleSignOut}
          color="#ff4444"
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  userInfo: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#27ae60',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 4,
  },
  userIdText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  actions: {
    marginTop: 'auto',
  },
});
