import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { theme, styles } from "../theme";
import { LinearGradient } from "expo-linear-gradient";

export default function Landing() {
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const router = useRouter();

  return (
    <LinearGradient
      colors={theme.colors.gradient.lightgreen}
      style={styles.landingContainer}
    >
      {/* TOP SECTION */}
      <View style={styles.landingTopSection}>
        <Text style={styles.landingTitle}>Trail Mix</Text>
        {/* screenshot doesn't show subtitle, so skip it */}
        {/* <Text style={styles.landingSubtitle}>Sign in to start your hiking journey!</Text> */}
      </View>

      {/* BOTTOM SECTION (BUTTONS) */}
      <View style={styles.landingButtonSection}>
        {err ? <Text style={styles.errorText}>{err}</Text> : null}

        <View style={styles.landingButtonContainer}>
          {/* CREATE ACCOUNT (light fill) */}
          <TouchableOpacity
            style={[styles.baseButton, styles.primaryButton, styles.landingButton]}
            onPress={() => {
              console.log("Create Account pressed, navigating to /(auth)/sign-up");
              router.push("/(auth)/sign-up");
            }}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>CREATE ACCOUNT</Text>
          </TouchableOpacity>

          {/* SIGN IN (outlined) */}
          <TouchableOpacity
            style={[styles.baseButton, styles.secondaryButton, styles.landingButton]}
            onPress={() => {
              console.log("Sign In pressed, navigating to /(auth)/sign-in");
              router.push("/(auth)/sign-in");
            }}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>SIGN IN</Text>
          </TouchableOpacity>
        </View>

        {loading && <ActivityIndicator style={styles.loader} />}
      </View>
    </LinearGradient>
  );
}
