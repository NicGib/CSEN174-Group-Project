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

/**
 * Place details from Google Maps or Geoapify Place Details API
 */
export interface PlaceDetails {
  name?: string;
  formatted?: string;
  address_line1?: string;
  address_line2?: string;
  phone?: string;
  website?: string;
  opening_hours?: {
    open_now?: boolean;
    weekdays?: Record<string, string>;
  };
  categories?: string[];
  categoriesRaw?: any; // Raw category data from API for debugging
  images?: string[]; // URLs to place images
  description?: string;
  rating?: number;
  price_level?: number;
  amenities?: string[];
  provider?: 'google' | 'geoapify'; // Which API provider returned this data
}

/**
 * Enhanced address suggestion interface with structured data
 */
export interface EnhancedAddressSuggestion {
  displayName: string;
  address_line1?: string; // Main address line (street, POI name)
  address_line2?: string; // Secondary line (city, state, country)
  latitude: number;
  longitude: number;
  result_type?: string; // Type: city, street, amenity, etc.
  distance?: number; // Distance in meters from user location
  rank?: number; // Confidence/rank score
  formatted?: string; // Full formatted address
  provider?: 'google' | 'geoapify' | 'placekit' | 'nominatim'; // Which API provider returned this result
  place_id?: string; // Place ID for fetching details (Google Maps or Geoapify)
}

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
  private trackingRefCount: number = 0; // Track how many components are using tracking
  private currentLocation: LocationData | null = null;
  private locationHistory: LocationData[] = [];
  private maxHistorySize: number = 1000; // Keep last 1000 locations
  // Cache for address suggestions to improve performance
  private addressCache: Map<string, { results: EnhancedAddressSuggestion[]; timestamp: number }> = new Map();
  private cacheMaxAge: number = 30 * 60 * 1000; // 30 minutes (increased from 5 minutes)
  private maxCacheSize: number = 200; // Maximum number of cached queries (increased from 100)
  // Cache for place details
  private placeDetailsCache: Map<string, { details: PlaceDetails; timestamp: number }> = new Map();
  private placeDetailsCacheMaxAge: number = 60 * 60 * 1000; // 1 hour
  private placeDetailsCacheMaxSize: number = 100; // Maximum number of cached place details
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
   * Uses reference counting to support multiple components
   */
  async startTracking(options: LocationTrackingOptions = {}): Promise<boolean> {
    // Increment reference count
    this.trackingRefCount++;
    
    if (this.isTracking) {
      // Already tracking, just increment the ref count
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
   * Uses reference counting - only actually stops when ref count reaches 0
   */
  stopTracking(): void {
    // Decrement reference count
    this.trackingRefCount = Math.max(0, this.trackingRefCount - 1);
    
    // Only actually stop tracking if no components are using it
    if (this.trackingRefCount === 0 && this.isTracking) {
      if (this.watchSubscription) {
        this.watchSubscription.remove();
        this.watchSubscription = null;
      }
      this.isTracking = false;
      console.log('Location tracking stopped');
    }
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
   * Get address autocomplete suggestions with fallback chain
   * Tries: Google (if enabled) → Geoapify → PlaceKit → Nominatim
   * Returns enhanced suggestions with structured data
   * Includes intelligent caching with prefix matching
   */
  async getAddressSuggestions(
    query: string,
    limit: number = 10,
    options?: {
      userLocation?: { latitude: number; longitude: number };
      countryCodes?: string[];
      viewbox?: { minLon: number; minLat: number; maxLon: number; maxLat: number };
    }
  ): Promise<Array<EnhancedAddressSuggestion>> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    // Normalize query: trim and collapse multiple spaces to single space
    const normalizedQuery = query.trim().replace(/\s+/g, ' ');
    const trimmedQuery = normalizedQuery.toLowerCase();
    
    // Check cache with prefix matching for better hit rate
    const cachedResult = this.getCachedResult(trimmedQuery, limit, options?.userLocation);
    if (cachedResult && cachedResult.length > 0) {
      console.log(`Cache hit for: "${normalizedQuery}" (${cachedResult.length} results)`);
      return cachedResult;
    }

    // Check if Google Maps is enabled and try it first
    const googleMapsEnabled = await this.isGoogleMapsEnabled();
    let results: EnhancedAddressSuggestion[] = [];
    let lastError: any = null;

    // Try Google Places Autocomplete first if enabled
    if (googleMapsEnabled) {
      try {
        results = await this.getAddressSuggestionsGoogle(normalizedQuery, limit, options);
        if (results.length > 0) {
          // Tag results with provider
          results = results.map(r => ({ ...r, provider: 'google' as const }));
          const ranked = this.rankAndLimitResults(results, normalizedQuery, options?.userLocation, limit);
          console.log(`✅ Google Autocomplete returned ${ranked.length} results for: "${normalizedQuery}"`);
          // Cache the results
          const locationKey = options?.userLocation 
            ? `${options.userLocation.latitude.toFixed(2)},${options.userLocation.longitude.toFixed(2)}`
            : 'none';
          const cacheKey = `google_${trimmedQuery}_${limit}_${locationKey}`;
          this.cacheAddressResults(cacheKey, ranked);
          return ranked;
        }
        // Google returned empty results, continue to next provider
        console.log(`Google Autocomplete returned 0 results for: "${normalizedQuery}", trying Geoapify...`);
      } catch (error: any) {
        lastError = error;
        // Only log if it's not a timeout
        if (!error.message?.includes('timed out')) {
          console.warn(`Google Autocomplete failed for "${normalizedQuery}", trying Geoapify:`, error.message || error);
        }
      }
    }

    // Try providers in order: Geoapify → PlaceKit → Nominatim

    // Try Geoapify first (if API key available)
    const geoapifyKey = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY || 
                       Constants.expoConfig?.extra?.geoapifyApiKey;
    if (geoapifyKey) {
      try {
        results = await this.getAddressSuggestionsGeoapify(normalizedQuery, limit, options);
        if (results.length > 0) {
          // Tag results with provider
          results = results.map(r => ({ ...r, provider: 'geoapify' as const }));
          const ranked = this.rankAndLimitResults(results, normalizedQuery, options?.userLocation, limit);
          console.log(`Geoapify returned ${ranked.length} results for: "${normalizedQuery}"`);
          return ranked;
        }
        // Geoapify returned empty results, continue to next provider
        console.log(`Geoapify returned 0 results for: "${normalizedQuery}", trying PlaceKit...`);
      } catch (error: any) {
        lastError = error;
        // Only log if it's not a timeout (timeouts are expected on slow networks)
        if (!error.message?.includes('timed out')) {
          console.warn(`Geoapify failed for "${normalizedQuery}", trying PlaceKit:`, error.message || error);
        }
      }
    }

    // Try PlaceKit second (if API key available and Geoapify didn't return results)
    const placekitKey = process.env.EXPO_PUBLIC_PLACEKIT_API_KEY || 
                       Constants.expoConfig?.extra?.placekitApiKey;
    if (placekitKey && results.length === 0) {
      try {
        results = await this.getAddressSuggestionsPlaceKit(normalizedQuery, limit, options);
        if (results.length > 0) {
          // Tag results with provider
          results = results.map(r => ({ ...r, provider: 'placekit' as const }));
          const ranked = this.rankAndLimitResults(results, normalizedQuery, options?.userLocation, limit);
          console.log(`PlaceKit returned ${ranked.length} results for: "${normalizedQuery}"`);
          return ranked;
        }
        // PlaceKit returned empty results, continue to Nominatim
        console.log(`PlaceKit returned 0 results for: "${normalizedQuery}", trying Nominatim...`);
      } catch (error: any) {
        lastError = error;
        // Suppress warnings for expected errors (timeout, invalid API key)
        const isTimeout = error.message?.includes('timed out');
        const isInvalidKey = error.message?.includes('412') || 
                            error.message?.includes('invalid') || 
                            error.message?.includes('missing required');
        if (!isTimeout && !isInvalidKey) {
          console.warn(`PlaceKit failed for "${normalizedQuery}", trying Nominatim:`, error.message || error);
        }
        // Silently continue to Nominatim for expected errors
      }
    }

    // Fallback to Nominatim (always available, only if previous providers didn't return results)
    if (results.length === 0) {
      try {
        results = await this.getAddressSuggestionsNominatim(normalizedQuery, limit, options);
        // Tag results with provider
        results = results.map(r => ({ ...r, provider: 'nominatim' as const }));
        const ranked = this.rankAndLimitResults(results, normalizedQuery, options?.userLocation, limit);
        console.log(`Nominatim returned ${ranked.length} results for: "${normalizedQuery}"`);
        return ranked;
      } catch (error: any) {
        // Only log if it's not a timeout
        if (!error.message?.includes('timed out')) {
          console.error(`All geocoding providers failed for "${normalizedQuery}":`, error.message || error);
        }
        return [];
      }
    }
    
    return [];
  }

  /**
   * Client-side ranking function to improve result quality
   * Scores based on text match and distance
   */
  private rankAndLimitResults(
    results: EnhancedAddressSuggestion[],
    query: string,
    userLocation?: { latitude: number; longitude: number } | null,
    limit: number = 10
  ): EnhancedAddressSuggestion[] {
    const queryLower = query.toLowerCase().trim();
    
    const scored = results.map((suggestion) => {
      const mainText = (suggestion.address_line1 || suggestion.displayName || '').toLowerCase();
      const fullText = suggestion.displayName.toLowerCase();
      
      // Text match score (0-1)
      // Prioritize exact matches and prefix matches
      let matchScore = 0;
      if (mainText === queryLower) {
        matchScore = 1.2; // Exact match - boost this highest
      } else if (fullText === queryLower) {
        matchScore = 1.1; // Exact match in full text
      } else if (mainText.startsWith(queryLower)) {
        matchScore = 1.0; // Exact prefix match
      } else if (fullText.startsWith(queryLower)) {
        matchScore = 0.9; // Prefix match in full text
      } else if (mainText.includes(queryLower)) {
        matchScore = 0.7; // Contains query
      } else if (fullText.includes(queryLower)) {
        matchScore = 0.5; // In full text
      } else {
        matchScore = 0.3; // Weak match
      }

      // Distance score (0-1, closer = higher)
      let distanceScore = 0.5; // Default if no location
      if (userLocation && suggestion.distance !== undefined) {
        // Normalize distance: 0-5km = 1.0, 5-20km = 0.7, 20-50km = 0.4, >50km = 0.2
        const distKm = suggestion.distance / 1000;
        if (distKm < 5) distanceScore = 1.0;
        else if (distKm < 20) distanceScore = 0.7;
        else if (distKm < 50) distanceScore = 0.4;
        else distanceScore = 0.2;
      } else if (userLocation) {
        // Calculate distance if not provided
        const dist = this.calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          suggestion.latitude,
          suggestion.longitude
        );
        const distKm = dist / 1000;
        if (distKm < 5) distanceScore = 1.0;
        else if (distKm < 20) distanceScore = 0.7;
        else if (distKm < 50) distanceScore = 0.4;
        else distanceScore = 0.2;
        suggestion.distance = dist;
      }

      // Provider rank score (if available)
      const rankScore = suggestion.rank ? suggestion.rank / 10 : 0.5;

      // Combined score: 60% match, 30% distance, 10% provider rank
      const finalScore = 0.6 * matchScore + 0.3 * distanceScore + 0.1 * rankScore;

      return {
        ...suggestion,
        _score: finalScore,
      };
    });

    // Sort by score and limit
    return scored
      .sort((a, b) => (b as any)._score - (a as any)._score)
      .slice(0, limit)
      .map(({ _score, ...rest }) => rest);
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Check if Google Maps is enabled via debug settings
   */
  async isGoogleMapsEnabled(): Promise<boolean> {
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      const enabled = await AsyncStorage.default.getItem('@trailmix_google_maps_enabled');
      return enabled === 'true';
    } catch (error) {
      // Default to false if we can't read the setting
      return false;
    }
  }

  /**
   * Get place details from Google Maps Places API or Geoapify (with fallback)
   * Returns comprehensive information including images, contact info, opening hours, etc.
   * 
   * @param provider - The provider that returned the place_id ('google' or 'geoapify')
   *                   If 'google', will use Google Maps Place Details API
   *                   If 'geoapify', will use Geoapify Place Details API
   *                   If undefined, will try Google Maps first (if enabled), then Geoapify
   */
  async getPlaceDetails(
    latitude: number,
    longitude: number,
    placeId?: string,
    provider?: 'google' | 'geoapify'
  ): Promise<PlaceDetails | null> {
    // Create cache key based on coordinates (rounded to 4 decimal places for cache hits)
    const cacheKey = `place_${latitude.toFixed(4)}_${longitude.toFixed(4)}_${placeId || 'none'}_${provider || 'none'}`;
    
    // Check cache first
    const cached = this.placeDetailsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.placeDetailsCacheMaxAge) {
      console.log(`[Place Details] Cache hit for: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      return cached.details;
    }

    // Check if Google Maps is enabled
    const googleMapsEnabled = await this.isGoogleMapsEnabled();
    console.log(`[Place Details] Google Maps enabled: ${googleMapsEnabled}, Provider: ${provider || 'unknown'}`);
    
    let details: PlaceDetails | null = null;
    
    // If provider is explicitly 'geoapify', skip Google Maps and go straight to Geoapify
    if (provider === 'geoapify') {
      console.log(`[Place Details] Using Geoapify (provider specified) for location: ${latitude}, ${longitude}`);
      details = await this.getPlaceDetailsGeoapify(latitude, longitude, placeId);
      if (details) {
        this.cachePlaceDetails(cacheKey, details);
      }
      return details;
    }
    
    // If provider is 'google' or Google Maps is enabled (and provider is not 'geoapify'), try Google Maps
    if (provider === 'google' || (googleMapsEnabled && provider !== 'geoapify')) {
      console.log(`[Place Details] Attempting Google Maps for location: ${latitude}, ${longitude}`);
      // Only use placeId if provider is 'google' (it's a Google place_id)
      const googlePlaceId = provider === 'google' ? placeId : undefined;
      try {
        details = await this.getPlaceDetailsGoogle(latitude, longitude, googlePlaceId);
        if (details) {
          console.log(`[Place Details] Successfully retrieved from Google Maps`);
          // Cache the result
          this.cachePlaceDetails(cacheKey, details);
          return details;
        }
        // Google Maps returned null (no results or error)
        if (provider === 'google') {
          // If provider is explicitly 'google', don't fall back to Geoapify
          console.log('[Place Details] Google Maps returned null for Google provider, returning null');
          return null;
        }
        // For other cases (provider undefined but Google Maps enabled), fall back to Geoapify
        console.log('[Place Details] Google Maps returned null, falling back to Geoapify...');
      } catch (error: any) {
        // Google Maps threw an error (API error, network error, etc.)
        if (provider === 'google') {
          // If provider is explicitly 'google', don't fall back to Geoapify
          console.warn('[Place Details] Google Maps error for Google provider, returning null:', error.message || error);
          return null;
        }
        // For other cases, fall back to Geoapify
        console.warn('[Place Details] Google Maps error, falling back to Geoapify:', error.message || error);
      }
    }

    // Fallback to Geoapify (only if provider is not 'google')
    // If provider is 'google', we already returned above
    if (provider !== 'google') {
      console.log(`[Place Details] Using Geoapify for location: ${latitude}, ${longitude}`);
      // Only use placeId if provider is not 'google' (Google place_ids won't work with Geoapify)
      // If provider is undefined, we don't know which system the place_id belongs to, so skip it
      const geoapifyPlaceId = provider !== 'google' ? placeId : undefined;
      details = await this.getPlaceDetailsGeoapify(latitude, longitude, geoapifyPlaceId);
    }
    
    // Cache the result if we got one
    if (details) {
      this.cachePlaceDetails(cacheKey, details);
    }
    
    return details;
  }

  /**
   * Get place details from Google Maps Places API
   * If placeId is provided (from Google Autocomplete), use it directly.
   * Otherwise, use Nearby Search to find the Google place_id from coordinates.
   */
  private async getPlaceDetailsGoogle(
    latitude: number,
    longitude: number,
    placeId?: string // Google place_id from Autocomplete (if available)
  ): Promise<PlaceDetails | null> {
    const googleApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 
                        Constants.expoConfig?.extra?.googleMapsApiKey;
    if (!googleApiKey) {
      console.warn('Google Maps API key not found. Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in your .env file.');
      return null;
    }

    try {
      let googlePlaceId: string | undefined = placeId;
      
      // If placeId is provided (from Google Autocomplete), use it directly
      // Otherwise, use Nearby Search to find the Google place_id from coordinates
      if (!googlePlaceId) {
        console.log(`[Google Maps] No place_id provided, searching for place_id near ${latitude}, ${longitude}`);
        const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=50&key=${googleApiKey}`;
        
        const nearbyController = new AbortController();
        const nearbyTimeout = setTimeout(() => nearbyController.abort(), 5000);
        
        const nearbyResponse = await fetch(nearbyUrl, {
          signal: nearbyController.signal,
        });
        
        clearTimeout(nearbyTimeout);
        
        if (!nearbyResponse.ok) {
          const errorText = await nearbyResponse.text().catch(() => 'Unable to read error');
          console.warn(`[Google Maps] Nearby Search HTTP error: ${nearbyResponse.status} ${nearbyResponse.statusText}`);
          console.warn(`[Google Maps] Error response: ${errorText.substring(0, 200)}`);
          return null;
        }
        
        const nearbyData = await nearbyResponse.json();
        if (nearbyData.status && nearbyData.status !== 'OK') {
          const errorMsg = nearbyData.error_message || 'Unknown error';
          if (nearbyData.status === 'REQUEST_DENIED') {
            console.error(`[Google Maps] Nearby Search denied: ${errorMsg}. Check API key permissions.`);
          } else if (nearbyData.status === 'OVER_QUERY_LIMIT') {
            console.error(`[Google Maps] Nearby Search quota exceeded: ${errorMsg}`);
          } else if (nearbyData.status === 'ZERO_RESULTS') {
            console.log(`[Google Maps] Nearby Search: No places found at this location`);
          } else {
            console.warn(`[Google Maps] Nearby Search failed: ${nearbyData.status} - ${errorMsg}`);
          }
          return null;
        }
        
        if (nearbyData.results && nearbyData.results.length > 0) {
          googlePlaceId = nearbyData.results[0].place_id;
          console.log(`[Google Maps] Found place_id via Nearby Search: ${googlePlaceId}`);
        } else {
          console.warn('[Google Maps] Nearby Search returned no results');
          return null;
        }
      } else {
        console.log(`[Google Maps] Using provided place_id: ${googlePlaceId}`);
      }

      if (!googlePlaceId) {
        console.warn('[Google Maps] No place_id available');
        return null;
      }

      // Get place details
      const fields = [
        'name',
        'formatted_address',
        'formatted_phone_number',
        'international_phone_number',
        'website',
        'opening_hours',
        'rating',
        'price_level',
        'types',
        'photos',
        'editorial_summary',
        'geometry',
      ].join(',');

      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${googlePlaceId}&fields=${fields}&key=${googleApiKey}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(detailsUrl, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404 || response.status === 400) {
          return null;
        }
        throw new Error(`Google Maps Places API returned status ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status !== 'OK' || !data.result) {
        const errorMsg = data.error_message || 'Unknown error';
        if (data.status === 'ZERO_RESULTS' || data.status === 'NOT_FOUND') {
          console.log(`[Google Maps] Place not found: ${data.status}`);
          return null;
        }
        if (data.status === 'REQUEST_DENIED') {
          console.error(`[Google Maps] Request denied: ${errorMsg}. Check API key permissions and billing.`);
        } else if (data.status === 'OVER_QUERY_LIMIT') {
          console.error(`[Google Maps] Over query limit: ${errorMsg}. Daily quota exceeded.`);
        } else if (data.status === 'INVALID_REQUEST') {
          console.error(`[Google Maps] Invalid request: ${errorMsg}`);
        } else {
          console.error(`[Google Maps] API error: ${data.status} - ${errorMsg}`);
        }
        throw new Error(`Google Maps Places API error: ${data.status} - ${errorMsg}`);
      }

      const result = data.result;

      // Extract categories - Google Maps returns an array of type strings
      const categories = result.types || [];
      console.log(`[Google Maps] Categories received (${categories.length}):`, categories);
      console.log(`[Google Maps] Full result.types:`, JSON.stringify(result.types, null, 2));

      // Extract place details
      const details: PlaceDetails = {
        name: result.name,
        formatted: result.formatted_address,
        address_line1: result.name,
        address_line2: result.formatted_address?.replace(result.name || '', '').trim().replace(/^,\s*/, ''),
        phone: result.formatted_phone_number || result.international_phone_number,
        website: result.website,
        categories: categories,
        categoriesRaw: result.types, // Store raw data for debugging
        description: result.editorial_summary?.overview,
        rating: result.rating,
        price_level: result.price_level,
        provider: 'google',
      };

      // Extract opening hours
      if (result.opening_hours) {
        details.opening_hours = {
          open_now: result.opening_hours.open_now,
          weekdays: result.opening_hours.weekday_text?.reduce((acc: Record<string, string>, text: string) => {
            const match = text.match(/^([^:]+):\s*(.+)$/);
            if (match) {
              acc[match[1]] = match[2];
            }
            return acc;
          }, {}) || {},
        };
      }

      // Extract photos
      if (result.photos && Array.isArray(result.photos)) {
        const images: string[] = [];
        // Get up to 5 photos
        result.photos.slice(0, 5).forEach((photo: any) => {
          if (photo.photo_reference) {
            // Google Places Photo API URL
            const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=${googleApiKey}`;
            images.push(photoUrl);
          }
        });
        if (images.length > 0) {
          details.images = images;
        }
      }

      console.log(`[Google Maps] Place details retrieved for: ${details.name || 'Unknown'}`);
      console.log(`[Google Maps] Summary - Images: ${details.images?.length || 0}, Categories: ${details.categories?.length || 0}, Rating: ${details.rating || 'N/A'}`);
      return details;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn('[Google Maps] Request timed out');
      } else {
        console.error('[Google Maps] Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack?.split('\n').slice(0, 3).join('\n'),
        });
      }
      return null;
    }
  }

  /**
   * Get place details from Geoapify Place Details API
   */
  private async getPlaceDetailsGeoapify(
    latitude: number,
    longitude: number,
    placeId?: string
  ): Promise<PlaceDetails | null> {
    const geoapifyKey = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY || 
                       Constants.expoConfig?.extra?.geoapifyApiKey;
    if (!geoapifyKey) {
      return null;
    }

    try {
      // Use place_id if available, otherwise use coordinates
      let url: string;
      if (placeId) {
        url = `https://api.geoapify.com/v2/place-details?id=${placeId}&apiKey=${geoapifyKey}`;
      } else {
        url = `https://api.geoapify.com/v2/place-details?lat=${latitude}&lon=${longitude}&apiKey=${geoapifyKey}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 400 || response.status === 404) {
          // Place not found or invalid request - not an error worth logging
          return null;
        }
        throw new Error(`Geoapify Place Details API returned status ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.features || data.features.length === 0) {
        return null;
      }

      const feature = data.features[0];
      const properties = feature.properties || {};
      const geometry = feature.geometry || {};

      // Extract categories - Geoapify categories can be an object or array
      let categories: string[] = [];
      if (properties.categories) {
        if (Array.isArray(properties.categories)) {
          categories = properties.categories;
        } else if (typeof properties.categories === 'object') {
          // If it's an object, try to get values (category names) instead of keys
          const categoryValues = Object.values(properties.categories);
          // Check if values are strings (category names) or objects with more info
          if (categoryValues.length > 0 && typeof categoryValues[0] === 'string') {
            categories = categoryValues as string[];
          } else if (categoryValues.length > 0 && typeof categoryValues[0] === 'object') {
            // If values are objects, extract names or other properties
            categories = categoryValues.map((cat: any) => cat.name || cat.label || JSON.stringify(cat));
          } else {
            // Fallback to keys if values aren't useful
            categories = Object.keys(properties.categories);
          }
        }
      }
      
      console.log(`[Geoapify] Raw categories property:`, JSON.stringify(properties.categories, null, 2));
      console.log(`[Geoapify] Extracted categories (${categories.length}):`, categories);

      // Extract place details
      const details: PlaceDetails = {
        name: properties.name,
        formatted: properties.formatted,
        address_line1: properties.address_line1 || properties.name,
        address_line2: properties.address_line2 || 
          [properties.city, properties.state, properties.country]
            .filter(Boolean)
            .join(', '),
        phone: properties.phone,
        website: properties.website,
        categories: categories,
        categoriesRaw: properties.categories, // Store raw data for debugging
        description: properties.description || properties.wikidata?.description,
        rating: properties.rating,
        price_level: properties.price_level,
        provider: 'geoapify',
      };

      // Extract opening hours if available
      if (properties.opening_hours) {
        details.opening_hours = {
          open_now: properties.opening_hours.open_now,
          weekdays: properties.opening_hours.weekdays || {},
        };
      }

      // Extract images from various sources
      const images: string[] = [];
      
      // Check for image URLs in properties
      if (properties.image) {
        images.push(properties.image);
      }
      if (properties.photo) {
        images.push(properties.photo);
      }
      
      // Check for media/images array
      if (properties.media && Array.isArray(properties.media)) {
        properties.media.forEach((media: any) => {
          if (media.url && !images.includes(media.url)) {
            images.push(media.url);
          }
        });
      }

      // Check for wikidata image
      if (properties.wikidata?.image) {
        images.push(properties.wikidata.image);
      }

      // Check for osm image
      if (properties.osm?.image) {
        images.push(properties.osm.image);
      }

      if (images.length > 0) {
        details.images = images;
      }

      // Extract amenities
      if (properties.amenity) {
        details.amenities = Array.isArray(properties.amenity) 
          ? properties.amenity 
          : [properties.amenity];
      }

      // Log categories
      if (details.categories && details.categories.length > 0) {
        console.log(`[Geoapify] Categories received (${details.categories.length}):`, details.categories);
      }

      console.log(`[Geoapify] Place details retrieved for: ${details.name || 'Unknown'}`);
      console.log(`[Geoapify] Summary - Images: ${details.images?.length || 0}, Categories: ${details.categories?.length || 0}, Rating: ${details.rating || 'N/A'}`);
      return details;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn('Geoapify Place Details request timed out');
      } else if (!error.message?.includes('timed out')) {
        console.warn('Geoapify Place Details failed:', error.message || error);
      }
      return null;
    }
  }

  /**
   * Reverse geocode coordinates to get canonical formatted address
   * Used after selection to ensure we have the best formatted address
   */
  async reverseGeocodeForAddress(
    latitude: number,
    longitude: number
  ): Promise<string | null> {
    // Try Geoapify reverse geocoding first if available
    const geoapifyKey = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY || 
                       Constants.expoConfig?.extra?.geoapifyApiKey;
    if (geoapifyKey) {
      try {
        const params = new URLSearchParams({
          lat: latitude.toString(),
          lon: longitude.toString(),
          format: 'json',
          apiKey: geoapifyKey,
          lang: 'en',
        });

        const url = `https://api.geoapify.com/v1/geocode/reverse?${params.toString()}`;
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          if (data.features && data.features.length > 0) {
            return data.features[0].properties?.formatted || null;
          }
        }
      } catch (error) {
        console.warn('Geoapify reverse geocoding failed, using expo-location:', error);
      }
    }

    // Fallback to expo-location reverse geocoding
    return this.reverseGeocode(latitude, longitude);
  }

  /**
   * Get address suggestions using Google Places Autocomplete API
   * Returns place_id directly for use with Place Details API
   */
  private async getAddressSuggestionsGoogle(
    query: string,
    limit: number = 10,
    options?: {
      userLocation?: { latitude: number; longitude: number };
      countryCodes?: string[];
      viewbox?: { minLon: number; minLat: number; maxLon: number; maxLat: number };
    }
  ): Promise<Array<EnhancedAddressSuggestion>> {
    const googleApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 
                        Constants.expoConfig?.extra?.googleMapsApiKey;
    if (!googleApiKey) {
      throw new Error('Google Maps API key not found');
    }

    try {
      const trimmedQuery = query.trim();
      
      // Build Autocomplete API URL
      // Note: Don't restrict types - let Google return all relevant results
      // Removing types parameter allows establishments, addresses, cities, etc.
      // Setting types='(cities)' restricts to cities only (which is why you only see towns)
      const params = new URLSearchParams({
        input: trimmedQuery,
        key: googleApiKey,
        // Don't set types parameter - this allows all types (establishments, addresses, cities, etc.)
      });

      // Add location bias if user location is provided
      // Using locationBias instead of location+radius for better results
      if (options?.userLocation) {
        // Use locationBias with a circular bias for better nearby results
        params.append('locationbias', `circle:50000@${options.userLocation.latitude},${options.userLocation.longitude}`);
      }

      // Add country restriction if provided
      if (options?.countryCodes && options.countryCodes.length > 0) {
        params.append('components', options.countryCodes.map(code => `country:${code}`).join('|'));
      }

      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Google Autocomplete HTTP error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        const errorMsg = data.error_message || 'Unknown error';
        if (data.status === 'REQUEST_DENIED') {
          throw new Error(`Google Autocomplete denied: ${errorMsg}. Check API key permissions.`);
        } else if (data.status === 'OVER_QUERY_LIMIT') {
          throw new Error(`Google Autocomplete quota exceeded: ${errorMsg}`);
        } else {
          throw new Error(`Google Autocomplete failed: ${data.status} - ${errorMsg}`);
        }
      }

      if (!data.predictions || data.predictions.length === 0) {
        return [];
      }

      // Convert Google predictions to EnhancedAddressSuggestion format
      // Use Place Details API with minimal fields (just geometry) to get coordinates
      const results: EnhancedAddressSuggestion[] = [];
      
      // Process predictions in parallel for better performance
      const predictionPromises = data.predictions.slice(0, limit).map(async (prediction: any) => {
        try {
          // Use Place Details API with just geometry field to get coordinates
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry&key=${googleApiKey}`;
          
          const detailsController = new AbortController();
          const detailsTimeout = setTimeout(() => detailsController.abort(), 3000);
          
          const detailsResponse = await fetch(detailsUrl, {
            signal: detailsController.signal,
          });
          
          clearTimeout(detailsTimeout);
          
          if (detailsResponse.ok) {
            const detailsData = await detailsResponse.json();
            if (detailsData.result?.geometry?.location) {
              const location = detailsData.result.geometry.location;
              
              // Calculate distance if user location is provided
              let distance: number | undefined;
              if (options?.userLocation) {
                distance = this.calculateDistance(
                  options.userLocation.latitude,
                  options.userLocation.longitude,
                  location.lat,
                  location.lng
                );
              }

              const structuredFormatting = prediction.structured_formatting || {};
              const mainText = structuredFormatting.main_text || prediction.description.split(',')[0];
              const secondaryText = structuredFormatting.secondary_text || prediction.description.split(',').slice(1).join(',').trim();

              return {
                displayName: prediction.description,
                address_line1: mainText,
                address_line2: secondaryText,
                latitude: location.lat,
                longitude: location.lng,
                result_type: prediction.types?.[0] || 'geocode',
                distance,
                formatted: prediction.description,
                place_id: prediction.place_id, // This is the Google place_id!
              } as EnhancedAddressSuggestion;
            }
          }
        } catch (detailsError) {
          // Skip this result if Place Details fails
          console.warn(`Failed to get coordinates for Google prediction: ${prediction.description}`, detailsError);
        }
        return null;
      });

      // Wait for all Place Details calls to complete
      const resolvedResults = await Promise.all(predictionPromises);
      results.push(...resolvedResults.filter((r): r is EnhancedAddressSuggestion => r !== null));

      return results;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Google Autocomplete request timed out');
      }
      throw error;
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
  ): Promise<Array<EnhancedAddressSuggestion>> {
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
      const timeoutId = setTimeout(() => controller.abort(), 10000); // Increased to 10 seconds for Nominatim (can be slower)
      
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'TrailMixApp/1.0',
            'Accept-Language': 'en',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Nominatim API returned status ${response.status}`);
        }

        const data = await response.json();
      
      if (!Array.isArray(data)) {
        return [];
      }

      const seen = new Set<string>();
      const results: EnhancedAddressSuggestion[] = [];

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
        let address_line1 = '';
        let address_line2 = '';
        
        if (item.address) {
          const addr = item.address;
          const parts: string[] = [];
          
          // Build address_line1 (main address)
          if (addr.house_number && addr.road) {
            address_line1 = `${addr.house_number} ${addr.road}`;
            parts.push(address_line1);
          } else if (addr.road) {
            address_line1 = addr.road;
            parts.push(addr.road);
          } else if (addr.house_number) {
            address_line1 = addr.house_number;
            parts.push(addr.house_number);
          } else if (addr.name) {
            address_line1 = addr.name;
            parts.push(addr.name);
          }
          
          // Build address_line2 (city, state, country)
          const secondaryParts: string[] = [];
          if (addr.neighbourhood || addr.suburb) {
            secondaryParts.push(addr.neighbourhood || addr.suburb);
          }
          if (addr.city || addr.town || addr.village) {
            secondaryParts.push(addr.city || addr.town || addr.village);
          }
          if (addr.state || addr.region) {
            secondaryParts.push(addr.state || addr.region);
          }
          if (addr.postcode) {
            secondaryParts.push(addr.postcode);
          }
          if (addr.country) {
            secondaryParts.push(addr.country);
          }
          address_line2 = secondaryParts.join(', ');

          if (parts.length >= 2) {
            displayName = parts.join(', ');
          }
        }

        // Calculate distance if user location provided
        let distance: number | undefined;
        if (options?.userLocation) {
          distance = this.calculateDistance(
            options.userLocation.latitude,
            options.userLocation.longitude,
            lat,
            lon
          );
        }

        results.push({
          displayName,
          address_line1: address_line1 || displayName.split(',')[0],
          address_line2: address_line2 || displayName.split(',').slice(1).join(',').trim(),
          latitude: lat,
          longitude: lon,
          result_type: item.type || item.class || 'unknown',
          distance,
          formatted: displayName,
        });

        if (results.length >= limit) {
          break;
        }
      }

        this.cacheAddressResults(cacheKey, results);
        return results;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Nominatim request timed out');
        }
        throw fetchError;
      }
    } catch (error: any) {
      // Re-throw to trigger proper error handling
      throw error;
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
  ): Promise<Array<EnhancedAddressSuggestion>> {
    const geoapifyKey = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY || 
                       Constants.expoConfig?.extra?.geoapifyApiKey;
    if (!geoapifyKey) {
      throw new Error('Geoapify API key not found');
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
        apiKey: geoapifyKey,
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
      const timeoutId = setTimeout(() => controller.abort(), 8000); // Increased to 8 seconds
      
      try {
        const response = await fetch(url, {
          headers: {
            'Accept-Language': 'en',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          // Don't throw for 4xx errors, just return empty and let fallback handle it
          if (response.status >= 400 && response.status < 500) {
            // Try to get error details from response
            let errorMessage = `Geoapify API returned status ${response.status}`;
            try {
              const errorData = await response.json();
              if (errorData.message) {
                errorMessage += `: ${errorData.message}`;
              }
            } catch {
              // Ignore JSON parse errors
            }
            throw new Error(errorMessage);
          }
          throw new Error(`Geoapify API returned status ${response.status}`);
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
      const results: EnhancedAddressSuggestion[] = [];

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

        // Geoapify provides structured address data
        const props = feature.properties;
        const address_line1 = props.address_line1 || props.name || props.street || '';
        const address_line2 = props.address_line2 || 
                             [props.city, props.state, props.country].filter(Boolean).join(', ') ||
                             '';
        const displayName = props.formatted || 
                           (address_line1 && address_line2 ? `${address_line1}, ${address_line2}` : address_line1) ||
                           props.name ||
                           'Unknown location';

        // Extract result type
        const result_type = props.result_type || 
                           props.type || 
                           (props.category ? 'amenity' : 'address') ||
                           'unknown';

        // Get distance if provided
        const distance = props.distance ? parseFloat(props.distance) : undefined;

        // Get rank/confidence if available
        const rank = props.rank?.confidence ? props.rank.confidence * 10 : undefined;

        // Extract place_id for Place Details API
        // Geoapify uses datasource.id or place_id
        const place_id = props.datasource?.id || props.place_id || props.id;

        results.push({
          displayName,
          address_line1: address_line1 || displayName.split(',')[0],
          address_line2: address_line2 || displayName.split(',').slice(1).join(',').trim(),
          latitude: lat,
          longitude: lon,
          result_type,
          distance,
          rank,
          formatted: props.formatted || displayName,
          place_id,
        });

        // Limit results manually since API doesn't support limit parameter
        if (results.length >= limit) {
          break;
        }
      }

        this.cacheAddressResults(cacheKey, results);
        return results;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Geoapify request timed out');
        }
        throw fetchError;
      }
    } catch (error: any) {
      // Re-throw to trigger fallback
      throw error;
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
  ): Promise<Array<EnhancedAddressSuggestion>> {
    const placekitKey = process.env.EXPO_PUBLIC_PLACEKIT_API_KEY || 
                       Constants.expoConfig?.extra?.placekitApiKey;
    if (!placekitKey) {
      throw new Error('PlaceKit API key not found');
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
      const timeoutId = setTimeout(() => controller.abort(), 8000); // Increased to 8 seconds
      
      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${placekitKey}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          // 412 is Precondition Failed - often means invalid API key or missing required params
          if (response.status === 412) {
            throw new Error('PlaceKit API key invalid or missing required parameters');
          }
          // Don't throw for other 4xx errors, let fallback handle it
          if (response.status >= 400 && response.status < 500) {
            let errorMessage = `PlaceKit API returned status ${response.status}`;
            try {
              const errorData = await response.json();
              if (errorData.message || errorData.error) {
                errorMessage += `: ${errorData.message || errorData.error}`;
              }
            } catch {
              // Ignore JSON parse errors
            }
            throw new Error(errorMessage);
          }
          throw new Error(`PlaceKit API returned status ${response.status}`);
        }

        const data = await response.json();
      
      if (!data || !data.results || !Array.isArray(data.results)) {
        return [];
      }

      const seen = new Set<string>();
      const results: EnhancedAddressSuggestion[] = [];

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
        const fullAddress = item.full_address || item.name || 'Unknown location';
        const addressParts = fullAddress.split(',').map((s: string) => s.trim());
        const address_line1 = addressParts[0] || item.name || '';
        const address_line2 = addressParts.slice(1).join(', ');

        // Calculate distance if user location provided
        let distance: number | undefined;
        if (options?.userLocation) {
          distance = this.calculateDistance(
            options.userLocation.latitude,
            options.userLocation.longitude,
            lat,
            lon
          );
        }

        results.push({
          displayName: fullAddress,
          address_line1,
          address_line2,
          latitude: lat,
          longitude: lon,
          result_type: item.type || 'unknown',
          distance,
          formatted: fullAddress,
        });

        if (results.length >= limit) {
          break;
        }
      }

        this.cacheAddressResults(cacheKey, results);
        return results;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('PlaceKit request timed out');
        }
        throw fetchError;
      }
    } catch (error: any) {
      // Re-throw to trigger fallback
      throw error;
    }
  }

  /**
   * Get cached result with prefix matching
   * If exact match not found, try to find a cached result for a longer query that starts with this query
   */
  private getCachedResult(
    query: string,
    limit: number,
    userLocation?: { latitude: number; longitude: number } | null
  ): EnhancedAddressSuggestion[] | null {
    const locationKey = userLocation 
      ? `${userLocation.latitude.toFixed(2)},${userLocation.longitude.toFixed(2)}`
      : 'none';
    
    // Try exact match first (check all provider prefixes)
    const providers = ['geoapify', 'placekit', 'nominatim'];
    for (const provider of providers) {
      const exactKey = `${provider}_${query}_${limit}_${locationKey}`;
      const exactCached = this.addressCache.get(exactKey);
      if (exactCached && Date.now() - exactCached.timestamp < this.cacheMaxAge) {
        // Filter results to match the query (in case it's a prefix of a longer cached query)
        const filtered = exactCached.results.filter(r => {
          const mainText = (r.address_line1 || r.displayName || '').toLowerCase();
          return mainText.startsWith(query) || mainText.includes(query);
        }).slice(0, limit);
        if (filtered.length > 0) {
          return filtered;
        }
      }
    }
    
    // Try prefix matching - find cached results for longer queries that start with this query
    for (const [cacheKey, cached] of this.addressCache.entries()) {
      if (Date.now() - cached.timestamp >= this.cacheMaxAge) continue;
      
      // Extract query from cache key (format: provider_query_limit_location)
      const parts = cacheKey.split('_');
      if (parts.length < 4) continue; // Need at least provider_query_limit_location
      
      const cachedQuery = parts.slice(1, -2).join('_'); // Everything between provider and limit
      const cachedLocationKey = parts[parts.length - 1];
      
      // Check if cached query starts with current query and location matches
      if (cachedQuery.startsWith(query) && cachedLocationKey === locationKey) {
        // Filter and return matching results
        const filtered = cached.results.filter(r => {
          const mainText = (r.address_line1 || r.displayName || '').toLowerCase();
          return mainText.startsWith(query) || mainText.includes(query);
        }).slice(0, limit);
        if (filtered.length > 0) {
          return filtered;
        }
      }
    }
    
    return null;
  }

  /**
   * Cache address search results with prefix caching for better hit rates
   */
  private cacheAddressResults(key: string, results: EnhancedAddressSuggestion[]): void {
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
   * Cache place details
   */
  private cachePlaceDetails(key: string, details: PlaceDetails): void {
    // Remove oldest entries if cache is too large
    if (this.placeDetailsCache.size >= this.placeDetailsCacheMaxSize) {
      let oldestKey: string | null = null;
      let oldestTime = Date.now();
      
      for (const [cacheKey, value] of this.placeDetailsCache.entries()) {
        if (value.timestamp < oldestTime) {
          oldestTime = value.timestamp;
          oldestKey = cacheKey;
        }
      }
      
      if (oldestKey) {
        this.placeDetailsCache.delete(oldestKey);
      }
    }
    
    this.placeDetailsCache.set(key, {
      details,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear address suggestion cache
   */
  clearAddressCache(): void {
    this.addressCache.clear();
  }

  /**
   * Clear place details cache
   */
  clearPlaceDetailsCache(): void {
    this.placeDetailsCache.clear();
  }
}

// Export singleton instance
export const locationService = new LocationService();

