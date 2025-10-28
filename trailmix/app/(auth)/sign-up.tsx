import React from "react";
import { View, Text, TextInput, Button, ActivityIndicator } from "react-native";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";
import { auth } from "../../src/lib/firebase";
import { createUserProfile } from "../../src/lib/userService";
import { useRouter } from "expo-router";
import { theme, styles } from "../theme";
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
      console.log("User profile created in Firestore");
      
      // Clear form
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
      <View style={styles.authHeader}>
        <Text style={styles.authTitle}>TrailMix</Text>
        <Text style={styles.authSubtitle}>Create your account to start your hiking journey!</Text>
      </View>

      <View style={styles.authForm}>
        <TextInput
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
          style={styles.authInput}
          editable={!loading}
        />

        <TextInput
          placeholder="Username"
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
          style={styles.authInput}
          editable={!loading}
        />

        <TextInput
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={styles.authInput}
          editable={!loading}
        />

        <TextInput
          placeholder="Password (≥ 6 chars)"
          secureTextEntry
          value={pw}
          onChangeText={setPw}
          style={styles.authInput}
          editable={!loading}
        />

        {err ? <Text style={styles.errorText}>{err}</Text> : null}

        <View style={styles.authButtonContainer}>
          <Button 
            title={loading ? "Signing in..." : "Sign In"} 
            onPress={login}
            disabled={loading}
            color="#3498db"
          />
          <Button 
            title={loading ? "Creating..." : "Create Account"} 
            onPress={signup}
            disabled={loading}
            color="#9b59b6"
          />
        </View>

        {loading && <ActivityIndicator style={styles.loader} />}
        
        <Button 
          title="Test Manual Redirect" 
          onPress={() => {
            console.log("Testing manual redirect to home");
            router.replace("/");
          }}
          color="#ff8800"
        />
      </View>

      <Text style={styles.authFooterText}>
        Email/Password authentication must be enabled in Firebase Console.
      </Text>
    </LinearGradient>
  );
}
