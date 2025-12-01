import React from "react";
import { View, Text, StyleSheet, Image, FlatList, TouchableOpacity, Dimensions } from "react-native";
import BottomNav from "../components/BottomNav";

const CARD_WIDTH = (Dimensions.get("window").width - 60) / 2; 
// (screen width - padding) / 2 columns

const matches = [
  {
    id: "1",
    name: "John Doe",
    age: 24,
    location: "Santa Clara, CA",
    hikes: 3,
    photo: "https://images.pexels.com/photos/1526404/pexels-photo-1526404.jpeg"
  },
  {
    id: "2",
    name: "John Doe",
    age: 24,
    location: "Santa Clara, CA",
    hikes: 3,
    photo: "https://images.pexels.com/photos/1526404/pexels-photo-1526404.jpeg"
  },
  {
    id: "3",
    name: "John Doe",
    age: 24,
    location: "Santa Clara, CA",
    hikes: 3,
    photo: "https://images.pexels.com/photos/1526404/pexels-photo-1526404.jpeg"
  },
  {
    id: "4",
    name: "John Doe",
    age: 24,
    location: "Santa Clara, CA",
    hikes: 3,
    photo: "https://images.pexels.com/photos/1526404/pexels-photo-1526404.jpeg"
  },
  {
    id: "5",
    name: "John Doe",
    age: 24,
    location: "Santa Clara, CA",
    hikes: 3,
    photo: "https://images.pexels.com/photos/1526404/pexels-photo-1526404.jpeg"
  },
  {
    id: "6",
    name: "John Doe",
    age: 24,
    location: "Santa Clara, CA",
    hikes: 3,
    photo: "https://images.pexels.com/photos/1526404/pexels-photo-1526404.jpeg"
  }
];

export default function MatchesScreen() {
  return (
    <View style={styles.screen}>

      {/* Status bar padding */}
      <View style={{ height: 50 }} />

      {/* Page Title */}
      <Text style={styles.title}>Your Matches</Text>

      {/* Grid of Matches */}
      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.card}>

            {/* Photo */}
            <View style={styles.photoContainer}>
              <Image
                source={{ uri: item.photo }}
                style={styles.photo}
                resizeMode="cover"
              />

              {/* Chat & Info buttons */}
              <View style={styles.bubbleWrapper}>
                <TouchableOpacity style={styles.chatBubble}>
                  <Text style={{ fontSize: 16 }}>💬</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.infoBubble}>
                  <Text style={styles.infoText}>i</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Bottom Info Section */}
            <View style={styles.infoSection}>
              <Text style={styles.name}>{item.name}, {item.age}</Text>
              <Text style={styles.location}>{item.location}</Text>
              <Text style={styles.hikes}>
                Hikes with you: <Text style={{ fontWeight: "700" }}>{item.hikes}</Text>
              </Text>
            </View>
          </View>
        )}
      />

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#4D5A29",
  },

  title: {
    color: "white",
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
    marginTop: -10,
  },

  gridContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },

  row: {
    justifyContent: "space-between",
    marginBottom: 20,
  },

  card: {
    width: CARD_WIDTH,
    backgroundColor: "#2C3520",
    borderRadius: 22,
    overflow: "hidden",
  },

  photoContainer: {
    height: 160,
    backgroundColor: "white",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: "hidden",
    position: "relative",
  },

  photo: {
    width: "100%",
    height: "100%",
  },

  bubbleWrapper: {
    position: "absolute",
    right: 10,
    bottom: -25,
    alignItems: "center",
  },

  chatBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E5EFD1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  infoBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#6E874F",
    alignItems: "center",
    justifyContent: "center",
  },

  infoText: {
    color: "white",
    fontWeight: "800",
    fontSize: 16,
  },

  infoSection: {
    padding: 12,
  },

  name: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
  },

  location: {
    color: "white",
    opacity: 0.75,
    marginTop: 2,
  },

  hikes: {
    color: "white",
    opacity: 0.9,
    marginTop: 6,
    fontSize: 14,
  },
});
