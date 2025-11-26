import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

const MAPS_DIRECTORY = `${FileSystem.documentDirectory}maps/`;

/**
 * Ensures the maps directory exists
 */
async function ensureMapsDirectory(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(MAPS_DIRECTORY);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(MAPS_DIRECTORY, { intermediates: true });
  }
}

/**
 * Downloads HTML from a URL and saves it locally
 * @param url The URL to download the HTML from
 * @param filename The filename to save the HTML as (without extension)
 * @returns The local file path
 */
export async function downloadAndSaveMap(url: string, filename: string): Promise<string> {
  try {
    await ensureMapsDirectory();
    
    // Sanitize filename
    const sanitizedFilename = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filePath = `${MAPS_DIRECTORY}${sanitizedFilename}_${Date.now()}.html`;
    
    // Download the HTML content
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download map: ${response.status} ${response.statusText}`);
    }
    
    const htmlContent = await response.text();
    
    // Save to local file
    await FileSystem.writeAsStringAsync(filePath, htmlContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    
    return filePath;
  } catch (error) {
    console.error('Error downloading and saving map:', error);
    throw error;
  }
}

/**
 * Gets the local file URI for opening in a WebView or browser
 * @param filePath The local file path
 * @returns The URI that can be used to open the file
 */
export function getLocalFileUri(filePath: string): string {
  // Ensure file:// protocol is used for local files
  // expo-file-system paths already include file:// on some platforms
  if (filePath.startsWith('file://')) {
    return filePath;
  }
  // Add file:// protocol if not present
  return `file://${filePath}`;
}

/**
 * Reads the HTML content from a local file
 * Useful for loading into WebView with source={{ html: content }}
 * @param filePath The local file path
 * @returns The HTML content as a string
 */
export async function readMapFileContent(filePath: string): Promise<string> {
  try {
    const content = await FileSystem.readAsStringAsync(filePath, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return content;
  } catch (error) {
    console.error('Error reading map file:', error);
    throw error;
  }
}

