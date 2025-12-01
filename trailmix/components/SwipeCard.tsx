import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";

export default function SwipeCard({ profile, onSwipeLeft, onSwipeRight }) {
  return (
    <View style={styles.cardWrapper}>

      {/* TOP IMAGE SECTION */}
      <View style={styles.photoContainer}>
        <Image
          source={{ uri: profile.photos[0] }}
          style={styles.photo}
          resizeMode="cover"
        />

        {/* THREE PROGRESS TABS */}
        <View style={styles.tabsRow}>
          <View style={[styles.tab, styles.tabActive]} />
          <View style={styles.tab} />
          <View style={styles.tab} />
        </View>
      </View>

      {/* DARK GREEN INFO SECTION */}
      <View style={styles.infoSection}>

        {/* NAME + INFO ICON */}
        <View style={styles.titleRow}>
          <Text style={styles.name}>{profile.name}, {profile.age}</Text>

          {/* Info bubble */}
          <View style={styles.infoBubble}>
            <Text style={styles.infoBubbleText}>i</Text>
          </View>
        </View>

        {/* LOCATION */}
        <Text style={styles.location}>{profile.location}</Text>

        {/* BIO */}
        <Text style={styles.bio}>{profile.bio}</Text>

        {/* BUTTONS */}
        <View style={styles.buttonsRow}>
          <TouchableOpacity style={styles.dislikeBtn} onPress={onSwipeLeft}>
            <Text style={styles.buttonText}>✕</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.likeBtn} onPress={onSwipeRight}>
            <Text style={styles.buttonText}>✓</Text>
          </TouchableOpacity>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    width: "92%",
    borderRadius: 26,
    overflow: "hidden",
    alignSelf: "center",
    backgroundColor: "#2C3520",
  },

  /* PHOTO SECTION */
  photoContainer: {
    height: 390,
    backgroundColor: "white",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: "hidden",
  },

  photo: {
    width: "100%",
    height: "100%",
  },

  tabsRow: {
    position: "absolute",
    top: 16,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-evenly",
    paddingHorizontal: 20,
  },

  tab: {
    width: 82,
    height: 10,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#96AC6D",
    backgroundColor: "transparent",
  },

  tabActive: {
    backgroundColor: "#96AC6D",
  },

  /* INFO SECTION */
  infoSection: {
    backgroundColor: "#2C3520",
    paddingTop: 22,
    paddingHorizontal: 22,
    paddingBottom: 32,
  },

  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  name: {
    color: "white",
    fontSize: 24,
    fontWeight: "700",
  },

  infoBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E5EFD1",
    borderWidth: 2,
    borderColor: "white",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 3,
  },

  infoBubbleText: {
    color: "#2C3520",
    fontWeight: "700",
    fontSize: 16,
  },

  location: {
    marginTop: 6,
    color: "white",
    opacity: 0.75,
    fontSize: 14,
  },

  bio: {
    marginTop: 12,
    color: "white",
    opacity: 0.78,
    lineHeight: 20,
    fontSize: 14.5,
  },

  /* BUTTONS */
  buttonsRow: {
    marginTop: 26,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 40,
  },

  dislikeBtn: {
    width: 62,
    height: 62,
    backgroundColor: "#C63B31",
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
  },

  likeBtn: {
    width: 62,
    height: 62,
    backgroundColor: "#2C6FA8",
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
  },

  buttonText: {
    color: "white",
    fontSize: 28,
    fontWeight: "bold",
  },
});
