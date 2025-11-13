import * as Location from 'expo-location';
import { Platform } from 'react-native';

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

class LocationService {
  private watchSubscription: Location.LocationSubscription | null = null;
  private isTracking: boolean = false;
  private currentLocation: LocationData | null = null;
  private locationHistory: LocationData[] = [];
  private maxHistorySize: number = 1000; // Keep last 1000 locations

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
   * Get address autocomplete suggestions using Nominatim (OpenStreetMap)
   * Enhanced with better search parameters, location bias, and result ranking
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

    try {
      const trimmedQuery = query.trim();
      const encodedQuery = encodeURIComponent(trimmedQuery);
      
      // Build URL with enhanced parameters
      const params = new URLSearchParams({
        format: 'json',
        q: trimmedQuery,
        limit: limit.toString(),
        addressdetails: '1',
        extratags: '1',
        namedetails: '1',
        'accept-language': 'en',
        dedupe: '1', // Deduplicate results
      });

      // Add location bias if user location is available
      if (options?.userLocation) {
        const { latitude, longitude } = options.userLocation;
        // Create a viewbox around user location (roughly 50km radius)
        const radius = 0.45; // ~50km in degrees
        params.append('viewbox', `${longitude - radius},${latitude - radius},${longitude + radius},${latitude + radius}`);
        params.append('bounded', '0'); // Prefer results in viewbox but don't restrict
      } else if (options?.viewbox) {
        // Use provided viewbox
        const { minLon, minLat, maxLon, maxLat } = options.viewbox;
        params.append('viewbox', `${minLon},${minLat},${maxLon},${maxLat}`);
        params.append('bounded', '0');
      }

      // Add country filter if specified
      if (options?.countryCodes && options.countryCodes.length > 0) {
        params.append('countrycodes', options.countryCodes.join(','));
      }

      const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'TrailMixApp/1.0', // Required by Nominatim
          'Accept-Language': 'en',
        },
      });

      if (!response.ok) {
        console.warn(`Nominatim API returned status ${response.status}`);
        return [];
      }

      const data = await response.json();
      
      if (!Array.isArray(data)) {
        return [];
      }

      // Process and deduplicate results
      const seen = new Set<string>();
      const results: Array<{ displayName: string; latitude: number; longitude: number }> = [];

      for (const item of data) {
        if (!item || !item.lat || !item.lon || !item.display_name) {
          continue;
        }

        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);

        // Skip invalid coordinates
        if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
          continue;
        }

        // Create a unique key for deduplication (round to ~10m precision)
        const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);

        // Format display name better
        let displayName = item.display_name;
        
        // If we have address details, create a cleaner format
        if (item.address) {
          const addr = item.address;
          const parts: string[] = [];
          
          // Build address from most specific to least specific
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

          // Use formatted address if we have meaningful parts, otherwise fall back to display_name
          if (parts.length >= 2) {
            displayName = parts.join(', ');
          }
        }

        results.push({
          displayName,
          latitude: lat,
          longitude: lon,
        });

        // Stop if we've reached the limit
        if (results.length >= limit) {
          break;
        }
      }

      return results;
    } catch (error) {
      console.error('Error getting address suggestions:', error);
      return [];
    }
  }
}

// Export singleton instance
export const locationService = new LocationService();

