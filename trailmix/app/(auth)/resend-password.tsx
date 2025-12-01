import React from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { Link, useRouter } from "expo-router";
import { theme, styles } from "../theme";
import { LinearGradient } from "expo-linear-gradient";

export default function ResendPassword() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const router = useRouter();

  const handleResend = async () => {
    if (!email.trim()) {
      setMessage("Please enter your email address");
      return;
    }

    setLoading(true);
    setMessage(null);
    
    // TODO: Implement password reset functionality
    setTimeout(() => {
      setMessage("Password reset email sent! Please check your inbox.");
      setLoading(false);
    }, 1000);
  };

  return (
    <LinearGradient colors={theme.colors.gradient.lightgreen} style={styles.authContainer}>
      <View style={styles.authHeader}>
        <Text style={styles.authTitle}>Reset Password</Text>
        <Text style={styles.authSubtitle}>Enter your email to receive a password reset link.</Text>
      </View>

      <View style={styles.authForm}>
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
        {message && (
          <Text style={message.includes("sent") ? styles.authFooterText : styles.errorText}>
            {message}
          </Text>
        )}
      </View>

      <View style={styles.authButtonContainer}>
        <TouchableOpacity
          style={[styles.baseButton, styles.primaryButton, styles.landingButton]}
          onPress={handleResend}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? "SENDING..." : "SEND RESET LINK"}
          </Text>
        </TouchableOpacity>
        <Text style={styles.authFooterText}>
          Remember your password? <Link style={{ color: theme.colors.secondary.medium }} href="/(auth)/sign-in">Sign in</Link>
        </Text>
      </View>

      {loading && <ActivityIndicator style={styles.loader} />}
    </LinearGradient>
  );
}

