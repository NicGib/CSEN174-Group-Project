import React from "react";
import { View, Text, TextInput, Button, TouchableOpacity, ActivityIndicator } from "react-native";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";
import { auth } from "../../src/lib/firebase";
import { updateLastLogin } from "../../src/lib/userService";
import { Link, useRouter } from "expo-router";
import { theme, styles } from "../theme";
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
      // Redirect will be handled by root layout based on auth state
      router.replace("/(tabs)");
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
      await updateLastLogin(userCredential.user.uid);
      console.log("Last login updated in Firestore");

      setEmail("");
      setPw("");
      // Redirect will be handled by root layout based on auth state
      router.replace("/(tabs)");
    } catch (e: any) {
      console.error("Login error:", e);
      setErr(`Login failed: ${e.message} (Code: ${e.code})`);
    } finally {
      setLoading(false);
    }
  };


  return (
    <LinearGradient colors={theme.colors.gradient.lightgreen} style={styles.authContainer}>
      <View style={styles.authHeader}>
        <Text style={styles.authTitle}>Trail Mix</Text>
      </View>

      <View style={styles.authForm}>
        <Text style={styles.authFormLabel}>Username</Text>
        <TextInput
          placeholder="Email"
          placeholderTextColor={theme.colors.neutraldark.light}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={styles.authInput}
          editable={!loading}
        />

        <Text style={styles.authFormLabel}>Password</Text>
        <TextInput
          placeholder="Password (≥ 6 chars)"
          placeholderTextColor={theme.colors.neutraldark.light}
          secureTextEntry
          value={pw}
          onChangeText={setPw}
          style={styles.authInput}
          editable={!loading}
        />
        <Text style={{...styles.authFooterText, textAlign: 'left'}}>
          <Link style={{ color: theme.colors.secondary.medium }} href="/(auth)/resend-password">Forgot Password?</Link>
        </Text>
      </View>
      <View style={styles.landingButtonSection}>
        {err ? <Text style={styles.errorText}>{err}</Text> : null}

        <View style={styles.landingButtonContainer}>
          {/* SIGN IN (primary button) */}
          <TouchableOpacity
            style={[styles.baseButton, styles.primaryButton, styles.landingButton]}
            onPress={login}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? "SIGNING IN..." : "SIGN IN"}
            </Text>
          </TouchableOpacity>
          <Text style={styles.authFooterText}>
            Not a member? <Link style={{ color: theme.colors.secondary.medium }} href="/(auth)/sign-up">Register now</Link>
          </Text>
        </View>

        {loading && <ActivityIndicator style={styles.loader} />}
      </View>
    </LinearGradient>
  );
}
