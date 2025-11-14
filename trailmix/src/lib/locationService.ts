import * as Location from 'expo-location';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp: number;
}

export interface LocationTrackingOptions {
  accuracy?: Location.Accuracy | number;
  timeInterval?: number;
  distanceInterval?: number;
  foregroundService?: boolean;
}

// Geocoding provider types
export type GeocodingProvider = 'nominatim' | 'geoapify' | 'placekit';

// Get provider from environment variable or default to nominatim
const getGeocodingProvider = (): GeocodingProvider => {
  const provider = (process.env.EXPO_PUBLIC_GEOCODING_PROVIDER || 
                   Constants.expoConfig?.extra?.geocodingProvider || 
                   'nominatim').toLowerCase() as GeocodingProvider;
  
  if (['nominatim', 'geoapify', 'placekit'].includes(provider)) {
    return provider;
  }
  return 'nominatim';
};

// Get API keys from environment
const getApiKey = (provider: GeocodingProvider): string | null => {
  if (provider === 'geoapify') {
    return process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY || 
           Constants.expoConfig?.extra?.geoapifyApiKey || 
           null;
  }
  if (provider === 'placekit') {
    return process.env.EXPO_PUBLIC_PLACEKIT_API_KEY || 
           Constants.expoConfig?.extra?.placekitApiKey || 
           null;
  }
  return null; // Nominatim doesn't need an API key
};

class LocationService {
  private watchSubscription: Location.LocationSubscription | null = null;
  private isTracking: boolean = false;
  private currentLocation: LocationData | null = null;
  private locationHistory: LocationData[] = [];
  private maxHistorySize: number = 1000; // Keep last 1000 locations
  // Cache for address suggestions to improve performance
  private addressCache: Map<string, { results: Array<{ displayName: string; latitude: number; longitude: number }>; timestamp: number }> = new Map();
  private cacheMaxAge: number = 5 * 60 * 1000; // 5 minutes
  private maxCacheSize: number = 100; // Maximum number of cached queries
  private geocodingProvider: GeocodingProvider;
  private apiKey: string | null;

  constructor() {
    this.geocodingProvider = getGeocodingProvider();
    this.apiKey = getApiKey(this.geocodingProvider);
    
    if (this.geocodingProvider !== 'nominatim' && !this.apiKey) {
      console.warn(`[LocationService] ${this.geocodingProvider} selected but no API key found. Falling back to Nominatim.`);
      this.geocodingProvider = 'nominatim';
    } else if (this.geocodingProvider !== 'nominatim') {
      console.log(`[LocationService] Using ${this.geocodingProvider} for address suggestions`);
    }
  }

  /**
   * Request location permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        console.warn('Foreground location permission not granted');
        return false;
      }

      // Request background permission for iOS
      if (Platform.OS === 'ios') {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
          console.warn('Background location permission not granted');
        }
      }

      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  /**
   * Check if location permissions are granted
   */
  async checkPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking location permissions:', error);
      return false;
    }
  }

  /**
   * Get current location once
   */
  async getCurrentLocation(): Promise<LocationData | null> {
    try {
      const hasPermission = await this.checkPermissions();
      if (!hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) {
          return null;
        }
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy ?? undefined,
        altitude: location.coords.altitude ?? null,
        heading: location.coords.heading ?? null,
        speed: location.coords.speed ?? null,
        timestamp: location.timestamp,
      };

      this.currentLocation = locationData;
      this.addToHistory(locationData);

      return locationData;
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  /**
   * Start tracking location continuously
   */
  async startTracking(options: LocationTrackingOptions = {}): Promise<boolean> {
    if (this.isTracking) {
      console.warn('Location tracking already started');
      return true;
    }

    try {
      const hasPermission = await this.checkPermissions();
      if (!hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) {
          return false;
        }
      }

      const watchOptions: Location.LocationOptions = {
        accuracy: (options.accuracy ?? Location.Accuracy.Balanced) as Location.Accuracy,
        timeInterval: options.timeInterval ?? 5000, // Default 5 seconds
        distanceInterval: options.distanceInterval ?? 10, // Default 10 meters
        mayShowUserSettingsDialog: true,
      };

      this.watchSubscription = await Location.watchPositionAsync(
        watchOptions,
        (location) => {
          const locationData: LocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy ?? undefined,
            altitude: location.coords.altitude ?? null,
            heading: location.coords.heading ?? null,
            speed: location.coords.speed ?? null,
            timestamp: location.timestamp,
          };

          this.currentLocation = locationData;
          this.addToHistory(locationData);
        }
      );

      this.isTracking = true;
      console.log('Location tracking started');
      return true;
    } catch (error) {
      console.error('Error starting location tracking:', error);
      return false;
    }
  }

  /**
   * Stop tracking location
   */
  stopTracking(): void {
    if (this.watchSubscription) {
      this.watchSubscription.remove();
      this.watchSubscription = null;
    }
    this.isTracking = false;
    console.log('Location tracking stopped');
  }

  /**
   * Get the most recent location
   */
  getLastKnownLocation(): LocationData | null {
    return this.currentLocation;
  }

  /**
   * Get location history
   */
  getLocationHistory(limit?: number): LocationData[] {
    if (limit) {
      return this.locationHistory.slice(-limit);
    }
    return [...this.locationHistory];
  }

  /**
   * Clear location history
   */
  clearHistory(): void {
    this.locationHistory = [];
  }

  /**
   * Check if currently tracking
   */
  isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  /**
   * Add location to history with size limit
   */
  private addToHistory(location: LocationData): void {
    this.locationHistory.push(location);
    if (this.locationHistory.length > this.maxHistorySize) {
      this.locationHistory.shift(); // Remove oldest entry
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addresses.length > 0) {
        const addr = addresses[0];
        const parts: string[] = [];
        
        if (addr.street) parts.push(addr.street);
        if (addr.city) parts.push(addr.city);
        if (addr.region) parts.push(addr.region);
        if (addr.postalCode) parts.push(addr.postalCode);
        if (addr.country) parts.push(addr.country);

        return parts.join(', ') || null;
      }

      return null;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  }

  /**
   * Geocode address to coordinates
   */
  async geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const results = await Location.geocodeAsync(address);
      if (results.length > 0) {
        return {
          latitude: results[0].latitude,
          longitude: results[0].longitude,
        };
      }
      return null;
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  }

  /**
   * Get address autocomplete suggestions
   * Routes to the configured provider (Nominatim, Geoapify, or PlaceKit)
   */
  async getAddressSuggestions(
    query: string,
    limit: number = 10,
    options?: {
      userLocation?: { latitude: number; longitude: number };
      countryCodes?: string[];
      viewbox?: { minLon: number; minLat: number; maxLon: number; maxLat: number };
    }
  ): Promise<Array<{ displayName: string; latitude: number; longitude: number }>> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    // Route to appropriate provider
    switch (this.geocodingProvider) {
      case 'geoapify':
        return this.getAddressSuggestionsGeoapify(query, limit, options);
      case 'placekit':
        return this.getAddressSuggestionsPlaceKit(query, limit, options);
      case 'nominatim':
      default:
        return this.getAddressSuggestionsNominatim(query, limit, options);
    }
  }

  /**
   * Get address suggestions using Nominatim (OpenStreetMap)
   * Free, open-source, but can be slower
   */
  private async getAddressSuggestionsNominatim(
    query: string,
    limit: number = 10,
    options?: {
      userLocation?: { latitude: number; longitude: number };
      countryCodes?: string[];
      viewbox?: { minLon: number; minLat: number; maxLon: number; maxLat: number };
    }
  ): Promise<Array<{ displayName: string; latitude: number; longitude: number }>> {
    try {
      const trimmedQuery = query.trim();
      
      // Create cache key
      const locationKey = options?.userLocation 
        ? `${options.userLocation.latitude.toFixed(2)},${options.userLocation.longitude.toFixed(2)}`
        : 'none';
      const cacheKey = `nominatim_${trimmedQuery.toLowerCase()}_${limit}_${locationKey}`;
      
      // Check cache first
      const cached = this.addressCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheMaxAge) {
        return cached.results;
      }
      
      // Build URL with optimized parameters
      const params = new URLSearchParams({
        format: 'json',
        q: trimmedQuery,
        limit: limit.toString(),
        addressdetails: '1',
        'accept-language': 'en',
        dedupe: '1',
      });

      // Add location bias if user location is available
      if (options?.userLocation) {
        const { latitude, longitude } = options.userLocation;
        const radius = 0.45; // ~50km in degrees
        params.append('viewbox', `${longitude - radius},${latitude - radius},${longitude + radius},${latitude + radius}`);
        params.append('bounded', '0');
      } else if (options?.viewbox) {
        const { minLon, minLat, maxLon, maxLat } = options.viewbox;
        params.append('viewbox', `${minLon},${minLat},${maxLon},${maxLat}`);
        params.append('bounded', '0');
      }

      if (options?.countryCodes && options.countryCodes.length > 0) {
        params.append('countrycodes', options.countryCodes.join(','));
      }

      const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'TrailMixApp/1.0',
          'Accept-Language': 'en',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`Nominatim API returned status ${response.status}`);
        return [];
      }

      const data = await response.json();
      
      if (!Array.isArray(data)) {
        return [];
      }

      const seen = new Set<string>();
      const results: Array<{ displayName: string; latitude: number; longitude: number }> = [];

      for (const item of data) {
        if (!item || !item.lat || !item.lon || !item.display_name) {
          continue;
        }

        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);

        if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
          continue;
        }

        const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);

        let displayName = item.display_name;
        
        if (item.address) {
          const addr = item.address;
          const parts: string[] = [];
          
          if (addr.house_number && addr.road) {
            parts.push(`${addr.house_number} ${addr.road}`);
          } else if (addr.road) {
            parts.push(addr.road);
          } else if (addr.house_number) {
            parts.push(addr.house_number);
          }
          
          if (addr.neighbourhood || addr.suburb) {
            parts.push(addr.neighbourhood || addr.suburb);
          }
          
          if (addr.city || addr.town || addr.village) {
            parts.push(addr.city || addr.town || addr.village);
          }
          
          if (addr.state || addr.region) {
            parts.push(addr.state || addr.region);
          }
          
          if (addr.postcode) {
            parts.push(addr.postcode);
          }
          
          if (addr.country) {
            parts.push(addr.country);
          }

          if (parts.length >= 2) {
            displayName = parts.join(', ');
          }
        }

        results.push({
          displayName,
          latitude: lat,
          longitude: lon,
        });

        if (results.length >= limit) {
          break;
        }
      }

      this.cacheAddressResults(cacheKey, results);
      return results;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn('Nominatim request timed out');
      } else {
        console.error('Error getting Nominatim suggestions:', error);
      }
      return [];
    }
  }

  /**
   * Get address suggestions using Geoapify
   * Faster and more accurate than Nominatim, requires API key
   */
  private async getAddressSuggestionsGeoapify(
    query: string,
    limit: number = 10,
    options?: {
      userLocation?: { latitude: number; longitude: number };
      countryCodes?: string[];
      viewbox?: { minLon: number; minLat: number; maxLon: number; maxLat: number };
    }
  ): Promise<Array<{ displayName: string; latitude: number; longitude: number }>> {
    if (!this.apiKey) {
      console.warn('Geoapify API key not found, falling back to Nominatim');
      return this.getAddressSuggestionsNominatim(query, limit, options);
    }

    try {
      const trimmedQuery = query.trim();
      
      // Create cache key
      const locationKey = options?.userLocation 
        ? `${options.userLocation.latitude.toFixed(2)},${options.userLocation.longitude.toFixed(2)}`
        : 'none';
      const cacheKey = `geoapify_${trimmedQuery.toLowerCase()}_${limit}_${locationKey}`;
      
      // Check cache first
      const cached = this.addressCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheMaxAge) {
        return cached.results;
      }
      
      const params = new URLSearchParams({
        text: trimmedQuery,
        apiKey: this.apiKey,
        format: 'json',
        lang: 'en',
      });

      // Note: Geoapify doesn't have a 'limit' parameter in autocomplete API
      // Results are automatically limited by the API

      // Add location bias (proximity) - Geoapify uses lon,lat format
      if (options?.userLocation) {
        const { latitude, longitude } = options.userLocation;
        params.append('bias', `proximity:${longitude},${latitude}`);
      }

      // Add country filter
      if (options?.countryCodes && options.countryCodes.length > 0) {
        // Use only the first country code (Geoapify filter format)
        params.append('filter', `countrycode:${options.countryCodes[0]}`);
      }

      const url = `https://api.geoapify.com/v1/geocode/autocomplete?${params.toString()}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, {
        headers: {
          'Accept-Language': 'en',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        // Try to get error details from response
        let errorMessage = `Geoapify API returned status ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage += `: ${errorData.message}`;
          }
          console.warn(errorMessage);
          console.warn('Request URL:', url.replace(this.apiKey || '', 'API_KEY_HIDDEN'));
        } catch {
          console.warn(errorMessage);
        }
        return [];
      }

      const data = await response.json();
      
      // Geoapify returns GeoJSON format by default, but with format=json it returns a different structure
      // Check for both possible response formats
      let features: any[] = [];
      
      if (data.features && Array.isArray(data.features)) {
        // GeoJSON format
        features = data.features;
      } else if (Array.isArray(data)) {
        // Direct array format (when format=json)
        features = data.map((item: any) => ({
          geometry: { coordinates: [item.lon, item.lat] },
          properties: item
        }));
      } else if (data.results && Array.isArray(data.results)) {
        // Results array format
        features = data.results.map((item: any) => ({
          geometry: { coordinates: [item.lon, item.lat] },
          properties: item
        }));
      }

      if (features.length === 0) {
        return [];
      }

      const seen = new Set<string>();
      const results: Array<{ displayName: string; latitude: number; longitude: number }> = [];

      for (const feature of features) {
        if (!feature || !feature.geometry || !feature.properties) {
          continue;
        }

        // Handle both [lon, lat] array and {lat, lon} object formats
        let lat: number, lon: number;
        if (Array.isArray(feature.geometry.coordinates)) {
          [lon, lat] = feature.geometry.coordinates;
        } else if (feature.properties.lat && feature.properties.lon) {
          lat = parseFloat(feature.properties.lat);
          lon = parseFloat(feature.properties.lon);
        } else {
          continue;
        }
        
        if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
          continue;
        }

        const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);

        // Geoapify provides formatted address in properties
        const props = feature.properties;
        const displayName = props.formatted || 
                           props.name || 
                           `${props.address_line1 || ''} ${props.address_line2 || ''}`.trim() ||
                           props.display_name ||
                           'Unknown location';

        results.push({
          displayName: displayName,
          latitude: lat,
          longitude: lon,
        });

        // Limit results manually since API doesn't support limit parameter
        if (results.length >= limit) {
          break;
        }
      }

      this.cacheAddressResults(cacheKey, results);
      return results;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn('Geoapify request timed out');
      } else {
        console.error('Error getting Geoapify suggestions:', error);
      }
      return [];
    }
  }

  /**
   * Get address suggestions using PlaceKit
   * Fast, modern API with good coverage
   */
  private async getAddressSuggestionsPlaceKit(
    query: string,
    limit: number = 10,
    options?: {
      userLocation?: { latitude: number; longitude: number };
      countryCodes?: string[];
      viewbox?: { minLon: number; minLat: number; maxLon: number; maxLat: number };
    }
  ): Promise<Array<{ displayName: string; latitude: number; longitude: number }>> {
    if (!this.apiKey) {
      console.warn('PlaceKit API key not found, falling back to Nominatim');
      return this.getAddressSuggestionsNominatim(query, limit, options);
    }

    try {
      const trimmedQuery = query.trim();
      
      // Create cache key
      const locationKey = options?.userLocation 
        ? `${options.userLocation.latitude.toFixed(2)},${options.userLocation.longitude.toFixed(2)}`
        : 'none';
      const cacheKey = `placekit_${trimmedQuery.toLowerCase()}_${limit}_${locationKey}`;
      
      // Check cache first
      const cached = this.addressCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheMaxAge) {
        return cached.results;
      }
      
      const params = new URLSearchParams({
        q: trimmedQuery,
        limit: limit.toString(),
        language: 'en',
      });

      // Add location bias (proximity)
      if (options?.userLocation) {
        const { latitude, longitude } = options.userLocation;
        params.append('proximity', `${latitude},${longitude}`);
      }

      // Add country filter
      if (options?.countryCodes && options.countryCodes.length > 0) {
        params.append('countries', options.countryCodes.join(','));
      }

      const url = `https://api.placekit.co/places/autocomplete?${params.toString()}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept-Language': 'en',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`PlaceKit API returned status ${response.status}`);
        return [];
      }

      const data = await response.json();
      
      if (!data || !data.results || !Array.isArray(data.results)) {
        return [];
      }

      const seen = new Set<string>();
      const results: Array<{ displayName: string; latitude: number; longitude: number }> = [];

      for (const item of data.results) {
        if (!item || !item.coordinates || !item.name) {
          continue;
        }

        const { lat, lon } = item.coordinates;
        
        if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
          continue;
        }

        const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);

        // PlaceKit provides formatted address
        const displayName = item.full_address || item.name;

        results.push({
          displayName: displayName || 'Unknown location',
          latitude: lat,
          longitude: lon,
        });

        if (results.length >= limit) {
          break;
        }
      }

      this.cacheAddressResults(cacheKey, results);
      return results;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn('PlaceKit request timed out');
      } else {
        console.error('Error getting PlaceKit suggestions:', error);
      }
      return [];
    }
  }

  /**
   * Cache address search results
   */
  private cacheAddressResults(key: string, results: Array<{ displayName: string; latitude: number; longitude: number }>): void {
    // Remove oldest entries if cache is too large (simple FIFO eviction)
    if (this.addressCache.size >= this.maxCacheSize) {
      // Find and remove the oldest entry
      let oldestKey: string | null = null;
      let oldestTime = Date.now();
      
      for (const [cacheKey, value] of this.addressCache.entries()) {
        if (value.timestamp < oldestTime) {
          oldestTime = value.timestamp;
          oldestKey = cacheKey;
        }
      }
      
      if (oldestKey) {
        this.addressCache.delete(oldestKey);
      }
    }
    
    this.addressCache.set(key, {
      results,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear address suggestion cache
   */
  clearAddressCache(): void {
    this.addressCache.clear();
  }
}

// Export singleton instance
export const locationService = new LocationService();

