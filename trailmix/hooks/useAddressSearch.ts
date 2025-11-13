import { useState, useEffect, useCallback } from 'react';
import { Keyboard } from 'react-native';
import { locationService, LocationData } from '@/src/lib/locationService';

export interface AddressSuggestion {
  displayName: string;
  latitude: number;
  longitude: number;
}

interface UseAddressSearchOptions {
  debounceMs?: number;
  minInputLength?: number;
  maxResults?: number;
  userLocation?: { latitude: number; longitude: number } | null;
}

interface UseAddressSearchReturn {
  addressInput: string;
  setAddressInput: (value: string) => void;
  suggestions: AddressSuggestion[];
  isLoading: boolean;
  isGeocoding: boolean;
  handleGeocode: () => Promise<LocationData | null>;
  handleSelectSuggestion: (suggestion: AddressSuggestion) => Promise<LocationData | null>;
  clearAddress: () => void;
}

/**
 * Custom hook for address search and geocoding
 * Handles address input, suggestions, and geocoding logic
 * Enhanced with better search accuracy and location bias
 */
export function useAddressSearch(
  options: UseAddressSearchOptions = {}
): UseAddressSearchReturn {
  const {
    debounceMs = 300,
    minInputLength = 2,
    maxResults = 10,
    userLocation = null,
  } = options;
  const [addressInput, setAddressInput] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Debounced address suggestions with retry logic and location bias
  useEffect(() => {
    if (addressInput.trim().length < minInputLength) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      let retries = 2;
      let lastError: any = null;
      
      while (retries >= 0 && !cancelled) {
        try {
          // Pass user location for location bias if available
          const addressSuggestions = await locationService.getAddressSuggestions(
            addressInput,
            maxResults,
            userLocation ? { userLocation } : undefined
          );
          
          if (!cancelled) {
            setSuggestions(addressSuggestions || []);
            setIsLoading(false);
            return;
          }
        } catch (error) {
          lastError = error;
          console.error(`Error fetching suggestions (${2 - retries + 1}/3):`, error);
          if (retries > 0) {
            // Wait a bit before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 200 * (3 - retries)));
          }
          retries--;
        }
      }
      
      if (!cancelled) {
        console.error('Failed to fetch suggestions after retries:', lastError);
        setSuggestions([]);
        setIsLoading(false);
      }
    }, debounceMs);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [addressInput, debounceMs, minInputLength, maxResults, userLocation]);

  const handleGeocode = useCallback(async (): Promise<LocationData | null> => {
    if (!addressInput.trim()) {
      return null;
    }

    setIsGeocoding(true);
    try {
      const coords = await locationService.geocodeAddress(addressInput.trim());
      if (coords) {
        Keyboard.dismiss();
        return {
          latitude: coords.latitude,
          longitude: coords.longitude,
          timestamp: Date.now(),
        };
      }
      return null;
    } catch (error: any) {
      console.error('Error geocoding address:', error);
      return null;
    } finally {
      setIsGeocoding(false);
    }
  }, [addressInput]);

  const handleSelectSuggestion = useCallback(
    async (suggestion: AddressSuggestion): Promise<LocationData | null> => {
      setAddressInput(suggestion.displayName);
      setSuggestions([]);
      Keyboard.dismiss();

      return {
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
        timestamp: Date.now(),
      };
    },
    []
  );

  const clearAddress = useCallback(() => {
    setAddressInput('');
    setSuggestions([]);
  }, []);

  return {
    addressInput,
    setAddressInput,
    suggestions,
    isLoading,
    isGeocoding,
    handleGeocode,
    handleSelectSuggestion,
    clearAddress,
  };
}

