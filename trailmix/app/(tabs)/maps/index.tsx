import React from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { endpoints } from "../../../src/constants/api";

export default function MapsScreen() {
  const [lat, setLat] = React.useState("37.3496");
  const [lng, setLng] = React.useState("-121.9390");
  const [zoom, setZoom] = React.useState("12");
  const [style, setStyle] = React.useState("terrain");
  const [title, setTitle] = React.useState("Hiking Trail Map");
  const [radius, setRadius] = React.useState("15");
  const buildUrl = React.useCallback(() => {
    return `${endpoints.maps}?lat=${lat}&lng=${lng}&zoom=${zoom}&style=${encodeURIComponent(style)}&title=${encodeURIComponent(title)}&radius=${radius}`;
  }, [lat, lng, zoom, style, title, radius]);

  const openMap = React.useCallback(async () => {
    const url = buildUrl();
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (e: any) {
      Alert.alert("Could not open map", e?.message || String(e));
    }
  }, [buildUrl]);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: "#eee" }}>
        <Text style={{ fontSize: 20, fontWeight: "700" }}>Map</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput placeholder="Lat" value={lat} onChangeText={setLat} keyboardType="numeric" style={{ flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 8 }} />
          <TextInput placeholder="Lng" value={lng} onChangeText={setLng} keyboardType="numeric" style={{ flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 8 }} />
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput placeholder="Zoom" value={zoom} onChangeText={setZoom} keyboardType="number-pad" style={{ flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 8 }} />
          <TextInput placeholder="Radius km" value={radius} onChangeText={setRadius} keyboardType="numeric" style={{ flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 8 }} />
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput placeholder="Style (terrain|satellite|streets)" value={style} onChangeText={setStyle} style={{ flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 8 }} />
          <TextInput placeholder="Title" value={title} onChangeText={setTitle} style={{ flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 8 }} />
        </View>
        <TouchableOpacity onPress={openMap} style={{ alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#2d6cdf", borderRadius: 8 }}>
          <Text style={{ color: "white", fontWeight: "600" }}>Open Map</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
        <Text style={{ textAlign: "center", color: "#555" }}>
          Tap "Open Map" to view the generated map in your browser.
        </Text>
      </View>
    </View>
  );
}


