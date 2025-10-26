import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { theme } from "../theme";
import { LinearGradient } from "expo-linear-gradient";

export default function Home() {
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();


  return (
    <LinearGradient colors={theme.colors.gradient.lightgreen} style={theme.components.container}>
      <View style={theme.components.header}>
        <Text style={theme.components.titleWhite}>TrailMix</Text>
        <Text style={theme.components.subtitle}>Sign in to start your hiking journey!</Text>
      </View>

      <View style={theme.components.form}>
        <View style={theme.components.buttonContainerBottom}>
          <TouchableOpacity 
            style={[theme.components.baseButton, theme.components.primaryButton]}
            onPress={() => {
              console.log("Sign In button pressed, navigating to /(auth)/sign-in");
              router.push("/(auth)/sign-in");
            }}
            disabled={loading}
          >
            <Text style={theme.components.primaryButtonText}>
              Sign In
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[theme.components.baseButton, theme.components.secondaryButton]}
            onPress={() => {
              console.log("Create Account button pressed, navigating to /(auth)/sign-up");
              router.push("/(auth)/sign-up");
            }}
            disabled={loading}
          >
            <Text style={theme.components.secondaryButtonText}>
              Create Account
            </Text>
          </TouchableOpacity>
        </View>

        {loading && <ActivityIndicator style={theme.components.loader} />}
      </View>
    </LinearGradient>
  );
}