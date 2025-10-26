import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";
import { auth, createUserProfile } from "../../src/lib/firebase";
import { useRouter } from "expo-router";
import { theme } from "../theme";
import { Link } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

export default function SignIn() {
  const [email, setEmail] = React.useState("");
  const [pw, setPw] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const router = useRouter();

  const signup = async () => {
    if (!email.trim() || !pw) {
      setErr("Please enter both email and password");
      return;
    }

    setErr(null);
    setLoading(true);
    try {
      console.log("Attempting to create user with email:", email.trim());
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pw);
      console.log("User created successfully:", userCredential.user.email);
      setEmail("");
      setPw("");
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
        <Text style={theme.components.subtitle}>Sign in to start your hiking journey!</Text>
      </View>

      <View style={theme.components.form}>
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

        <Link href="/sign-up" asChild>
          <Text style={{ color: theme.colors.secondary.medium }}>
            Forgot Password?
          </Text>
        </Link>

        {err ? <Text style={theme.components.errorText}>{err}</Text> : null}

        <View style={theme.components.buttonContainerBottom}>
          <TouchableOpacity
            style={[theme.components.baseButton, theme.components.primaryButton]}
            onPress={login}
            disabled={loading}
          >
            <Text style={theme.components.primaryButtonText}>
              {loading ? "Signing in..." : "Sign In"}
            </Text>
          </TouchableOpacity>
        </View>

        {loading && <ActivityIndicator style={theme.components.loader} />}
      </View>

      <Text style={theme.components.footerText}>
        Not a member?{" "}
        <Link href="/sign-up" asChild>
          <Text style={{ color: theme.colors.secondary.medium }}>
            Register now
          </Text>
        </Link>
      </Text>
    </LinearGradient>
  );
}

// All styles now use the centralized theme.components
