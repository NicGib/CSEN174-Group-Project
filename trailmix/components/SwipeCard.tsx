import React, { useState } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";

export default function SwipeCard({ profile, onLike, onPass }) {
  const [index, setIndex] = useState(0);

  const nextPhoto = () => {
    setIndex((i) => (i + 1) % profile.photos.length);
  };

  const prevPhoto = () => {
    setIndex((i) => (i === 0 ? profile.photos.length - 1 : i - 1));
  };

  return (
    <View style={styles.card}>
      {/* Photo Carousel */}
      <View style={styles.photoContainer}>
        <Image
          source={{ uri: profile.photos[index] }}
          style={styles.photo}
          resizeMode="cover"
        />

        {/* Touch Zones */}
        <TouchableOpacity onPress={prevPhoto} style={styles.leftZone} />
        <TouchableOpacity onPress={nextPhoto} style={styles.rightZone} />
      </View>

      {/* Info Section */}
      <View style={styles.info}>
        <Text style={styles.name}>
          {profile.name}, {profile.age}
        </Text>

        <Text style={styles.location}>{profile.location}</Text>

        <Text style={styles.bio}>{profile.bio}</Text>
      </View>

      {/* Buttons */}
      <View style={styles.buttons}>
        <TouchableOpacity style={styles.passBtn} onPress={onPass}>
          <Text style={styles.btnText}>✕</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.likeBtn} onPress={onLike}>
          <Text style={styles.btnText}>✓</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#2C3520",
    borderRadius: 20,
    overflow: "hidden",
    marginHorizontal: 16,
    paddingBottom: 20,
  },
  photoContainer: {
    height: 360,
    position: "relative",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  leftZone: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "35%",
  },
  rightZone: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "35%",
  },
  info: {
    padding: 16,
  },
  name: {
    color: "white",
    fontSize: 22,
    fontWeight: "600",
  },
  location: {
    color: "white",
    opacity: 0.8,
    marginTop: 4,
  },
  bio: {
    color: "white",
    opacity: 0.7,
    marginTop: 8,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginTop: 16,
  },
  passBtn: {
    backgroundColor: "#C9382A",
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  likeBtn: {
    backgroundColor: "#2E77B4",
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    color: "white",
    fontSize: 28,
  },
});
