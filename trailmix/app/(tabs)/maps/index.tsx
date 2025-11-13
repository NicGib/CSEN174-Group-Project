import React, { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import { EmbeddedMap, EmbeddedMapRef } from '@/components/maps/EmbeddedMap';
import { AddressSearchBar } from '@/components/maps/AddressSearchBar';
import { MapControls } from '@/components/maps/MapControls';
import { LocationData } from '@/src/lib/locationService';

/**
 * Live Map Screen
 * Displays an embedded map with location tracking, address search, and map controls
 * Single Responsibility: Orchestrating the live map view
 */
export default function MapsScreen() {
  const router = useRouter();
  const mapRef = useRef<EmbeddedMapRef>(null);
  const [isManualLocation, setIsManualLocation] = useState(false);
  const [mapLocation, setMapLocation] = useState<LocationData | null>(null);

  // Use location tracking hook
  const { isTracking, currentLocation, getCurrentLocation } = useLocationTracking({
    autoStart: true,
    trackingOptions: {
      accuracy: 4, // Location.Accuracy.Balanced
      timeInterval: 10000,
      distanceInterval: 50,
    },
    updateInterval: 2000,
  });

  // Update map location when current location changes (only if not manual)
  React.useEffect(() => {
    if (currentLocation && !isManualLocation) {
      setMapLocation(currentLocation);
    }
  }, [currentLocation, isManualLocation]);

  // Handle address search location selection
  const handleLocationSelect = useCallback(
    (location: { latitude: number; longitude: number }) => {
      setIsManualLocation(true);
      setMapLocation({
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: Date.now(),
      });
    },
    []
  );

  // Handle my location button press
  const handleMyLocationPress = useCallback(async () => {
    setIsManualLocation(false);
    const location = await getCurrentLocation();
    if (location) {
      setMapLocation(location);
    }
  }, [getCurrentLocation]);

  // Handle address search clear
  const handleAddressClear = useCallback(() => {
    setIsManualLocation(false);
    if (currentLocation) {
      setMapLocation(currentLocation);
    }
  }, [currentLocation]);

  return (
    <View style={styles.container}>
      <EmbeddedMap
        ref={mapRef}
        location={mapLocation}
        defaultLatitude={37.3496}
        defaultLongitude={-121.9390}
      />

      <AddressSearchBar
        onLocationSelect={handleLocationSelect}
        onClear={handleAddressClear}
      />

      <MapControls
        mapRef={mapRef}
        onMyLocationPress={handleMyLocationPress}
        onDownloadPress={() => router.push('/(tabs)/maps/download')}
      />

      {/* Location tracking indicator */}
      {isTracking && (
        <View style={styles.trackingIndicator}>
          <View style={styles.trackingDot} />
          <Text style={styles.trackingText}>Location sharing on</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  trackingIndicator: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 997,
  },
  trackingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34a853',
    marginRight: 8,
  },
  trackingText: {
    fontSize: 13,
    color: '#5f6368',
    fontWeight: '400',
  },
});
