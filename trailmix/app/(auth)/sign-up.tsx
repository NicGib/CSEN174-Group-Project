import React from "react";
<<<<<<< HEAD
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
=======
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator } from "react-native";
>>>>>>> main
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";
<<<<<<< HEAD
import { auth, createUserProfile } from "../../src/lib/firebase";
=======
import { auth } from "../../src/lib/firebase";
>>>>>>> main
import { useRouter } from "expo-router";
import { theme } from "../theme";
import { LinearGradient } from "expo-linear-gradient";

<<<<<<< HEAD
export default function SignUp() {
  const [email, setEmail] = React.useState("");
  const [pw, setPw] = React.useState("");
  const [name, setName] = React.useState("");
  const [username, setUsername] = React.useState("");
=======
export default function SignIn() {
  const [email, setEmail] = React.useState("");
  const [pw, setPw] = React.useState("");
>>>>>>> main
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const router = useRouter();

  const signup = async () => {
<<<<<<< HEAD
    if (!email.trim() || !pw || !name.trim() || !username.trim()) {
      setErr("Please fill in all fields");
=======
    if (!email.trim() || !pw) {
      setErr("Please enter both email and password");
>>>>>>> main
      return;
    }
    
    setErr(null); 
    setLoading(true);
    try {
      console.log("Attempting to create user with email:", email.trim());
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pw);
      console.log("User created successfully:", userCredential.user.email);
<<<<<<< HEAD
      
      // Create user profile in Firestore
      await createUserProfile(userCredential.user, {
        name: name.trim(),
        username: username.trim()
      });
      
      setEmail("");
      setPw("");
      setName("");
      setUsername("");
=======
      setEmail("");
      setPw("");
>>>>>>> main
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
<<<<<<< HEAD
      
      // Update last login time in Firestore
      await createUserProfile(userCredential.user, {
        name: "",
        username: ""
      });
      
=======
>>>>>>> main
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
<<<<<<< HEAD
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

=======
    <LinearGradient colors={theme.colors.gradient.lightgreen} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>TrailMix</Text>
        <Text style={styles.subtitle}>Sign in to start your hiking journey!</Text>
      </View>

      <View style={styles.form}>
>>>>>>> main
        <TextInput
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
<<<<<<< HEAD
          style={theme.components.input}
=======
          style={styles.input}
>>>>>>> main
          editable={!loading}
        />

        <TextInput
          placeholder="Password (≥ 6 chars)"
          secureTextEntry
          value={pw}
          onChangeText={setPw}
<<<<<<< HEAD
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
=======
          style={styles.input}
          editable={!loading}
        />

        {err ? <Text style={styles.errorText}>{err}</Text> : null}

        <View style={styles.buttonContainer}>
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

      <Text style={styles.footerText}>
>>>>>>> main
        Email/Password authentication must be enabled in Firebase Console.
      </Text>
    </LinearGradient>
  );
}

<<<<<<< HEAD
// All styles now use the centralized theme.components
=======
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
>>>>>>> main
