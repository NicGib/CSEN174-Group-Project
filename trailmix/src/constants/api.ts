import Constants from 'expo-constants';

// Get API base URL from Expo config (set in app.config.js)
// Priority: EXPO_PUBLIC_API_BASE_URL env var > expo config > default
const getApiBaseUrl = (): string => {
  // First check environment variable (highest priority - set at runtime)
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    const url = process.env.EXPO_PUBLIC_API_BASE_URL.replace(/\/$/, "");
    console.log(`[API] Using EXPO_PUBLIC_API_BASE_URL: ${url}`);
    return url;
  }
  
  // Then check Expo config (set by app.config.js from tunnel URL or default)
  const configUrl = Constants.expoConfig?.extra?.apiBaseUrl;
  if (configUrl) {
    const url = configUrl.replace(/\/$/, "");
    console.log(`[API] Using config.apiBaseUrl: ${url}`);
    return url;
  }
  
  // Fallback to default
  const defaultUrl = "http://localhost:8000/api/v1";
  console.warn(`[API] Using default URL: ${defaultUrl} (no tunnel URL found)`);
  return defaultUrl;
};

export const API_BASE_URL: string = getApiBaseUrl();

export const endpoints = {
  events: `${API_BASE_URL}/events`,
  maps: `${API_BASE_URL}/maps`,
  auth: `${API_BASE_URL}/auth`,
  matching: `${API_BASE_URL}/matching`,
};


