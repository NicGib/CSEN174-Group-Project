import React from "react";
import { View, Text, Image, StyleSheet, Dimensions, TouchableOpacity } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.28;

export default function SwipeCard({ profile, onSwipeLeft, onSwipeRight }) {
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);

  const gesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      rotate.value = e.translationX / 20;
    })
    .onEnd(() => {
      if (translateX.value > SWIPE_THRESHOLD) {
        translateX.value = withTiming(SCREEN_WIDTH * 1.4, { duration: 200 });
        rotate.value = withTiming(20, { duration: 200 });
        runOnJS(onSwipeRight)();
      } else if (translateX.value < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-SCREEN_WIDTH * 1.4, { duration: 200 });
        rotate.value = withTiming(-20, { duration: 200 });
        runOnJS(onSwipeLeft)();
      } else {
        translateX.value = withSpring(0);
        rotate.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.card, animatedStyle]}>
        <Image 
          source={{ uri: profile.photos[0] }} 
          style={styles.image} 
          resizeMode="cover" 
        />

        <View style={styles.info}>
          <Text style={styles.name}>{profile.name}, {profile.age}</Text>
          <Text style={styles.location}>{profile.location}</Text>
          <Text style={styles.bio}>{profile.bio}</Text>
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity style={styles.passBtn} onPress={() => runOnJS(onSwipeLeft)()}>
            <Text style={styles.btnTxt}>✕</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.likeBtn} onPress={() => runOnJS(onSwipeRight)()}>
            <Text style={styles.btnTxt}>✓</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "90%",
    backgroundColor: "#2C3520",
    borderRadius: 22,
    overflow: "hidden",
    alignSelf: "center",
  },
  image: {
    width: "100%",
    height: 420,
  },
  info: {
    padding: 16,
  },
  name: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },
  location: {
    color: "white",
    opacity: 0.85,
    marginTop: 3,
  },
  bio: {
    color: "white",
    opacity: 0.7,
    marginTop: 8,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginBottom: 24,
    marginTop: 12,
  },
  passBtn: {
    backgroundColor: "#C9382A",
    padding: 18,
    borderRadius: 50,
  },
  likeBtn: {
    backgroundColor: "#2E77B4",
    padding: 18,
    borderRadius: 50,
  },
  btnTxt: {
    fontSize: 28,
    color: "white",
  },
});

