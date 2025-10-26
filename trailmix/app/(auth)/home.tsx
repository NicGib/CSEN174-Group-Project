import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";
import { auth } from "../../src/lib/firebase";
import { useRouter } from "expo-router";
import { theme } from "../theme";
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
    <LinearGradient colors={theme.colors.gradient.lightgreen} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>TrailMix</Text>
        <Text style={styles.subtitle}>Sign in to start your hiking journey!</Text>
      </View>

      <View style={styles.form}>

        {err ? <Text style={styles.errorText}>{err}</Text> : null}

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.baseButton, styles.primaryButton]}
            onPress={() => {
              console.log("Sign In button pressed, navigating to /(auth)/sign-in");
              router.push("/(auth)/sign-in");
            }}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>
              Sign In
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.baseButton, styles.secondaryButton]}
            onPress={() => {
              console.log("Create Account button pressed, navigating to /(auth)/sign-up");
              router.push("/(auth)/sign-up");
            }}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>
              Create Account
            </Text>
          </TouchableOpacity>
        </View>

        {loading && <ActivityIndicator style={styles.loader} />}
      </View>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  baseButton: {
    width: '100%',
    borderRadius: 40,        // big radius = pill
    paddingVertical: 18,     // vertical height
    paddingHorizontal: 24,   // horizontal breathing room
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButton: {
    backgroundColor: theme.colors.secondary.light, // cream fill
  },

  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.secondary.light,     // cream border
  },

  primaryButtonText: {
    color: theme.colors.primary.dark,              // dark green text
    fontSize: 16,
    fontWeight: '600',
  },

  secondaryButtonText: {
    color: theme.colors.secondary.light,           // cream text
    fontSize: 16,
    fontWeight: '600',
  },

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
    fontSize: 48,
    fontWeight: '700',
    color: theme.colors.secondary.light,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  form: {
    flex: 1,
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    backgroundColor: 'white',
    fontSize: 16,
  },
  buttonContainer: {
    gap: 10,
    marginTop: 20,
  },
  errorText: {
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 14,
  },
  loader: {
    marginTop: 20,
  },
  footerText: {
    color: '#7f8c8d',
    textAlign: 'center',
    fontSize: 12,
    marginBottom: 20,
  },
});
