import React from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, FlatList, RefreshControl, ActivityIndicator, StyleSheet, Animated, KeyboardAvoidingView, Platform, ScrollView, Keyboard } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { WebView } from "react-native-webview";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { useSharedValue, runOnJS } from "react-native-reanimated";
import { endpoints } from "../../../src/constants/api";
import { saveMap, getSavedMaps, deleteSavedMap, SavedMap } from "../../../src/lib/mapStorage";
import { locationService, LocationData } from "../../../src/lib/locationService";
import { MaterialIcons } from "@expo/vector-icons";

type MapViewType = "builder" | "embedded";

export default function MapsScreen() {
  const [viewType, setViewType] = React.useState<MapViewType>("embedded");
  const [lat, setLat] = React.useState("37.3496");
  const [lng, setLng] = React.useState("-121.9390");
  const [zoom, setZoom] = React.useState("12");
  const [style, setStyle] = React.useState("terrain");
  const [title, setTitle] = React.useState("Hiking Trail Map");
  const [radius, setRadius] = React.useState("15");
  const [savedMaps, setSavedMaps] = React.useState<SavedMap[]>([]);
  const [refreshing, setRefreshing] = React.useState(false);
  const [showSaved, setShowSaved] = React.useState(false);
  const [isGettingLocation, setIsGettingLocation] = React.useState(false);
  const [isTracking, setIsTracking] = React.useState(false);
  
  // Embedded map states
  const [currentLocation, setCurrentLocation] = React.useState<LocationData | null>(null);
  const [mapRegion, setMapRegion] = React.useState({
    latitude: 37.3496,
    longitude: -121.9390,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [addressInput, setAddressInput] = React.useState("");
  const [isGeocoding, setIsGeocoding] = React.useState(false);
  const [slideUpAnim] = React.useState(new Animated.Value(0));
  const [showAddressBar, setShowAddressBar] = React.useState(false);
  const [addressSuggestions, setAddressSuggestions] = React.useState<Array<{ displayName: string; latitude: number; longitude: number }>>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = React.useState(false);
  const [isManualLocation, setIsManualLocation] = React.useState(false); // Track if user manually selected location
  const [addressBarHeight, setAddressBarHeight] = React.useState(0.5); // 0 = collapsed, 1 = expanded
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = React.useState(false);
  const mapRef = React.useRef<any>(null);
  const mapInitializedRef = React.useRef(false);
  const animValueShared = useSharedValue(0);
  
  // Track animation value
  React.useEffect(() => {
    const listenerId = slideUpAnim.addListener(({ value }) => {
      animValueShared.value = value;
    });
    return () => {
      slideUpAnim.removeListener(listenerId);
    };
  }, [slideUpAnim, animValueShared]);

  // Listen to keyboard events
  React.useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setIsKeyboardVisible(true);
      }
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

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

  const startLocationTracking = React.useCallback(async () => {
    try {
      const hasPermission = await locationService.checkPermissions();
      if (!hasPermission) {
        const granted = await locationService.requestPermissions();
        if (!granted) {
          console.warn('Location permission not granted');
          return;
        }
      }
      
      const started = await locationService.startTracking({
        accuracy: 4, // Location.Accuracy.Balanced (4)
        timeInterval: 10000, // Update every 10 seconds
        distanceInterval: 50, // Update every 50 meters
      });
      
      if (started) {
        setIsTracking(true);
        // Get initial location
        const location = await locationService.getCurrentLocation();
        if (location) {
          setLat(location.latitude.toString());
          setLng(location.longitude.toString());
          setCurrentLocation(location);
          if (viewType === "embedded") {
            setMapRegion({
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  }, [viewType]);

  React.useEffect(() => {
    loadSavedMaps();
    // Start location tracking when component mounts
    startLocationTracking();
    
    // Cleanup: stop tracking when component unmounts
    return () => {
      locationService.stopTracking();
    };
  }, [loadSavedMaps, startLocationTracking]);

  // Update embedded map when location changes (only if not manual location)
  React.useEffect(() => {
    if (viewType === "embedded" && currentLocation && mapRef.current && !isManualLocation) {
      const mapLat = currentLocation.latitude;
      const mapLng = currentLocation.longitude;
      setMapRegion({
        latitude: mapLat,
        longitude: mapLng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      // Update WebView map location
      const updateScript = `window.updateLocation(${mapLat}, ${mapLng});`;
      (mapRef.current as any)?.injectJavaScript(updateScript);
    }
  }, [currentLocation, viewType, isManualLocation]);

  // Listen to location updates for embedded map (only if not manual location)
  React.useEffect(() => {
    if (viewType === "embedded" && isTracking && !isManualLocation) {
      const interval = setInterval(async () => {
        const location = locationService.getLastKnownLocation();
        if (location) {
          setCurrentLocation(location);
        }
      }, 2000); // Check every 2 seconds

      return () => clearInterval(interval);
    }
  }, [viewType, isTracking, isManualLocation]);

  const getCurrentLocation = React.useCallback(async () => {
    setIsGettingLocation(true);
    try {
      const location = await locationService.getCurrentLocation();
      if (location) {
        setLat(location.latitude.toString());
        setLng(location.longitude.toString());
        Alert.alert("Location Updated", `Lat: ${location.latitude.toFixed(6)}\nLng: ${location.longitude.toFixed(6)}`);
      } else {
        Alert.alert("Error", "Could not get current location. Please check permissions.");
      }
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to get location");
    } finally {
      setIsGettingLocation(false);
    }
  }, []);

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

  // Embedded map functions
  const toggleAddressBar = React.useCallback((show: boolean) => {
    setShowAddressBar(show);
    if (show) {
      setAddressBarHeight(1);
      // Start with suggestions hidden (will animate when they appear)
      slideUpAnim.setValue(0);
    } else {
      // Animate out when closing
      Animated.spring(slideUpAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start(() => {
        setAddressBarHeight(0);
        setAddressSuggestions([]);
        Keyboard.dismiss();
      });
    }
  }, [slideUpAnim]);

  // Animate suggestions sheet when suggestions appear
  React.useEffect(() => {
    if (showAddressBar && (addressSuggestions.length > 0 || isLoadingSuggestions)) {
      Animated.spring(slideUpAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else if (showAddressBar && addressSuggestions.length === 0 && !isLoadingSuggestions) {
      // Hide suggestions sheet when no suggestions
      Animated.spring(slideUpAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    }
  }, [showAddressBar, addressSuggestions.length, isLoadingSuggestions, slideUpAnim]);

  const handleGeocodeAddress = React.useCallback(async () => {
    if (!addressInput.trim()) {
      Alert.alert("Error", "Please enter an address");
      return;
    }

    setIsGeocoding(true);
    try {
      const coords = await locationService.geocodeAddress(addressInput.trim());
      if (coords) {
        setIsManualLocation(true); // Mark as manual selection
        const newRegion = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setMapRegion(newRegion);
        setCurrentLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
          timestamp: Date.now(),
        });
        // Update WebView map location
        if (mapRef.current) {
          const updateScript = `window.updateLocation(${coords.latitude}, ${coords.longitude});`;
          (mapRef.current as any)?.injectJavaScript(updateScript);
        }
        // Hide keyboard and address bar after successful geocoding
        Keyboard.dismiss();
        toggleAddressBar(false);
      } else {
        Alert.alert("Error", "Could not find the address. Please try a different address.");
      }
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to geocode address");
    } finally {
      setIsGeocoding(false);
    }
  }, [addressInput, toggleAddressBar]);

  const clearAddress = React.useCallback(() => {
    setAddressInput("");
    setAddressSuggestions([]);
    // Return to current location if tracking
    if (isTracking && currentLocation && mapRef.current) {
      const newRegion = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setMapRegion(newRegion);
      // Update WebView map location
      const updateScript = `window.updateLocation(${newRegion.latitude}, ${newRegion.longitude});`;
      (mapRef.current as any)?.injectJavaScript(updateScript);
    }
  }, [isTracking, currentLocation]);

  // Debounced address suggestions
  React.useEffect(() => {
    if (addressInput.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoadingSuggestions(true);
      try {
        const suggestions = await locationService.getAddressSuggestions(addressInput, 5);
        setAddressSuggestions(suggestions);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setAddressSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [addressInput]);

  const handleSelectSuggestion = React.useCallback(async (suggestion: { displayName: string; latitude: number; longitude: number }) => {
    setAddressInput(suggestion.displayName);
    setAddressSuggestions([]);
    setIsManualLocation(true); // Mark as manual selection
    
    const newRegion = {
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    setMapRegion(newRegion);
    setCurrentLocation({
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      timestamp: Date.now(),
    });
    
    // Update WebView map location
    if (mapRef.current) {
      const updateScript = `window.updateLocation(${suggestion.latitude}, ${suggestion.longitude});`;
      (mapRef.current as any)?.injectJavaScript(updateScript);
    }
    
    // Hide keyboard and address bar after selection
    Keyboard.dismiss();
    toggleAddressBar(false);
  }, [toggleAddressBar]);

  // Animation for suggestions sheet - slides up from bottom
  const slideUpTranslateY = slideUpAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0], // Reduced from 400 to 300 for better UX
  });

  // Helper function to update animation value and shared value
  const updateAnimationValue = React.useCallback((value: number) => {
    slideUpAnim.setValue(value);
    animValueShared.value = value;
  }, [slideUpAnim, animValueShared]);

  // Gesture handler for pull-up/pull-down (only for suggestions sheet)
  const panGesture = React.useMemo(() => Gesture.Pan()
    .onUpdate((event) => {
      if (showAddressBar && (addressSuggestions.length > 0 || isLoadingSuggestions)) {
        // Calculate new value based on drag (drag up = negative Y)
        const currentAnimValue = animValueShared.value;
        const dragAmount = -event.translationY / 400; // Normalize to 0-1 range
        const newValue = Math.max(0, Math.min(1, currentAnimValue + dragAmount));
        animValueShared.value = newValue;
        runOnJS(updateAnimationValue)(newValue);
      }
    })
    .onEnd((event) => {
      if (showAddressBar && (addressSuggestions.length > 0 || isLoadingSuggestions)) {
        const currentValue = animValueShared.value;
        // Determine if should snap to collapsed or expanded based on position and velocity
        const velocity = event.velocityY;
        const shouldExpand = currentValue > 0.5 || (currentValue > 0.3 && velocity < -300);
        
        runOnJS(() => {
          Animated.spring(slideUpAnim, {
            toValue: shouldExpand ? 1 : 0,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
          }).start(() => {
            setAddressBarHeight(shouldExpand ? 1 : 0);
            if (!shouldExpand) {
              // Don't close the address bar, just collapse suggestions
              setAddressSuggestions([]);
            }
          });
        })();
      }
    }), [showAddressBar, slideUpAnim, animValueShared, updateAnimationValue, addressSuggestions.length, isLoadingSuggestions]);

  // Generate HTML for embedded map using Leaflet (OpenStreetMap)
  const generateMapHTML = React.useCallback((lat: number, lng: number) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        body { margin: 0; padding: 0; }
        #map { width: 100%; height: 100vh; }
        .custom-marker {
            position: relative;
        }
    </style>
</head>
<body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        // Initialize map only once - disable default zoom controls
        if (!window.mapInstance) {
            window.mapInstance = L.map('map', {
                zoomControl: false
            }).setView([${lat}, ${lng}], 15);
            
            // Use CartoDB Positron for a cleaner, Google Maps-like appearance
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                attribution: '© OpenStreetMap contributors © CARTO',
                subdomains: 'abcd',
                maxZoom: 19
            }).addTo(window.mapInstance);
            
            // Create marker only once - Google Maps style red pin
            window.markerInstance = L.marker([${lat}, ${lng}], {
                icon: L.divIcon({
                    className: 'custom-marker',
                    html: '<div style="position: relative; width: 32px; height: 32px;"><div style="position: absolute; width: 20px; height: 20px; background-color: #ea4335; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); left: 6px; top: 0px;"></div><div style="position: absolute; width: 8px; height: 8px; background-color: white; border-radius: 50%; left: 12px; top: 6px; transform: rotate(45deg);"></div><div style="position: absolute; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 10px solid #ea4335; left: 10px; top: 18px; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.2));"></div></div>',
                    iconSize: [32, 32],
                    iconAnchor: [16, 28]
                })
            }).addTo(window.mapInstance);
            
            window.markerInstance.bindPopup('Your Location<br>Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}');
        } else {
            // If map already exists, just update view and marker position
            window.mapInstance.setView([${lat}, ${lng}], window.mapInstance.getZoom());
            if (window.markerInstance) {
                window.markerInstance.setLatLng([${lat}, ${lng}]);
                window.markerInstance.bindPopup('Your Location<br>Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}');
            }
        }
        
        // Listen for location updates from React Native
        window.updateLocation = function(newLat, newLng) {
            if (window.mapInstance && window.markerInstance) {
                window.mapInstance.setView([newLat, newLng], window.mapInstance.getZoom());
                window.markerInstance.setLatLng([newLat, newLng]);
                window.markerInstance.bindPopup('Your Location<br>Lat: ' + newLat.toFixed(6) + '<br>Lng: ' + newLng.toFixed(6));
            }
        };
    </script>
</body>
</html>
    `;
  }, []);

  const renderEmbeddedMap = () => {
    const mapLat = currentLocation?.latitude ?? mapRegion.latitude;
    const mapLng = currentLocation?.longitude ?? mapRegion.longitude;
    
    // Generate HTML - WebView will reuse the map instance via window.mapInstance
    const mapHTML = generateMapHTML(mapLat, mapLng);

    return (
      <View style={{ flex: 1 }}>
        <WebView
          key="map-webview" // Stable key to prevent recreation
          ref={mapRef}
          style={{ flex: 1 }}
          source={{ html: mapHTML }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          onMessage={(event) => {
            // Handle messages from WebView if needed
          }}
          onLoadEnd={() => {
            // Ensure map is updated after WebView loads
            if (currentLocation && mapRef.current && !isManualLocation) {
              const updateScript = `window.updateLocation(${currentLocation.latitude}, ${currentLocation.longitude});`;
              (mapRef.current as any)?.injectJavaScript(updateScript);
            }
          }}
        />

      {/* Google Maps style search bar */}
      {!showAddressBar && (
        <TouchableOpacity
          style={styles.googleSearchBar}
          onPress={() => toggleAddressBar(true)}
          activeOpacity={0.8}
        >
          <MaterialIcons name="search" size={20} color="#5f6368" />
          <Text style={styles.googleSearchBarText}>Search</Text>
        </TouchableOpacity>
      )}

      {/* Expanded search bar */}
      {showAddressBar && (
        <Animated.View
          style={[
            styles.googleSearchBarExpanded,
            {
              transform: [{ translateY: 0 }],
            },
          ]}
        >
          <View style={styles.googleSearchBarContent}>
            <MaterialIcons name="search" size={20} color="#5f6368" style={{ marginRight: 12 }} />
            <TextInput
              style={styles.googleSearchInput}
              placeholder="Search"
              placeholderTextColor="#9aa0a6"
              value={addressInput}
              onChangeText={setAddressInput}
              onSubmitEditing={handleGeocodeAddress}
              returnKeyType="search"
              autoFocus={true}
            />
            {addressInput.length > 0 && (
              <TouchableOpacity
                onPress={clearAddress}
                style={styles.googleClearButton}
              >
                <MaterialIcons name="close" size={18} color="#5f6368" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => {
                toggleAddressBar(false);
                setAddressSuggestions([]);
                Keyboard.dismiss();
              }}
              style={styles.googleBackButton}
            >
              <MaterialIcons name="arrow-back" size={20} color="#5f6368" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Google Maps style suggestions list */}
      {showAddressBar && (addressSuggestions.length > 0 || isLoadingSuggestions) && (
        <Animated.View
          style={[
            styles.googleSuggestionsSheet,
            {
              top: Platform.OS === "ios" ? 120 : 100,
              bottom: Math.max(keyboardHeight, 0),
            },
          ]}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={styles.googleSuggestionsScrollView}
            contentContainerStyle={styles.googleSuggestionsContent}
            nestedScrollEnabled={true}
          >
            {isLoadingSuggestions && (
              <View style={styles.googleSuggestionItem}>
                <ActivityIndicator size="small" color="#4285f4" />
                <Text style={styles.googleSuggestionText}>Searching...</Text>
              </View>
            )}
            {addressSuggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.googleSuggestionItem}
                onPress={() => handleSelectSuggestion(suggestion)}
                activeOpacity={0.7}
              >
                <View style={styles.googleSuggestionIcon}>
                  <MaterialIcons name="place" size={24} color="#5f6368" />
                </View>
                <View style={styles.googleSuggestionTextContainer}>
                  <Text style={styles.googleSuggestionTitle} numberOfLines={1}>
                    {suggestion.displayName.split(',')[0]}
                  </Text>
                  {suggestion.displayName.includes(',') && (
                    <Text style={styles.googleSuggestionSubtitle} numberOfLines={1}>
                      {suggestion.displayName.split(',').slice(1).join(',').trim()}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {/* Map controls - Google Maps style */}
      <View style={styles.mapControls}>
        {/* Zoom controls */}
        <View style={styles.zoomControls}>
          <TouchableOpacity
            style={styles.zoomButton}
            onPress={() => {
              if (mapRef.current) {
                const zoomScript = `if (window.mapInstance) { window.mapInstance.zoomIn(); }`;
                (mapRef.current as any)?.injectJavaScript(zoomScript);
              }
            }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="add" size={24} color="#5f6368" />
          </TouchableOpacity>
          <View style={styles.zoomDivider} />
          <TouchableOpacity
            style={styles.zoomButton}
            onPress={() => {
              if (mapRef.current) {
                const zoomScript = `if (window.mapInstance) { window.mapInstance.zoomOut(); }`;
                (mapRef.current as any)?.injectJavaScript(zoomScript);
              }
            }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="remove" size={24} color="#5f6368" />
          </TouchableOpacity>
        </View>

        {/* My location button */}
        <TouchableOpacity
          style={styles.myLocationButton}
          onPress={async () => {
            setIsManualLocation(false);
            const location = await locationService.getCurrentLocation();
            if (location) {
              setCurrentLocation(location);
              setMapRegion({
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              });
              if (mapRef.current) {
                const updateScript = `window.updateLocation(${location.latitude}, ${location.longitude});`;
                (mapRef.current as any)?.injectJavaScript(updateScript);
              }
            }
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="my-location" size={24} color="#4285f4" />
        </TouchableOpacity>

        {/* Download button */}
        {viewType === "embedded" && (
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={() => setViewType("builder")}
            activeOpacity={0.7}
          >
            <MaterialIcons name="download" size={20} color="#5f6368" />
          </TouchableOpacity>
        )}
      </View>

      {/* Location tracking indicator - Google Maps style */}
      {isTracking && (
        <View style={styles.googleTrackingIndicator}>
          <View style={styles.googleTrackingDot} />
          <Text style={styles.googleTrackingText}>Location sharing on</Text>
        </View>
      )}
    </View>
  );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      {/* Header - hidden in embedded mode for full-screen Google Maps experience */}
      {viewType !== "embedded" && (
        <View style={{ 
          flexDirection: "row", 
          justifyContent: "space-between", 
          alignItems: "center",
          padding: 20,
          paddingTop: 60,
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: '#E0E0E0',
        }}>
          <Text style={{ fontSize: 20, fontWeight: "bold", color: '#333' }}>Maps</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              onPress={() => setViewType("embedded")}
              style={{ 
                paddingHorizontal: 12, 
                paddingVertical: 6, 
                backgroundColor: "#4285f4", 
                borderRadius: 8 
              }}
            >
              <Text style={{ color: "white", fontWeight: "600" }}>Live Map</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setViewType("builder")}
              style={{ 
                paddingHorizontal: 12, 
                paddingVertical: 6, 
                backgroundColor: "#e8eaed", 
                borderRadius: 8 
              }}
            >
              <Text style={{ color: "#5f6368", fontWeight: "600" }}>Builder</Text>
            </TouchableOpacity>
            {viewType === "builder" && (
              <TouchableOpacity
                onPress={() => setShowSaved(!showSaved)}
                style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: showSaved ? "#4285f4" : "#e8eaed", borderRadius: 8 }}
              >
                <Text style={{ color: showSaved ? "white" : "#5f6368", fontWeight: "600" }}>{showSaved ? "New Map" : `Saved (${savedMaps.length})`}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {viewType === "embedded" ? renderEmbeddedMap() : null}
      
      {viewType === "builder" && !showSaved ? (
        <View style={{ padding: 16, gap: 8 }}>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <TextInput placeholder="Lat" value={lat} onChangeText={setLat} keyboardType="numeric" style={{ flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 8 }} />
              <TextInput placeholder="Lng" value={lng} onChangeText={setLng} keyboardType="numeric" style={{ flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 8 }} />
              <TouchableOpacity
                onPress={getCurrentLocation}
                disabled={isGettingLocation}
                style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: isGettingLocation ? "#ccc" : "#4CAF50", borderRadius: 8, minWidth: 80, alignItems: "center" }}
              >
                {isGettingLocation ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: "white", fontWeight: "600", fontSize: 12 }}>📍 Current</Text>
                )}
              </TouchableOpacity>
            </View>
            {isTracking && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#4CAF50" }} />
                <Text style={{ fontSize: 12, color: "#4CAF50" }}>Location tracking active</Text>
              </View>
            )}
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
        </View>
      ) : null}
      
      {viewType === "builder" && showSaved ? (
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

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  // Google Maps style search bar
  googleSearchBar: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 40,
    left: 16,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 1000,
  },
  googleSearchBarText: {
    marginLeft: 12,
    fontSize: 15,
    color: "#5f6368",
    flex: 1,
  },
  googleSearchBarExpanded: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 40,
    left: 16,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 1000,
  },
  googleSearchBarContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  googleSearchInput: {
    flex: 1,
    fontSize: 15,
    color: "#202124",
    padding: 0,
    margin: 0,
  },
  googleClearButton: {
    padding: 4,
    marginLeft: 8,
  },
  googleBackButton: {
    padding: 4,
    marginLeft: 8,
  },
  // Google Maps style suggestions
  googleSuggestionsSheet: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 999,
    maxHeight: 400,
  },
  googleSuggestionsScrollView: {
    maxHeight: 400,
  },
  googleSuggestionsContent: {
    paddingVertical: 8,
  },
  googleSuggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f4",
  },
  googleSuggestionIcon: {
    marginRight: 16,
  },
  googleSuggestionTextContainer: {
    flex: 1,
  },
  googleSuggestionTitle: {
    fontSize: 15,
    color: "#202124",
    fontWeight: "400",
    marginBottom: 2,
  },
  googleSuggestionSubtitle: {
    fontSize: 13,
    color: "#5f6368",
  },
  googleSuggestionText: {
    fontSize: 15,
    color: "#5f6368",
    marginLeft: 12,
  },
  // Map controls
  mapControls: {
    position: "absolute",
    right: 16,
    bottom: 100,
    zIndex: 998,
  },
  zoomControls: {
    backgroundColor: "#fff",
    borderRadius: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
    marginBottom: 12,
  },
  zoomButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  zoomDivider: {
    height: 1,
    backgroundColor: "#e8eaed",
  },
  myLocationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 12,
  },
  downloadButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  // Tracking indicator
  googleTrackingIndicator: {
    position: "absolute",
    bottom: 20,
    left: 16,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 997,
  },
  googleTrackingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#34a853",
    marginRight: 8,
  },
  googleTrackingText: {
    fontSize: 13,
    color: "#5f6368",
    fontWeight: "400",
  },
});