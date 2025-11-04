import AsyncStorage from "@react-native-async-storage/async-storage";

export interface SavedMap {
  id: string;
  title: string;
  url: string;
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
  const filtered = savedMaps.filter((map) => map.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export async function clearAllSavedMaps(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

