import React, { useState, useEffect } from 'react';
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
import { useAddressSearch, AddressSuggestion } from '@/hooks/useAddressSearch';

interface AddressSearchBarProps {
  onLocationSelect: (location: { latitude: number; longitude: number; address?: string }) => void;
  onClear?: () => void;
  userLocation?: { latitude: number; longitude: number } | null;
}

/**
 * Address search bar component with autocomplete suggestions
 * Handles address input, suggestions display, and location selection
 */
export function AddressSearchBar({ onLocationSelect, onClear, userLocation }: AddressSearchBarProps) {
  const [showAddressBar, setShowAddressBar] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [slideUpAnim] = useState(new Animated.Value(0));

  const {
    addressInput,
    setAddressInput,
    suggestions,
    isLoading,
    isGeocoding,
    handleGeocode,
    handleSelectSuggestion,
    clearAddress,
  } = useAddressSearch({
    debounceMs: 300,
    minInputLength: 2,
    maxResults: 10,
    userLocation: userLocation || null,
  });

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
    setShowAddressBar(show);
    if (!show) {
      Animated.spring(slideUpAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start(() => {
        clearAddress();
        Keyboard.dismiss();
        // Only clear searched location if explicitly closing without selection
        if (shouldClear && onClear) {
          onClear();
        }
      });
    }
  };

  const handleGeocodePress = async () => {
    const location = await handleGeocode();
    if (location) {
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
    const location = await handleSelectSuggestion(suggestion);
    if (location) {
      onLocationSelect({
        latitude: location.latitude,
        longitude: location.longitude,
        address: suggestion.displayName,
      });
      // Don't clear searched location when closing after selection
      toggleAddressBar(false, false);
    }
  };

  return (
    <>
      {/* Collapsed search bar */}
      {!showAddressBar && (
        <TouchableOpacity
          style={styles.googleSearchBar}
          onPress={() => toggleAddressBar(true)}
          activeOpacity={0.8}
        >
          <MaterialIcons name="search" size={20} color="#5f6368" />
          <Text style={styles.googleSearchBarText}>Search</Text>
        </TouchableOpacity>
      )}

      {/* Expanded search bar */}
      {showAddressBar && (
        <Animated.View style={styles.googleSearchBarExpanded}>
          <View style={styles.googleSearchBarContent}>
            <MaterialIcons name="search" size={20} color="#5f6368" style={{ marginRight: 12 }} />
            <TextInput
              style={styles.googleSearchInput}
              placeholder="Search"
              placeholderTextColor="#9aa0a6"
              value={addressInput}
              onChangeText={setAddressInput}
              onSubmitEditing={handleGeocodePress}
              returnKeyType="search"
              autoFocus={true}
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

      {/* Suggestions list */}
      {showAddressBar && (suggestions.length > 0 || isLoading) && (
        <Animated.View
          style={[
            styles.googleSuggestionsSheet,
            {
              top: Platform.OS === 'ios' ? 120 : 100,
              bottom: Math.max(keyboardHeight, 0),
            },
          ]}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={styles.googleSuggestionsScrollView}
            contentContainerStyle={styles.googleSuggestionsContent}
            nestedScrollEnabled={true}
          >
            {isLoading && (
              <View style={[styles.googleSuggestionItem, { justifyContent: 'center' }]}>
                <ActivityIndicator size="small" color="#4285f4" />
                <Text style={styles.googleSuggestionText}>Searching...</Text>
              </View>
            )}
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.googleSuggestionItem}
                onPress={() => handleSuggestionSelect(suggestion)}
                activeOpacity={0.7}
              >
                <View style={styles.googleSuggestionIcon}>
                  <MaterialIcons name="place" size={24} color="#5f6368" />
                </View>
                <View style={styles.googleSuggestionTextContainer}>
                  <Text style={styles.googleSuggestionTitle} numberOfLines={1}>
                    {suggestion.displayName.split(',')[0]}
                  </Text>
                  {suggestion.displayName.includes(',') && (
                    <Text style={styles.googleSuggestionSubtitle} numberOfLines={1}>
                      {suggestion.displayName.split(',').slice(1).join(',').trim()}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      )}
    </>
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
});

