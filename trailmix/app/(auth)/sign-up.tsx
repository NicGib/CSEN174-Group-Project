import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";
import { auth, createUserProfile } from "../../src/lib/firebase";
import { useRouter } from "expo-router";
import { theme } from "../theme";
import { LinearGradient } from "expo-linear-gradient";

export default function SignUp() {
  const [email, setEmail] = React.useState("");
  const [pw, setPw] = React.useState("");
  const [name, setName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const router = useRouter();

  const signup = async () => {
    if (!email.trim() || !pw || !name.trim() || !username.trim()) {
      setErr("Please fill in all fields");
      return;
    }
    
    setErr(null); 
    setLoading(true);
    try {
      console.log("Attempting to create user with email:", email.trim());
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pw);
      console.log("User created successfully:", userCredential.user.email);
      
      // Create user profile in Firestore
      await createUserProfile(userCredential.user, {
        name: name.trim(),
        username: username.trim()
      });
      
      setEmail("");
      setPw("");
      setName("");
      setUsername("");
      setTimeout(() => {
        console.log("Manual redirect to home after signup");
        router.replace("/");
      }, 100);
    } catch (e: any) {
      console.error("Signup error:", e);
      setErr(`Signup failed: ${e.message} (Code: ${e.code})`);
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    if (!email.trim() || !pw) {
      setErr("Please enter both email and password");
      return;
    }
    
    setErr(null); 
    setLoading(true);
    try {
      console.log("Attempting to sign in with email:", email.trim());
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), pw);
      console.log("User signed in successfully:", userCredential.user.email);
      
      // Update last login time in Firestore
      await createUserProfile(userCredential.user, {
        name: "",
        username: ""
      });
      
      setEmail("");
      setPw("");
      setTimeout(() => {
        console.log("Manual redirect to home after login");
        router.replace("/");
      }, 100);
    } catch (e: any) {
      console.error("Login error:", e);
      setErr(`Login failed: ${e.message} (Code: ${e.code})`);
    } finally {
      setLoading(false);
    }
  };


  return (
    <LinearGradient colors={theme.colors.gradient.lightgreen} style={theme.components.container}>
      <View style={theme.components.header}>
        <Text style={theme.components.titleWhite}>TrailMix</Text>
        <Text style={theme.components.subtitle}>Create your account to start hiking!</Text>
      </View>

      <View style={theme.components.form}>
        <TextInput
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
          style={theme.components.input}
          editable={!loading}
        />

        <TextInput
          placeholder="Username"
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
          style={theme.components.input}
          editable={!loading}
        />

        <TextInput
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={theme.components.input}
          editable={!loading}
        />

        <TextInput
          placeholder="Password (≥ 6 chars)"
          secureTextEntry
          value={pw}
          onChangeText={setPw}
          style={theme.components.input}
          editable={!loading}
        />

        {err ? <Text style={theme.components.errorText}>{err}</Text> : null}

        <View style={theme.components.buttonContainer}>
          <TouchableOpacity 
            style={[theme.components.baseButton, theme.components.primaryButton]}
            onPress={signup}
            disabled={loading}
          >
            <Text style={theme.components.primaryButtonText}>
              {loading ? "Creating..." : "Create Account"}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[theme.components.baseButton, theme.components.secondaryButton]}
            onPress={login}
            disabled={loading}
          >
            <Text style={theme.components.secondaryButtonText}>
              {loading ? "Signing in..." : "Sign In"}
            </Text>
          </TouchableOpacity>
        </View>

        {loading && <ActivityIndicator style={theme.components.loader} />}
      </View>

      <Text style={theme.components.footerText}>
        Email/Password authentication must be enabled in Firebase Console.
      </Text>
    </LinearGradient>
  );
}

// All styles now use the centralized theme.components
