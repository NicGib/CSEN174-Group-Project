import AsyncStorage from "@react-native-async-storage/async-storage";

export interface SavedMap {
  id: string;
  title: string;
  url?: string; // Optional for backward compatibility
  localFilePath?: string; // Local file path for offline maps
  lat: string;
  lng: string;
  zoom: string;
  style: string;
  radius: string;
  savedAt: string;
}

const STORAGE_KEY = "@trailmix_saved_maps";

export async function saveMap(map: Omit<SavedMap, "id" | "savedAt">): Promise<SavedMap> {
  const savedMaps = await getSavedMaps();
  const newMap: SavedMap = {
    ...map,
    id: Date.now().toString(),
    savedAt: new Date().toISOString(),
  };
  savedMaps.push(newMap);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(savedMaps));
  return newMap;
}

export async function getSavedMaps(): Promise<SavedMap[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading saved maps:", error);
    return [];
  }
}

export async function deleteSavedMap(id: string): Promise<void> {
  const savedMaps = await getSavedMaps();
  const mapToDelete = savedMaps.find((map) => map.id === id);
  
  // Delete local file if it exists
  if (mapToDelete?.localFilePath) {
    try {
      const FileSystem = require('expo-file-system');
      const fileInfo = await FileSystem.getInfoAsync(mapToDelete.localFilePath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(mapToDelete.localFilePath, { idempotent: true });
      }
    } catch (error) {
      console.error("Error deleting local map file:", error);
      // Continue with deletion even if file deletion fails
    }
  }
  
  const filtered = savedMaps.filter((map) => map.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export async function clearAllSavedMaps(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

