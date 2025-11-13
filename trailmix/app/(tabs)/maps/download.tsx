import React, { useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, FlatList, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import { useMapBuilder } from '@/hooks/useMapBuilder';
import { SavedMap } from '@/src/lib/mapStorage';

/**
 * Download/Builder Screen
 * Handles map builder form and saved maps management
 * Single Responsibility: Map builder form and saved maps
 */
export default function DownloadScreen() {
  const router = useRouter();
  const [showSaved, setShowSaved] = React.useState(false);
  const [isGettingLocation, setIsGettingLocation] = React.useState(false);

  // Use location tracking hook
  const { getCurrentLocation } = useLocationTracking({
    autoStart: true,
    trackingOptions: {
      accuracy: 4,
      timeInterval: 10000,
      distanceInterval: 50,
    },
  });

  // Use map builder hook
  const {
    formState,
    updateField,
    openAndSaveMap,
    savedMaps,
    loadSavedMaps,
    deleteMap,
    refreshing,
    refreshMaps,
  } = useMapBuilder();

  // Load saved maps on mount
  useEffect(() => {
    loadSavedMaps();
  }, [loadSavedMaps]);

  const handleGetCurrentLocation = React.useCallback(async () => {
    setIsGettingLocation(true);
    try {
      const location = await getCurrentLocation();
      if (location) {
        updateField('lat', location.latitude.toString());
        updateField('lng', location.longitude.toString());
        Alert.alert('Location Updated', `Lat: ${location.latitude.toFixed(6)}\nLng: ${location.longitude.toFixed(6)}`);
      } else {
        Alert.alert('Error', 'Could not get current location. Please check permissions.');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to get location');
    } finally {
      setIsGettingLocation(false);
    }
  }, [getCurrentLocation, updateField]);

  const openSavedMap = React.useCallback(async (map: SavedMap) => {
    try {
      await WebBrowser.openBrowserAsync(map.url);
    } catch (e: any) {
      Alert.alert('Could not open map', e?.message || String(e));
    }
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Download Maps</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerButton}
          >
            <Text style={styles.headerButtonText}>Live Map</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowSaved(!showSaved)}
            style={[styles.headerButton, showSaved && styles.headerButtonActive]}
          >
            <Text style={[styles.headerButtonText, showSaved && styles.headerButtonTextActive]}>
              {showSaved ? 'New Map' : `Saved (${savedMaps.length})`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {!showSaved ? (
        <View style={styles.formContainer}>
          <View style={styles.formRow}>
            <TextInput
              placeholder="Lat"
              value={formState.lat}
              onChangeText={(value) => updateField('lat', value)}
              keyboardType="numeric"
              style={styles.input}
            />
            <TextInput
              placeholder="Lng"
              value={formState.lng}
              onChangeText={(value) => updateField('lng', value)}
              keyboardType="numeric"
              style={styles.input}
            />
            <TouchableOpacity
              onPress={handleGetCurrentLocation}
              disabled={isGettingLocation}
              style={[styles.currentLocationButton, isGettingLocation && styles.currentLocationButtonDisabled]}
            >
              {isGettingLocation ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.currentLocationButtonText}>📍 Current</Text>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.formRow}>
            <TextInput
              placeholder="Zoom"
              value={formState.zoom}
              onChangeText={(value) => updateField('zoom', value)}
              keyboardType="number-pad"
              style={styles.input}
            />
            <TextInput
              placeholder="Radius km"
              value={formState.radius}
              onChangeText={(value) => updateField('radius', value)}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>
          <View style={styles.formRow}>
            <TextInput
              placeholder="Style (terrain|satellite|streets)"
              value={formState.style}
              onChangeText={(value) => updateField('style', value)}
              style={styles.input}
            />
            <TextInput
              placeholder="Title"
              value={formState.title}
              onChangeText={(value) => updateField('title', value)}
              style={styles.input}
            />
          </View>
          <TouchableOpacity onPress={openAndSaveMap} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Open & Save Map</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {savedMaps.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No saved maps yet. Create a map and it will be saved automatically.
              </Text>
            </View>
          ) : (
            <FlatList
              data={savedMaps}
              keyExtractor={(item) => item.id}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshMaps} />}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <View style={styles.mapCard}>
                  <Text style={styles.mapCardTitle}>{item.title}</Text>
                  <Text style={styles.mapCardDetails}>
                    {item.lat}, {item.lng} • Zoom: {item.zoom} • Style: {item.style} • Radius: {item.radius}km
                  </Text>
                  <Text style={styles.mapCardDate}>
                    Saved: {new Date(item.savedAt).toLocaleDateString()} {new Date(item.savedAt).toLocaleTimeString()}
                  </Text>
                  <View style={styles.mapCardActions}>
                    <TouchableOpacity
                      onPress={() => openSavedMap(item)}
                      style={styles.mapCardButton}
                    >
                      <Text style={styles.mapCardButtonText}>Open</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => deleteMap(item.id, item.title)}
                      style={[styles.mapCardButton, styles.mapCardButtonDelete]}
                    >
                      <Text style={styles.mapCardButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#4285f4',
    borderRadius: 8,
  },
  headerButtonActive: {
    backgroundColor: '#4285f4',
  },
  headerButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  headerButtonTextActive: {
    color: 'white',
  },
  formContainer: {
    padding: 16,
    gap: 8,
  },
  formRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 8,
  },
  currentLocationButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  currentLocationButtonDisabled: {
    backgroundColor: '#ccc',
  },
  currentLocationButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  saveButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#2d6cdf',
    borderRadius: 8,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  emptyStateText: {
    textAlign: 'center',
    color: '#555',
  },
  listContent: {
    padding: 12,
  },
  mapCard: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  mapCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  mapCardDetails: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  mapCardDate: {
    fontSize: 11,
    color: '#999',
    marginBottom: 8,
  },
  mapCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  mapCardButton: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#2d6cdf',
    borderRadius: 8,
  },
  mapCardButtonDelete: {
    backgroundColor: '#b00020',
  },
  mapCardButtonText: {
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
  },
});
