import { useState, useEffect, useCallback, useRef } from 'react';
import { Keyboard } from 'react-native';
import { locationService, LocationData, EnhancedAddressSuggestion, PlaceDetails } from '@/src/lib/locationService';

// Re-export for convenience
export type AddressSuggestion = EnhancedAddressSuggestion;

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
  handleSelectSuggestion: (suggestion: AddressSuggestion) => Promise<{ location: LocationData; placeDetails?: PlaceDetails | null } | null>;
  clearAddress: () => void;
  cancelPendingSearch: () => void;
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
    debounceMs = 600, // Wait for a break in typing (600ms pause)
    minInputLength = 2,
    maxResults = 10,
    userLocation = null,
  } = options;
  const [addressInput, setAddressInput] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const cancelRef = useRef<{ cancelled: boolean; timeoutId?: ReturnType<typeof setTimeout> }>({ cancelled: false });
  const isSelectingRef = useRef(false); // Flag to prevent searching when selecting a suggestion

  // Function to cancel pending searches
  const cancelPendingSearch = useCallback(() => {
    if (cancelRef.current.timeoutId) {
      clearTimeout(cancelRef.current.timeoutId);
      cancelRef.current.timeoutId = undefined;
    }
    cancelRef.current.cancelled = true;
    setIsLoading(false);
  }, []);

  // Debounced address suggestions with optimized retry logic and location bias
  useEffect(() => {
    // Skip searching if we're in the middle of selecting a suggestion
    if (isSelectingRef.current) {
      return;
    }

    // Cancel any pending search
    cancelRef.current.cancelled = true;
    if (cancelRef.current.timeoutId) {
      clearTimeout(cancelRef.current.timeoutId);
    }

    // Normalize the input: trim and collapse multiple spaces
    const normalizedInput = addressInput.trim().replace(/\s+/g, ' ');
    
    if (normalizedInput.length < minInputLength) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    // Reset cancellation flag for new search
    cancelRef.current.cancelled = false;
    
    const timeoutId = setTimeout(async () => {
      if (cancelRef.current.cancelled) return;
      
      // Re-normalize in case input changed during debounce
      const finalInput = addressInput.trim().replace(/\s+/g, ' ');
      if (finalInput.length < minInputLength) {
        setSuggestions([]);
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      let retries = 1; // Reduced from 2 to 1 for faster failure handling
      let lastError: any = null;
      
      while (retries >= 0 && !cancelRef.current.cancelled) {
        try {
          // Pass normalized input and user location for location bias if available
          const addressSuggestions = await locationService.getAddressSuggestions(
            finalInput,
            maxResults,
            userLocation ? { userLocation } : undefined
          );
          
          if (!cancelRef.current.cancelled) {
            setSuggestions(addressSuggestions || []);
            setIsLoading(false);
            return;
          }
        } catch (error) {
          if (cancelRef.current.cancelled) return;
          
          lastError = error;
          console.error(`Error fetching suggestions (${1 - retries + 1}/2):`, error);
          if (retries > 0) {
            // Reduced wait time for faster retry
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          retries--;
        }
      }
      
      if (!cancelRef.current.cancelled) {
        console.error('Failed to fetch suggestions after retries:', lastError);
        setSuggestions([]);
        setIsLoading(false);
      }
    }, debounceMs);

    cancelRef.current.timeoutId = timeoutId;

    return () => {
      cancelRef.current.cancelled = true;
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
    async (suggestion: AddressSuggestion): Promise<{ location: LocationData; placeDetails?: PlaceDetails | null } | null> => {
      // Set flag to prevent new searches while we're setting the address
      isSelectingRef.current = true;
      
      // Cancel any pending searches immediately
      cancelPendingSearch();
      
      // Get canonical formatted address via reverse geocoding
      let displayAddress = suggestion.displayName;
      try {
        const canonicalAddress = await locationService.reverseGeocodeForAddress(
          suggestion.latitude,
          suggestion.longitude
        );
        if (canonicalAddress) {
          displayAddress = canonicalAddress;
        }
      } catch (error) {
        console.warn('Reverse geocoding failed, using suggestion address:', error);
      }

      // Fetch place details if this is a Google or Geoapify result
      let placeDetails: PlaceDetails | null = null;
      // Fetch place details for both Google and Geoapify (they both support place_id)
      if (suggestion.provider === 'google' || suggestion.provider === 'geoapify') {
        try {
          placeDetails = await locationService.getPlaceDetails(
            suggestion.latitude,
            suggestion.longitude,
            suggestion.place_id, // Pass place_id
            suggestion.provider as 'google' | 'geoapify' // Pass provider so it knows which API to use
          );
          if (placeDetails) {
            // Use place details address if available and better
            if (placeDetails.formatted && placeDetails.formatted !== displayAddress) {
              displayAddress = placeDetails.formatted;
            } else if (placeDetails.address_line1 && placeDetails.address_line2) {
              displayAddress = `${placeDetails.address_line1}, ${placeDetails.address_line2}`;
            }
          }
        } catch (error) {
          console.warn('Failed to fetch place details:', error);
        }
      }

      setAddressInput(displayAddress);
      setSuggestions([]);
      setIsLoading(false); // Ensure loading is stopped
      Keyboard.dismiss();

      // Reset flag after a short delay to allow the input to be set
      setTimeout(() => {
        isSelectingRef.current = false;
      }, 100);

      return {
        location: {
          latitude: suggestion.latitude,
          longitude: suggestion.longitude,
          timestamp: Date.now(),
        },
        placeDetails,
      };
    },
    [cancelPendingSearch]
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
    cancelPendingSearch,
  };
}

