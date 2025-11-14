import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { saveMap, getSavedMaps, deleteSavedMap, SavedMap } from '@/src/lib/mapStorage';
import { buildMapUrl } from '@/src/utils/mapUtils';

interface MapBuilderFormState {
  lat: string;
  lng: string;
  zoom: string;
  style: string;
  title: string;
  radius: string;
}

interface UseMapBuilderReturn {
  formState: MapBuilderFormState;
  updateField: <K extends keyof MapBuilderFormState>(
    field: K,
    value: MapBuilderFormState[K]
  ) => void;
  buildUrl: () => string;
  openAndSaveMap: () => Promise<void>;
  savedMaps: SavedMap[];
  loadSavedMaps: () => Promise<void>;
  deleteMap: (id: string, title: string) => Promise<void>;
  refreshing: boolean;
  refreshMaps: () => Promise<void>;
}

const defaultFormState: MapBuilderFormState = {
  lat: '37.3496',
  lng: '-121.9390',
  zoom: '12',
  style: 'terrain',
  title: 'Hiking Trail Map',
  radius: '15',
};

/**
 * Custom hook for map builder functionality
 * Handles form state, URL building, and map storage operations
 */
export function useMapBuilder(): UseMapBuilderReturn {
  const [formState, setFormState] = useState<MapBuilderFormState>(defaultFormState);
  const [savedMaps, setSavedMaps] = useState<SavedMap[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const updateField = useCallback(
    <K extends keyof MapBuilderFormState>(field: K, value: MapBuilderFormState[K]) => {
      setFormState((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const buildUrl = useCallback(() => {
    return buildMapUrl(formState);
  }, [formState]);

  const loadSavedMaps = useCallback(async () => {
    try {
      const maps = await getSavedMaps();
      setSavedMaps(maps.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()));
    } catch (error: any) {
      console.error('Error loading saved maps:', error);
    }
  }, []);

  const openAndSaveMap = useCallback(async () => {
    const url = buildUrl();
    try {
      // Save the map before opening
      await saveMap({
        title: formState.title || 'Hiking Trail Map',
        url,
        lat: formState.lat,
        lng: formState.lng,
        zoom: formState.zoom,
        style: formState.style,
        radius: formState.radius,
      });
      await loadSavedMaps(); // Refresh the list
      await WebBrowser.openBrowserAsync(url);
    } catch (e: any) {
      Alert.alert('Could not open map', e?.message || String(e));
    }
  }, [buildUrl, formState, loadSavedMaps]);

  const deleteMap = useCallback(
    async (id: string, mapTitle: string) => {
      Alert.alert(
        'Delete Map',
        `Are you sure you want to delete "${mapTitle}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteSavedMap(id);
                await loadSavedMaps();
              } catch (error: any) {
                Alert.alert('Error', `Failed to delete map: ${error.message}`);
              }
            },
          },
        ]
      );
    },
    [loadSavedMaps]
  );

  const refreshMaps = useCallback(async () => {
    setRefreshing(true);
    await loadSavedMaps();
    setRefreshing(false);
  }, [loadSavedMaps]);

  return {
    formState,
    updateField,
    buildUrl,
    openAndSaveMap,
    savedMaps,
    loadSavedMaps,
    deleteMap,
    refreshing,
    refreshMaps,
  };
}

