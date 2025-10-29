import React from "react";
import { View, Text, TextInput, Button, ActivityIndicator, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Keyboard } from "react-native";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";
import { auth } from "../../src/lib/firebase";
import { createUserProfile } from "../../src/lib/userService";
import { Link, useRouter } from "expo-router";
import { theme, styles } from "../theme";
import { LinearGradient } from "expo-linear-gradient";

export default function SignUp() {
  const [email, setEmail] = React.useState("");
  const [pw, setPw] = React.useState("");
  const [confirmPw, setConfirmPw] = React.useState("");
  const [name, setName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [scrollEnabled, setScrollEnabled] = React.useState(false);
  const router = useRouter();

  // Enable scrolling when keyboard appears, disable when it hides
  React.useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setScrollEnabled(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setScrollEnabled(false);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  const signup = async () => {
    if (!email.trim() || !pw || !confirmPw || !name.trim() || !username.trim()) {
      setErr("Please fill in all fields");
      return;
    }

    if (pw !== confirmPw) {
      setErr("Passwords do not match");
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
      console.log("User profile created in Firestore");

      // Clear form
      setEmail("");
      setPw("");
      setConfirmPw("");
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
    <LinearGradient colors={theme.colors.gradient.lightgreen} style={styles.authContainer}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEnabled={scrollEnabled}
        >
          <View style={styles.authHeader}>
            <Text style={styles.authTitle}>Trail Mix</Text>
            <Text style={styles.authSubtitle}>Create an account to get started.</Text>
          </View>

          <View style={styles.authForm}>
            <Text style={styles.authFormLabel}>Name</Text>
            <TextInput
              placeholder="Name"
              placeholderTextColor={theme.colors.neutraldark.light}
              value={name}
              onChangeText={setName}
              style={styles.authInput}
              editable={!loading}
            />

            <Text style={styles.authFormLabel}>Username</Text>
            <TextInput
              placeholder="Username"
              placeholderTextColor={theme.colors.neutraldark.light}
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
              style={styles.authInput}
              editable={!loading}
            />

            <Text style={styles.authFormLabel}>Email</Text>
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
            <TextInput
              placeholder="Confirm Password"
              placeholderTextColor={theme.colors.neutraldark.light}
              secureTextEntry
              value={confirmPw}
              onChangeText={setConfirmPw}
              style={styles.authInput}
              editable={!loading}
            />
          </View>
          <View style={styles.landingButtonSection}>
            {err ? <Text style={styles.errorText}>{err}</Text> : null}

            <View style={styles.landingButtonContainer}>
              {/* CREATE ACCOUNT (primary button) */}
              <TouchableOpacity
                style={[styles.baseButton, styles.primaryButton, styles.landingButton]}
                onPress={signup}
                disabled={loading}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
                </Text>
              </TouchableOpacity>
              <Text style={styles.authFooterText}>
                Already have an account? <Link style={{ color: theme.colors.secondary.medium }} href="/(auth)/sign-in">Sign in</Link>
              </Text>
            </View>

            {loading && <ActivityIndicator style={styles.loader} />}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
