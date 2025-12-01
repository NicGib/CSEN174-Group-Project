import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons, Entypo, Feather } from "@expo/vector-icons";

export default function BottomNav() {
  return (
    <View style={styles.navBar}>
      
      <TouchableOpacity style={styles.item}>
        <Ionicons name="heart-outline" size={26} color="white" />
        <Text style={styles.label}>MATCHES</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.item}>
        <Entypo name="location-pin" size={28} color="white" />
        <Text style={styles.label}>MAP</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.item}>
        <Feather name="shuffle" size={26} color="#E18230" />
        <Text style={[styles.label, styles.activeLabel]}>SWIPE</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.item}>
        <Ionicons name="chatbubble-ellipses-outline" size={26} color="white" />
        <Text style={styles.label}>CHATS</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.item}>
        <Ionicons name="person-outline" size={26} color="white" />
        <Text style={styles.label}>YOU</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  navBar: {
    backgroundColor: "#2C3520",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 26,
    paddingTop: 12,
    paddingBottom: 22,
  },

  item: {
    alignItems: "center",
  },

  label: {
    color: "white",
    fontSize: 11,
    opacity: 0.75,
    marginTop: 4,
    letterSpacing: 0.6,
  },

  activeLabel: {
    color: "#E18230",
    opacity: 1,
    fontWeight: "700",
  },
});
