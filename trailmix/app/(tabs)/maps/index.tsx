import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Linking, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import { EmbeddedMap, EmbeddedMapRef } from '@/components/maps/EmbeddedMap';
import { AddressSearchBar } from '@/components/maps/AddressSearchBar';
import { MapControls } from '@/components/maps/MapControls';
import { LocationData, PlaceDetails } from '@/src/lib/locationService';
import { useAuth } from '@/hooks/use-auth';
import { getUserProfile, UserProfile } from '@/src/lib/userService';
import { LocationBottomSheet } from '@/components/maps/LocationBottomSheet';

import { theme } from "@/app/theme";

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
  const [searchedLocation, setSearchedLocation] = useState<{ latitude: number; longitude: number; address?: string; placeDetails?: PlaceDetails } | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showLocationSheet, setShowLocationSheet] = useState(false);

  // Get current user
  const { user } = useAuth();

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      if (user?.uid) {
        try {
          const profile = await getUserProfile(user.uid);
          if (profile) {
            setUserProfile(profile);
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
        }
      }
    };
    loadProfile();
  }, [user]);

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
    (location: { latitude: number; longitude: number; address?: string; placeDetails?: PlaceDetails }) => {
      // Set searched location (red pin) - don't change user location tracking
      setSearchedLocation({
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
        placeDetails: location.placeDetails,
      });
      // Don't update mapLocation - keep tracking user location
      // Don't set isManualLocation - allow user location to continue updating
    },
    []
  );

  // Handle my location button press
  const handleMyLocationPress = useCallback(async () => {
    // Don't clear searched location - keep the marker visible
    // Reset to tracking user location
    setIsManualLocation(false);
    const location = await getCurrentLocation();
    if (location) {
      setMapLocation(location);
      // Force center on user location when button is pressed
      // The map will handle not centering if there's a searched location
      if (mapRef.current) {
        mapRef.current.updateLocation(location.latitude, location.longitude, true);
      }
    }
  }, [getCurrentLocation]);

  // Handle address search clear
  const handleAddressClear = useCallback(() => {
    // Clear searched location pin
    setSearchedLocation(null);
    // Close bottom sheet if open
    setShowLocationSheet(false);
    // Don't reset isManualLocation - user might want to keep viewing a different area
  }, []);

  // Handle searched location marker click
  const handleSearchedLocationClick = useCallback(
    (location: { latitude: number; longitude: number; address?: string }) => {
      setShowLocationSheet(true);
    },
    []
  );

  // Handle opening location in maps app
  const handleOpenInMaps = useCallback(async () => {
    if (!searchedLocation) return;

    const { latitude, longitude, address } = searchedLocation;
    const label = address ? encodeURIComponent(address) : 'Location';

    let url = '';
    if (Platform.OS === 'ios') {
      // Apple Maps
      url = `maps://maps.apple.com/?q=${label}&ll=${latitude},${longitude}`;
    } else {
      // Android - Google Maps
      url = `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        // Fallback to web-based Google Maps
        const webUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        await Linking.openURL(webUrl);
      }
      setShowLocationSheet(false);
    } catch (error: any) {
      Alert.alert('Error', 'Could not open maps app: ' + (error?.message || String(error)));
    }
  }, [searchedLocation]);

  return (
    <View style={styles.container}>
      <EmbeddedMap
        ref={mapRef}
        location={mapLocation}
        searchedLocation={searchedLocation}
        userProfile={userProfile ? {
          uid: userProfile.uid,
          name: userProfile.name,
          username: userProfile.username,
          profilePicture: userProfile.profilePicture,
          totalHikes: userProfile.totalHikes,
          totalDistance: userProfile.totalDistance,
          achievements: userProfile.achievements,
          hikingLevel: userProfile.hikingLevel,
        } : null}
        onSearchedLocationClick={handleSearchedLocationClick}
        defaultLatitude={37.3496}
        defaultLongitude={-121.9390}
      />

      <AddressSearchBar
        onLocationSelect={handleLocationSelect}
        onClear={handleAddressClear}
        userLocation={currentLocation ? { latitude: currentLocation.latitude, longitude: currentLocation.longitude } : null}
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

      {/* Location bottom sheet */}
      {searchedLocation && (
        <LocationBottomSheet
          visible={showLocationSheet}
          location={searchedLocation}
          onClose={() => setShowLocationSheet(false)}
          onOpenInMaps={handleOpenInMaps}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.neutrallight.white, //was #F5F5F5
  },
  trackingIndicator: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    backgroundColor: theme.colors.secondary.light, //was #fff
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: theme.colors.secondary.dark, //was #000
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 997,
  },
  trackingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.support.success, //was #34a853
    marginRight: 8,
  },
  trackingText: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: theme.colors.secondary.dark, //was #5f6368
    fontWeight: '400',
  },
});
