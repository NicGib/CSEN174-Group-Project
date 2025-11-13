import { useState, useEffect, useCallback } from 'react';
import { Keyboard } from 'react-native';
import { locationService, LocationData } from '@/src/lib/locationService';

export interface AddressSuggestion {
  displayName: string;
  latitude: number;
  longitude: number;
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
 */
export function useAddressSearch(
  debounceMs: number = 300,
  minInputLength: number = 3
): UseAddressSearchReturn {
  const [addressInput, setAddressInput] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Debounced address suggestions
  useEffect(() => {
    if (addressInput.length < minInputLength) {
      setSuggestions([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      try {
        const addressSuggestions = await locationService.getAddressSuggestions(addressInput, 5);
        setSuggestions(addressSuggestions);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [addressInput, debounceMs, minInputLength]);

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

