import React from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, FlatList, RefreshControl } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { endpoints } from "../../../src/constants/api";
import { saveMap, getSavedMaps, deleteSavedMap, SavedMap } from "../../../src/lib/mapStorage";

export default function MapsScreen() {
  const [lat, setLat] = React.useState("37.3496");
  const [lng, setLng] = React.useState("-121.9390");
  const [zoom, setZoom] = React.useState("12");
  const [style, setStyle] = React.useState("terrain");
  const [title, setTitle] = React.useState("Hiking Trail Map");
  const [radius, setRadius] = React.useState("15");
  const [savedMaps, setSavedMaps] = React.useState<SavedMap[]>([]);
  const [refreshing, setRefreshing] = React.useState(false);
  const [showSaved, setShowSaved] = React.useState(false);

  const buildUrl = React.useCallback(() => {
    return `${endpoints.maps}?lat=${lat}&lng=${lng}&zoom=${zoom}&style=${encodeURIComponent(style)}&title=${encodeURIComponent(title)}&radius=${radius}`;
  }, [lat, lng, zoom, style, title, radius]);

  const loadSavedMaps = React.useCallback(async () => {
    try {
      const maps = await getSavedMaps();
      setSavedMaps(maps.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()));
    } catch (error: any) {
      console.error("Error loading saved maps:", error);
    }
  }, []);

  React.useEffect(() => {
    loadSavedMaps();
  }, [loadSavedMaps]);

  const openMap = React.useCallback(async () => {
    const url = buildUrl();
    try {
      // Save the map before opening
      await saveMap({
        title: title || "Hiking Trail Map",
        url,
        lat,
        lng,
        zoom,
        style,
        radius,
      });
      await loadSavedMaps(); // Refresh the list
      await WebBrowser.openBrowserAsync(url);
    } catch (e: any) {
      Alert.alert("Could not open map", e?.message || String(e));
    }
  }, [buildUrl, title, lat, lng, zoom, style, radius, loadSavedMaps]);

  const openSavedMap = React.useCallback(async (map: SavedMap) => {
    try {
      await WebBrowser.openBrowserAsync(map.url);
    } catch (e: any) {
      Alert.alert("Could not open map", e?.message || String(e));
    }
  }, []);

  const handleDelete = React.useCallback(async (id: string, mapTitle: string) => {
    Alert.alert(
      "Delete Map",
      `Are you sure you want to delete "${mapTitle}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteSavedMap(id);
              await loadSavedMaps();
            } catch (error: any) {
              Alert.alert("Error", `Failed to delete map: ${error.message}`);
            }
          },
        },
      ]
    );
  }, [loadSavedMaps]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadSavedMaps();
    setRefreshing(false);
  }, [loadSavedMaps]);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: "#eee" }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 20, fontWeight: "700" }}>Map</Text>
          <TouchableOpacity
            onPress={() => setShowSaved(!showSaved)}
            style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: showSaved ? "#2d6cdf" : "#ccc", borderRadius: 8 }}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>{showSaved ? "New Map" : `Saved (${savedMaps.length})`}</Text>
          </TouchableOpacity>
        </View>
        
        {!showSaved ? (
          <>
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
              <Text style={{ color: "white", fontWeight: "600" }}>Open & Save Map</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>
      
      {showSaved ? (
        <View style={{ flex: 1 }}>
          {savedMaps.length === 0 ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
              <Text style={{ textAlign: "center", color: "#555" }}>
                No saved maps yet. Create a map and it will be saved automatically.
              </Text>
            </View>
          ) : (
            <FlatList
              data={savedMaps}
              keyExtractor={(item) => item.id}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              contentContainerStyle={{ padding: 12 }}
              renderItem={({ item }) => (
                <View style={{ padding: 12, borderWidth: 1, borderColor: "#ddd", borderRadius: 10, marginBottom: 10, backgroundColor: "#fff" }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", marginBottom: 4 }}>{item.title}</Text>
                  <Text style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
                    {item.lat}, {item.lng} • Zoom: {item.zoom} • Style: {item.style} • Radius: {item.radius}km
                  </Text>
                  <Text style={{ fontSize: 11, color: "#999", marginBottom: 8 }}>
                    Saved: {new Date(item.savedAt).toLocaleDateString()} {new Date(item.savedAt).toLocaleTimeString()}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => openSavedMap(item)}
                      style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#2d6cdf", borderRadius: 8 }}
                    >
                      <Text style={{ color: "white", fontWeight: "600", textAlign: "center" }}>Open</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(item.id, item.title)}
                      style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#b00020", borderRadius: 8 }}
                    >
                      <Text style={{ color: "white", fontWeight: "600", textAlign: "center" }}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      ) : null}
    </View>
  );
}


