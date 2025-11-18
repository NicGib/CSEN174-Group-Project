import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  Platform,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAddressSearch, AddressSuggestion } from '@/hooks/useAddressSearch';
import { locationService, PlaceDetails } from '@/src/lib/locationService';

interface AddressSearchBarProps {
  onLocationSelect: (location: { latitude: number; longitude: number; address?: string; placeDetails?: PlaceDetails }) => void;
  onClear?: () => void;
  userLocation?: { latitude: number; longitude: number } | null;
  variant?: 'floating' | 'form'; // 'floating' for maps (absolute positioning), 'form' for modals/forms
  placeholder?: string;
  skipPlaceDetails?: boolean; // Skip fetching place details (faster, for forms)
  initialAddress?: string; // Initial address value to display
}

// Helper function to get icon based on result type
const getIconForType = (type?: string): keyof typeof MaterialIcons.glyphMap => {
  if (!type) return 'place';
  const typeLower = type.toLowerCase();
  if (typeLower.includes('city') || typeLower.includes('town') || typeLower.includes('municipality')) {
    return 'location-city';
  }
  if (typeLower.includes('amenity') || typeLower.includes('poi') || typeLower.includes('restaurant') || typeLower.includes('store')) {
    return 'storefront';
  }
  if (typeLower.includes('street') || typeLower.includes('road')) {
    return 'signpost';
  }
  if (typeLower.includes('building') || typeLower.includes('house')) {
    return 'home';
  }
  return 'place';
};

// Helper function to highlight matched text
const highlightText = (text: string, query: string): React.ReactNode => {
  if (!query || !text) return text;
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  const index = textLower.indexOf(queryLower);
  
  if (index === -1) return text;
  
  return (
    <>
      {text.substring(0, index)}
      <Text style={{ fontWeight: '600' }}>{text.substring(index, index + query.length)}</Text>
      {text.substring(index + query.length)}
    </>
  );
};

const RECENT_SEARCHES_KEY = '@trailmix_recent_searches';
const MAX_RECENT_SEARCHES = 5;

/**
 * Address search bar component with autocomplete suggestions
 * Handles address input, suggestions display, and location selection
 */
export function AddressSearchBar({ onLocationSelect, onClear, userLocation, variant = 'floating', placeholder = 'Search', skipPlaceDetails = false, initialAddress }: AddressSearchBarProps) {
  const [showAddressBar, setShowAddressBar] = useState(false); // Start hidden, show when user interacts
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [slideUpAnim] = useState(new Animated.Value(0));
  const [recentSearches, setRecentSearches] = useState<AddressSuggestion[]>([]);
  const isProgrammaticUpdateRef = React.useRef(false); // Track if address is being set programmatically

  const {
    addressInput,
    setAddressInput,
    suggestions,
    isLoading,
    isGeocoding,
    handleGeocode,
    handleSelectSuggestion,
    clearAddress,
    cancelPendingSearch,
  } = useAddressSearch({
    debounceMs: 600, // Wait for a break in typing (600ms pause)
    minInputLength: 2,
    maxResults: 10,
    userLocation: userLocation || null,
    shouldSearch: showAddressBar, // Only search when the search bar is open
  });

  // Initialize address input with initialAddress on mount
  useEffect(() => {
    if (initialAddress) {
      isProgrammaticUpdateRef.current = true;
      setAddressInput(initialAddress);
      // Reset flag after a short delay to allow the update to complete
      setTimeout(() => {
        isProgrammaticUpdateRef.current = false;
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Update address input if initialAddress is provided and addressInput is empty (e.g., after clear)
  // Only update if the value actually changed to avoid unnecessary updates
  const prevInitialAddressRef = React.useRef<string | undefined>(initialAddress);
  useEffect(() => {
    if (initialAddress && !addressInput && initialAddress !== prevInitialAddressRef.current) {
      isProgrammaticUpdateRef.current = true;
      setAddressInput(initialAddress);
      prevInitialAddressRef.current = initialAddress;
      // Reset flag after a short delay
      setTimeout(() => {
        isProgrammaticUpdateRef.current = false;
      }, 100);
    } else if (initialAddress !== prevInitialAddressRef.current) {
      prevInitialAddressRef.current = initialAddress;
    }
  }, [initialAddress, addressInput, setAddressInput]);


  // Load recent searches on mount
  useEffect(() => {
    const loadRecentSearches = async () => {
      try {
        const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
        if (stored) {
          setRecentSearches(JSON.parse(stored));
        }
      } catch (error) {
        console.warn('Failed to load recent searches:', error);
      }
    };
    loadRecentSearches();
  }, []);

  // Save to recent searches when a suggestion is selected
  const saveToRecentSearches = async (suggestion: AddressSuggestion) => {
    try {
      const updated = [suggestion, ...recentSearches.filter(s => 
        s.latitude !== suggestion.latitude || s.longitude !== suggestion.longitude
      )].slice(0, MAX_RECENT_SEARCHES);
      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to save recent search:', error);
    }
  };

  // Get suggestions to display (recent searches if no input, otherwise suggestions)
  const displaySuggestions = useMemo(() => {
    if (addressInput.trim().length < 2 && recentSearches.length > 0 && showAddressBar) {
      return recentSearches;
    }
    return suggestions;
  }, [addressInput, suggestions, recentSearches, showAddressBar]);

  // Listen to keyboard events
  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Animate suggestions sheet when suggestions appear
  useEffect(() => {
    if (showAddressBar && (suggestions.length > 0 || isLoading)) {
      Animated.spring(slideUpAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else if (showAddressBar && suggestions.length === 0 && !isLoading) {
      Animated.spring(slideUpAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    }
  }, [showAddressBar, suggestions.length, isLoading, slideUpAnim]);

  const toggleAddressBar = (show: boolean, shouldClear: boolean = true) => {
    if (!show) {
      // Cancel any pending searches when closing
      cancelPendingSearch();
      // Only clear address and suggestions if shouldClear is true
      if (shouldClear) {
        clearAddress();
      }
    }
    setShowAddressBar(show);
    if (!show) {
      Animated.spring(slideUpAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start(() => {
        // Call onClear callback if provided
        if (shouldClear && onClear) {
          onClear();
        }
        Keyboard.dismiss();
      });
    }
  };

  const handleGeocodePress = async () => {
    const location = await handleGeocode();
    if (location) {
      // Keep the address in the search bar (already set via addressInput)
      onLocationSelect({
        latitude: location.latitude,
        longitude: location.longitude,
        address: addressInput.trim(),
      });
      // Don't clear searched location when closing after selection
      toggleAddressBar(false, false);
    }
  };

  const handleSuggestionSelect = async (suggestion: AddressSuggestion) => {
    // Cancel any pending searches immediately to prevent further API calls
    cancelPendingSearch();
    
    // If skipPlaceDetails is true, just use the suggestion directly without fetching details
    if (skipPlaceDetails) {
      // Save to recent searches
      await saveToRecentSearches(suggestion);
      
      // Use the display name as the address
      const selectedAddress = suggestion.displayName;
      
      // Keep the address in the search bar - set it before calling onLocationSelect
      setAddressInput(selectedAddress);
      
      onLocationSelect({
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
        address: selectedAddress,
        placeDetails: undefined, // Skip place details
      });
      
      // Close the search bar without clearing the address
      toggleAddressBar(false, false);
      return;
    }
    
    // Otherwise, fetch place details as usual
    const result = await handleSelectSuggestion(suggestion);
    if (result) {
      // Log which API provider was used
      const provider = suggestion.provider || 'unknown';
      console.log(`Address selected from ${provider.toUpperCase()}: ${suggestion.displayName}`);
      if (result.placeDetails) {
        const detailsProvider = result.placeDetails.provider || 'unknown';
        console.log(`Place details from ${detailsProvider.toUpperCase()}: ${result.placeDetails.images?.length || 0} images, ${result.placeDetails.categories?.length || 0} categories`);
      }
      
      // Save to recent searches
      await saveToRecentSearches(suggestion);
      
      // Keep the address in the search bar
      setAddressInput(suggestion.displayName);
      onLocationSelect({
        latitude: result.location.latitude,
        longitude: result.location.longitude,
        address: suggestion.displayName,
        placeDetails: result.placeDetails || undefined,
      });
      // Don't clear searched location when closing after selection
      toggleAddressBar(false, false);
    }
  };

  const handleUseCurrentLocation = async () => {
    if (!userLocation) return;
    
    try {
      // Get address for current location
      const address = await locationService.reverseGeocodeForAddress(
        userLocation.latitude,
        userLocation.longitude
      );
      
      onLocationSelect({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        address: address || 'Current Location',
      });
      toggleAddressBar(false, false);
    } catch (error) {
      console.error('Error getting current location address:', error);
      onLocationSelect({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        address: 'Current Location',
      });
      toggleAddressBar(false, false);
    }
  };

  const isFormMode = variant === 'form';

  return (
    <View style={isFormMode ? styles.formContainer : undefined}>
      {/* Collapsed search bar */}
      {!showAddressBar && (
        <TouchableOpacity
          style={isFormMode ? styles.formSearchBarCollapsed : styles.googleSearchBar}
          onPress={() => toggleAddressBar(true)}
          activeOpacity={0.8}
        >
          <MaterialIcons name="search" size={20} color="#5f6368" />
          <Text style={isFormMode ? styles.formSearchBarText : styles.googleSearchBarText} numberOfLines={1}>
            {addressInput || placeholder}
          </Text>
        </TouchableOpacity>
      )}

      {/* Expanded search bar */}
      {showAddressBar && (
        <Animated.View style={isFormMode ? styles.formSearchBar : styles.googleSearchBarExpanded}>
          <View style={isFormMode ? styles.formSearchBarContent : styles.googleSearchBarContent}>
            <MaterialIcons name="search" size={20} color="#5f6368" style={{ marginRight: 12 }} />
            <TextInput
              style={isFormMode ? styles.formSearchInput : styles.googleSearchInput}
              placeholder={placeholder}
              placeholderTextColor="#9aa0a6"
              value={addressInput}
              onChangeText={setAddressInput}
              onSubmitEditing={handleGeocodePress}
              returnKeyType="search"
              autoFocus={showAddressBar}
            />
            {addressInput.length > 0 && (
              <TouchableOpacity onPress={clearAddress} style={styles.googleClearButton}>
                <MaterialIcons name="close" size={18} color="#5f6368" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => toggleAddressBar(false)}
              style={styles.googleBackButton}
            >
              <MaterialIcons name="arrow-back" size={20} color="#5f6368" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Suggestions list - only show when search bar is open */}
      {showAddressBar && (displaySuggestions.length > 0 || isLoading || (isFormMode && addressInput.trim().length < 2 && recentSearches.length > 0)) && (
        <Animated.View
          style={[
            isFormMode ? styles.formSuggestionsSheet : styles.googleSuggestionsSheet,
            isFormMode ? {} : {
              top: Platform.OS === 'ios' ? 120 : 100,
              bottom: Math.max(keyboardHeight, 0),
            },
          ]}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={isFormMode ? styles.formSuggestionsScrollView : styles.googleSuggestionsScrollView}
            contentContainerStyle={styles.googleSuggestionsContent}
            nestedScrollEnabled={true}
          >
            {/* Use Current Location option */}
            {userLocation && addressInput.trim().length < 2 && (
              <TouchableOpacity
                style={styles.googleSuggestionItem}
                onPress={handleUseCurrentLocation}
                activeOpacity={0.7}
              >
                <View style={styles.googleSuggestionIcon}>
                  <MaterialIcons name="my-location" size={24} color="#4285f4" />
                </View>
                <View style={styles.googleSuggestionTextContainer}>
                  <Text style={styles.googleSuggestionTitle}>Use current location</Text>
                  <Text style={styles.googleSuggestionSubtitle}>Tap to use your current location</Text>
                </View>
              </TouchableOpacity>
            )}
            
            {/* Recent searches header */}
            {addressInput.trim().length < 2 && recentSearches.length > 0 && (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>Recent searches</Text>
              </View>
            )}
            
            {isLoading && (
              <View style={[styles.googleSuggestionItem, { justifyContent: 'center' }]}>
                <ActivityIndicator size="small" color="#4285f4" />
                <Text style={styles.googleSuggestionText}>Searching...</Text>
              </View>
            )}
            {displaySuggestions.map((suggestion, index) => {
              const mainText = suggestion.address_line1 || suggestion.displayName.split(',')[0];
              const secondaryText = suggestion.address_line2 || 
                                   (suggestion.displayName.includes(',') 
                                     ? suggestion.displayName.split(',').slice(1).join(',').trim() 
                                     : '');
              
              return (
                <TouchableOpacity
                  key={`${suggestion.latitude}-${suggestion.longitude}-${index}`}
                  style={styles.googleSuggestionItem}
                  onPress={() => handleSuggestionSelect(suggestion)}
                  activeOpacity={0.7}
                >
                  <View style={styles.googleSuggestionIcon}>
                    <MaterialIcons 
                      name={getIconForType(suggestion.result_type)} 
                      size={24} 
                      color="#5f6368" 
                    />
                  </View>
                  <View style={styles.googleSuggestionTextContainer}>
                    <Text style={styles.googleSuggestionTitle} numberOfLines={1}>
                      {highlightText(mainText, addressInput.trim())}
                    </Text>
                    {secondaryText && (
                      <Text style={styles.googleSuggestionSubtitle} numberOfLines={1}>
                        {secondaryText}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  googleSearchBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 1000,
  },
  googleSearchBarText: {
    marginLeft: 12,
    fontSize: 15,
    color: '#5f6368',
    flex: 1,
  },
  googleSearchBarExpanded: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 1000,
  },
  googleSearchBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  googleSearchInput: {
    flex: 1,
    fontSize: 15,
    color: '#202124',
    padding: 0,
    margin: 0,
  },
  googleClearButton: {
    padding: 4,
    marginLeft: 8,
  },
  googleBackButton: {
    padding: 4,
    marginLeft: 8,
  },
  googleSuggestionsSheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 999,
    maxHeight: 400,
  },
  googleSuggestionsScrollView: {
    maxHeight: 400,
  },
  formSuggestionsScrollView: {
    maxHeight: 300,
  },
  googleSuggestionsContent: {
    paddingVertical: 8,
  },
  googleSuggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
    minHeight: 56, // Ensure consistent height
  },
  googleSuggestionIcon: {
    marginRight: 16,
    width: 24, // Fixed width for alignment
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleSuggestionTextContainer: {
    flex: 1,
    justifyContent: 'center', // Vertically center text
  },
  googleSuggestionTitle: {
    fontSize: 15,
    color: '#202124',
    fontWeight: '400',
    marginBottom: 2,
  },
  googleSuggestionSubtitle: {
    fontSize: 13,
    color: '#5f6368',
  },
  googleSuggestionText: {
    fontSize: 15,
    color: '#5f6368',
    marginLeft: 12,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e8eaed',
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5f6368',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Form mode styles
  formContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  formSearchBarCollapsed: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  formSearchBarText: {
    marginLeft: 12,
    fontSize: 15,
    color: '#5f6368',
    flex: 1,
  },
  formSearchBar: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  formSearchBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  formSearchInput: {
    flex: 1,
    fontSize: 15,
    color: '#202124',
    padding: 0,
    margin: 0,
  },
  formSuggestionsSheet: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxHeight: 300,
    zIndex: 1001,
  },
});

