import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import SwipeCard from "../components/SwipeCard";
import BottomNav from "../components/BottomNav";
import { useRouter } from "expo-router";

const profiles = [
  {
    id: 1,
    name: "John Doe",
    age: 24,
    location: "Santa Clara, CA",
    bio: "A high-energy adventurer looking for the next thrilling trail.",
    photos: [
      "https://images.pexels.com/photos/1526404/pexels-photo-1526404.jpeg"
    ]
  }
];

export default function SwipeScreen() {
  const [index, setIndex] = useState(0);
  const router = useRouter();

  const handleLike = () => {
    // simulate instant match
    router.push({
      pathname: "/match",
      params: { name: profiles[index].name }
    });
  };

  const handlePass = () => {
    console.log("Passed");
  };

  return (
    <View style={styles.container}>
      <SwipeCard
        profile={profiles[index]}
        onSwipeLeft={handlePass}
        onSwipeRight={handleLike} // TRIGGERS MATCH
      />
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#4D5A29",
    justifyContent: "space-between",
    paddingTop: 20,
  },
});


