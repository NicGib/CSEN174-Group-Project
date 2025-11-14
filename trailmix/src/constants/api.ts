import Constants from 'expo-constants';

// Get API base URL from Expo config (set in app.config.js)
// Priority: EXPO_PUBLIC_API_BASE_URL env var > expo config > default
// This function is called dynamically to get the latest URL
export const getApiBaseUrl = (): string => {
  // First check environment variable (highest priority - set at runtime)
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    const url = process.env.EXPO_PUBLIC_API_BASE_URL.replace(/\/$/, "");
    //console.log(`[API] Using EXPO_PUBLIC_API_BASE_URL: ${url}`);
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

// Export as a getter function for dynamic access
// For backward compatibility, also export as a constant (but it's evaluated once)
export const API_BASE_URL: string = getApiBaseUrl();

// Helper to get endpoints dynamically
export const getEndpoints = () => {
  const baseUrl = getApiBaseUrl();
  return {
    events: `${baseUrl}/events`,
    maps: `${baseUrl}/maps`,
    auth: `${baseUrl}/auth`,
    matching: `${baseUrl}/matching`,
    messaging: `${baseUrl}/messaging`,
  };
};

// For backward compatibility, export static endpoints
// Note: These use the initial API_BASE_URL value
export const endpoints = {
  get events() { return `${getApiBaseUrl()}/events`; },
  get maps() { return `${getApiBaseUrl()}/maps`; },
  get auth() { return `${getApiBaseUrl()}/auth`; },
  get matching() { return `${getApiBaseUrl()}/matching`; },
  get messaging() { return `${getApiBaseUrl()}/messaging`; },
};

// Get WebSocket URL (convert http/https to ws/wss)
export const getWebSocketUrl = (): string => {
  const baseUrl = getApiBaseUrl();
  if (baseUrl.startsWith('https://')) {
    return baseUrl.replace(/^https/, 'wss');
  }
  return baseUrl.replace(/^http/, 'ws');
};


