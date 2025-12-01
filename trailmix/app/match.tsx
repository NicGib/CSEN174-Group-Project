import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { BlurView } from "expo-blur";
import Animated, {
  useSharedValue,
  withTiming,
  withSpring,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useLocalSearchParams, useRouter } from "expo-router";
import BottomNav from "../components/BottomNav";

export default function MatchScreen() {
  const router = useRouter();
  const { name } = useLocalSearchParams();

  // Animations
  const slideUp = useSharedValue(300);
  const scale = useSharedValue(0.7);

  useEffect(() => {
    slideUp.value = withTiming(0, { duration: 400 });
    scale.value = withSpring(1, { damping: 10 });
  }, []);

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideUp.value }, { scale: scale.value }],
  }));

  return (
    <View style={styles.screen}>
      {/* blurred background */}
      <BlurView intensity={50} style={styles.blurBackground} />

      {/* PHOTO */}
      <View style={styles.photoContainer}>
        <Image
          source={require("../assets/images/placeholder.png")}
          style={styles.photo}
        />
      </View>

      {/* ANIMATED MATCH CARD */}
      <Animated.View style={[styles.matchCard, slideStyle]}>
        <Text style={styles.matchTitle}>It’s a Match!</Text>

        {/* Buttons */}
        <View style={styles.row}>
          <TouchableOpacity
            style={styles.messageBtn}
            onPress={() => router.push("/chats")}
          >
            <View style={styles.messageBubble}>
              <Text style={{ fontSize: 22 }}>💬</Text>
            </View>
            <Text style={styles.msgLabel}>Send a message to {name}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => router.replace("/swipe")}
          >
            <View style={styles.skipBubble}>
              <Text style={styles.skipCheck}>✓</Text>
            </View>
            <Text style={styles.skipLabel}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#4D5A29",
    justifyContent: "space-between",
  },

  blurBackground: {
    ...StyleSheet.absoluteFillObject,
  },

  photoContainer: {
    marginTop: 60,
    height: 420,
    width: "90%",
    alignSelf: "center",
    backgroundColor: "white",
    borderRadius: 26,
    overflow: "hidden",
  },

  photo: {
    width: "100%",
    height: "100%",
  },

  matchCard: {
    backgroundColor: "#2C3520",
    marginHorizontal: 20,
    marginBottom: 10,
    paddingVertical: 24,
    borderRadius: 22,
    alignItems: "center",
  },

  matchTitle: {
    color: "white",
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 20,
  },

  row: {
    width: "80%",
    flexDirection: "row",
    justifyContent: "space-between",
  },

  messageBtn: {
    alignItems: "center",
  },
  messageBubble: {
    width: 58,
    height: 58,
    backgroundColor: "#E5EFD1",
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
  },
  msgLabel: {
    color: "white",
    marginTop: 8,
    opacity: 0.85,
  },

  skipBtn: {
    alignItems: "center",
  },
  skipBubble: {
    width: 58,
    height: 58,
    backgroundColor: "#6E874F",
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
  },
  skipCheck: {
    color: "white",
    fontSize: 28,
    fontWeight: "700",
  },
  skipLabel: {
    color: "white",
    marginTop: 8,
    opacity: 0.85,
  },
});

