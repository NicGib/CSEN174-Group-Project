import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import SwipeCard from "../components/SwipeCard";

const profiles = [
  {
    name: "John Doe",
    age: 24,
    location: "Santa Clara, CA",
    bio: "A high-energy adventurer looking for the next thrilling trail.",
    photos: [
      "https://images.pexels.com/photos/1526404/pexels-photo-1526404.jpeg",
      "https://images.pexels.com/photos/696682/pexels-photo-696682.jpeg",
      "https://images.pexels.com/photos/2067804/pexels-photo-2067804.jpeg",
    ],
  },
];

export default function SwipeScreen() {
  const [current, setCurrent] = useState(0);

  const handleLike = () => {
    console.log("liked");
  };

  const handlePass = () => {
    console.log("passed");
  };

  return (
    <View style={styles.container}>
      <SwipeCard
        profile={profiles[current]}
        onLike={handleLike}
        onPass={handlePass}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#DCC3DA",
    justifyContent: "center",
    paddingBottom: 60,
  },
});
