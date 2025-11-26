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
  shouldSearch?: boolean; // Whether to trigger searches (e.g., when search bar is open)
}

interface UseAddressSearchReturn {
  addressInput: string;
  setAddressInput: (value: string, skipSearch?: boolean) => void;
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
    shouldSearch = true, // Default to true for backward compatibility
  } = options;
  const [addressInput, setAddressInput] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const cancelRef = useRef<{ cancelled: boolean; timeoutId?: ReturnType<typeof setTimeout> }>({ cancelled: false });
  const isSelectingRef = useRef(false); // Flag to prevent searching when selecting a suggestion
  const skipNextSearchRef = useRef(false); // Flag to skip the next search (for programmatic updates)
  const previousInputRef = useRef(''); // Track previous input to detect actual changes

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
    // Normalize the input: trim and collapse multiple spaces (do this first for consistent comparison)
    const normalizedInput = addressInput.trim().replace(/\s+/g, ' ');
    
    // Skip searching if we're in the middle of selecting a suggestion
    if (isSelectingRef.current) {
      previousInputRef.current = normalizedInput;
      return;
    }

    // Skip searching if this is a programmatic update
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      previousInputRef.current = normalizedInput;
      return;
    }

    // Don't search if normalized input hasn't actually changed (prevents unnecessary searches)
    // But allow search if there's a pending timeout (user might have typed, then deleted, then typed again)
    if (normalizedInput === previousInputRef.current && !cancelRef.current.timeoutId) {
      // console.log('[useAddressSearch] Skipping search - input unchanged:', normalizedInput);
      return;
    }
    
    // console.log('[useAddressSearch] Input changed, will search:', {
    //   previous: previousInputRef.current,
    //   current: normalizedInput,
    //   shouldSearch,
    //   hasPendingTimeout: !!cancelRef.current.timeoutId
    // });

    // Don't search if shouldSearch is false (e.g., search bar is closed)
    if (!shouldSearch) {
      // Cancel any pending search and clear suggestions
      cancelRef.current.cancelled = true;
      if (cancelRef.current.timeoutId) {
        clearTimeout(cancelRef.current.timeoutId);
        cancelRef.current.timeoutId = undefined;
      }
      setSuggestions([]);
      setIsLoading(false);
      previousInputRef.current = normalizedInput; // Update ref even when not searching
      return;
    }

    // Cancel any pending search
    if (cancelRef.current.timeoutId) {
      clearTimeout(cancelRef.current.timeoutId);
      cancelRef.current.timeoutId = undefined;
    }
    cancelRef.current.cancelled = true;
    
    // Don't search if input is too short - clear suggestions instead
    if (normalizedInput.length < minInputLength) {
      setSuggestions([]);
      setIsLoading(false);
      previousInputRef.current = normalizedInput; // Update ref even when too short
      // Don't reset cancelled flag here - it will be reset when a valid search starts
      return;
    }

    // Update previous input ref when we start a new search (before debounce)
    // This prevents duplicate searches even if the previous one gets cancelled
    previousInputRef.current = normalizedInput;
    
    // Reset cancellation flag for new search
    cancelRef.current.cancelled = false;
    
    // Capture the normalized input at the time the timeout is set
    const searchInput = normalizedInput;
    
    const timeoutId = setTimeout(async () => {
      // Check if this specific timeout was cancelled
      if (cancelRef.current.cancelled || cancelRef.current.timeoutId !== timeoutId) {
        // console.log('[useAddressSearch] Search cancelled before starting');
        return;
      }
      
      // Re-check the current input to see if it changed during debounce
      const currentNormalized = addressInput.trim().replace(/\s+/g, ' ');
      
      // If input changed during debounce, don't search (a new search will be triggered)
      if (currentNormalized !== searchInput) {
        // console.log('[useAddressSearch] Input changed during debounce, skipping search');
        // Clear the timeout ID since we're not searching
        if (cancelRef.current.timeoutId === timeoutId) {
          cancelRef.current.timeoutId = undefined;
        }
        return;
      }
      
      if (currentNormalized.length < minInputLength) {
        setSuggestions([]);
        setIsLoading(false);
        // Clear the timeout ID
        if (cancelRef.current.timeoutId === timeoutId) {
          cancelRef.current.timeoutId = undefined;
        }
        return;
      }
      
      // Mark that we're starting the search
      setIsLoading(true);
      // console.log('[useAddressSearch] Starting search for:', currentNormalized);
      let retries = 1; // Reduced from 2 to 1 for faster failure handling
      let lastError: any = null;
      
      // Capture the timeoutId to check if we're still the active search
      const activeTimeoutId = timeoutId;
      
      while (retries >= 0) {
        // Check if this search was cancelled or superseded
        if (cancelRef.current.cancelled || cancelRef.current.timeoutId !== activeTimeoutId) {
          // console.log('[useAddressSearch] Search cancelled during execution');
          setIsLoading(false);
          return;
        }
        
        try {
          // Pass normalized input and user location for location bias if available
          const addressSuggestions = await locationService.getAddressSuggestions(
            currentNormalized,
            maxResults,
            userLocation ? { userLocation } : undefined
          );
          
          // Check again if we're still the active search before setting results
          if (cancelRef.current.timeoutId === activeTimeoutId && !cancelRef.current.cancelled) {
            const finalCheck = addressInput.trim().replace(/\s+/g, ' ');
            // Only update if input hasn't changed (allow same input to update results)
            if (finalCheck === currentNormalized || finalCheck.startsWith(currentNormalized)) {
              // console.log('[useAddressSearch] Search completed, got', addressSuggestions?.length || 0, 'suggestions');
              setSuggestions(addressSuggestions || []);
              setIsLoading(false);
              // Clear the timeout ID since this search completed
              if (cancelRef.current.timeoutId === activeTimeoutId) {
                cancelRef.current.timeoutId = undefined;
              }
              return;
            } else {
              // console.log('[useAddressSearch] Input changed after search completed, discarding results');
            }
          }
        } catch (error) {
          // Check if cancelled before handling error
          if (cancelRef.current.cancelled || cancelRef.current.timeoutId !== activeTimeoutId) {
            // console.log('[useAddressSearch] Search cancelled during error handling');
            setIsLoading(false);
            return;
          }
          
          lastError = error;
          console.error(`Error fetching suggestions (${1 - retries + 1}/2):`, error);
          if (retries > 0) {
            // Reduced wait time for faster retry
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          retries--;
        }
      }
      
      // Handle final failure case
      if (cancelRef.current.timeoutId === activeTimeoutId && !cancelRef.current.cancelled) {
        console.error('Failed to fetch suggestions after retries:', lastError);
        setSuggestions([]);
        setIsLoading(false);
        // Clear the timeout ID since this search completed (even if it failed)
        cancelRef.current.timeoutId = undefined;
      }
    }, debounceMs);

    cancelRef.current.timeoutId = timeoutId;

    return () => {
      cancelRef.current.cancelled = true;
      if (cancelRef.current.timeoutId) {
        clearTimeout(cancelRef.current.timeoutId);
        cancelRef.current.timeoutId = undefined;
      }
      // Reset loading state when effect is cleaned up (e.g., input changed or component unmounted)
      setIsLoading(false);
    };
  }, [addressInput, debounceMs, minInputLength, maxResults, userLocation, shouldSearch]);

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
      skipNextSearchRef.current = true; // Also skip search for programmatic update
      
      // Cancel any pending searches immediately and reset loading state
      cancelPendingSearch();
      setIsLoading(false);
      setSuggestions([]);
      
      // Update address input immediately with the suggestion's display name
      // This ensures the address bar updates right away
      setAddressInput(suggestion.displayName);
      
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

      // Update address input with the final canonical address if it changed
      if (displayAddress !== suggestion.displayName) {
        skipNextSearchRef.current = true; // Skip search for this programmatic update too
        setAddressInput(displayAddress);
      }
      
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
    skipNextSearchRef.current = true; // Skip search when clearing
    cancelPendingSearch(); // Cancel any pending searches
    setAddressInput('');
    setSuggestions([]);
    previousInputRef.current = '';
    setIsLoading(false);
  }, [cancelPendingSearch]);
  
  // Wrapper for setAddressInput that allows skipping search
  const setAddressInputWithSkip = useCallback((value: string, skipSearch: boolean = false) => {
    if (skipSearch) {
      skipNextSearchRef.current = true;
    }
    setAddressInput(value);
  }, []);

  return {
    addressInput,
    setAddressInput: setAddressInputWithSkip,
    suggestions,
    isLoading,
    isGeocoding,
    handleGeocode,
    handleSelectSuggestion,
    clearAddress,
    cancelPendingSearch,
  };
}

