import * as ImagePicker from 'expo-image-picker';
import { auth } from '@/src/lib/firebase';
import { Platform } from 'react-native';
import { endpoints, getApiBaseUrl } from '@/src/constants/api';

// Use MediaType.IMAGE (MediaTypeOptions is deprecated)
// Access MediaType through the ImagePicker namespace
// Use array format as recommended by the API
const IMAGE_MEDIA_TYPE = [(ImagePicker as any).MediaType?.IMAGE ?? 'images'];

/**
 * Request camera permission
 */
export async function requestCameraPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === 'granted';
}

/**
 * Request media library permission
 */
export async function requestMediaLibraryPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

/**
 * Request camera and media library permissions (for backwards compatibility)
 */
export async function requestImagePermissions(): Promise<boolean> {
  const cameraStatus = await requestCameraPermission();
  const libraryStatus = await requestMediaLibraryPermission();
  return cameraStatus && libraryStatus;
}

/**
 * Pick an image from the device's photo library
 */
export async function pickImageFromLibrary(): Promise<string | null> {
  try {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) {
      throw new Error('Photo library permission is required');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: IMAGE_MEDIA_TYPE,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      return result.assets[0].uri;
    }
    return null;
  } catch (error: any) {
    console.error('Error picking image from library:', error);
    throw error;
  }
}

/**
 * Take a photo using the device's camera
 */
export async function takePhoto(): Promise<string | null> {
  try {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      throw new Error('Camera permission is required');
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: IMAGE_MEDIA_TYPE,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      return result.assets[0].uri;
    }
    return null;
  } catch (error: any) {
    console.error('Error taking photo:', error);
    throw error;
  }
}

/**
 * Upload an image to the backend API and return the download URL
 */
export async function uploadImageToStorage(imageUri: string, path: string): Promise<string> {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to upload images');
    }

    // Create FormData for multipart/form-data upload
    // In React Native/Expo, FormData accepts objects with uri, type, and name
    const formData = new FormData();
    
    // Determine filename from path or use default
    const filename = path.split('/').pop() || 'profile.jpg';
    
    // Normalize the URI for React Native
    let normalizedUri = imageUri;
    if (Platform.OS === 'android' && !normalizedUri.startsWith('file://') && !normalizedUri.startsWith('http')) {
      normalizedUri = `file://${normalizedUri}`;
    }
    
    // For web, we need to fetch and convert to blob
    if (Platform.OS === 'web') {
      const response = await fetch(normalizedUri);
      if (!response.ok) {
        throw new Error(`Failed to read image file: ${response.statusText}`);
      }
      const blob = await response.blob();
      formData.append('file', blob as any, filename);
    } else {
      // For React Native/Expo, use the URI directly
      // expo-image-picker returns URIs that work directly with FormData
      formData.append('file', {
        uri: normalizedUri,
        type: 'image/jpeg',
        name: filename,
      } as any);
    }

    // Upload to backend API
    const uploadResponse = await fetch(`${endpoints.uploads}/profile-picture`, {
      method: 'POST',
      headers: {
        'X-User-UID': user.uid,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json().catch(() => ({ detail: uploadResponse.statusText }));
      throw new Error(errorData.detail || `Upload failed: ${uploadResponse.statusText}`);
    }

    const result = await uploadResponse.json();
    
    // Construct the full URL
    // result.url is like "/api/v1/uploads/profile-pictures/{user_uid}/{filename}"
    // getApiBaseUrl() returns something like "http://localhost:8000/api/v1"
    // So we can just prepend the base URL, but result.url already has /api/v1
    // So we need to extract just the origin + port from the base URL
    const baseUrl = getApiBaseUrl(); // e.g., "http://localhost:8000/api/v1"
    
    // If result.url is already a full URL, use it directly
    if (result.url.startsWith('http://') || result.url.startsWith('https://')) {
      return result.url;
    }
    
    // Extract origin from base URL (remove /api/v1)
    const origin = baseUrl.replace(/\/api\/v1.*$/, '');
    
    // result.url already starts with /api/v1, so just prepend origin
    return `${origin}${result.url}`;
  } catch (error: any) {
    console.error('Error uploading image:', error);
    console.error('Error details:', {
      message: error.message,
      imageUri,
    });
    
    // Provide helpful error messages
    if (error.message?.includes('Failed to read image file')) {
      throw new Error('Failed to read the selected image. Please try selecting a different image.');
    } else if (error.message?.includes('User must be authenticated')) {
      throw new Error('You must be logged in to upload images.');
    } else {
      throw new Error(error.message || 'Failed to upload image. Please try again.');
    }
  }
}

/**
 * Upload a profile picture for a user
 */
export async function uploadProfilePicture(imageUri: string, userId: string): Promise<string> {
  const path = `profile-pictures/${userId}/${Date.now()}.jpg`;
  return uploadImageToStorage(imageUri, path);
}

