import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import SwipeCard from "../components/SwipeCard";

const profiles = [
  {
    id: 1,
    name: "John Doe",
    age: 24,
    location: "Santa Clara, CA",
    bio: "A high-energy adventurer looking for the next thrilling trail.",
    photos: ["https://images.pexels.com/photos/1526404/pexels-photo-1526404.jpeg"],
  },
  {
    id: 2,
    name: "Alex Rivera",
    age: 27,
    location: "San Jose, CA",
    bio: "Weekend hiker & UX nerd. Always down for sunset loops.",
    photos: ["https://images.pexels.com/photos/697626/pexels-photo-697626.jpeg"],
  },
];

export default function SwipeScreen() {
  const [index, setIndex] = useState(0);

  const nextCard = () => {
    setIndex((i) => (i + 1 < profiles.length ? i + 1 : 0));
  };

  return (
    <View style={styles.container}>
      {profiles[index] && (
        <SwipeCard
          profile={profiles[index]}
          onSwipeLeft={nextCard}
          onSwipeRight={nextCard}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#DCC3DA",
    justifyContent: "center",
  },
});

