import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  Image,
  ScrollView,
  PanResponder,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { PlaceDetails } from '@/src/lib/locationService';

import { theme } from "@/app/theme";

interface LocationBottomSheetProps {
  visible: boolean;
  location: { latitude: number; longitude: number; address?: string; placeDetails?: PlaceDetails };
  onClose: () => void;
  onOpenInMaps: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Bottom sheet component for searched location actions
 * Slides up from bottom with options to interact with the location
 */
export function LocationBottomSheet({
  visible,
  location,
  onClose,
  onOpenInMaps,
}: LocationBottomSheetProps) {
  const slideAnim = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const panY = React.useRef(new Animated.Value(0)).current;
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const imageScrollViewRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
      // Reset expanded state when sheet closes
      setCategoriesExpanded(false);
      panY.setValue(0);
      isDragging.current = false;
    }
  }, [visible, slideAnim, panY]);

  // Pan responder for dragging the sheet up and down
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => {
        // Only start if we're at the top of the scroll view
        return scrollY.current <= 0;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const isVertical = Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
        // Allow dragging when at the top and moving vertically
        if (isVertical && Math.abs(gestureState.dy) > 5 && scrollY.current <= 0) {
          isDragging.current = true;
          return true;
        }
        return false;
      },
      onPanResponderGrant: () => {
        isDragging.current = true;
        const currentValue = (panY as any).__getValue ? (panY as any).__getValue() : 0;
        panY.setOffset(currentValue);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (!isDragging.current) return;
        // Allow up (negative) and down (positive), but don't let it go above 0
        const next = Math.max(-120, gestureState.dy); // let user pull up ~120px
        panY.setValue(next);
      },
      onPanResponderRelease: (evt, gestureState) => {
        isDragging.current = false;
        panY.flattenOffset();
        // If dragged down more than 100px or with velocity, close the sheet
        if (gestureState.dy > 100 || gestureState.vy > 0.8) {
          onClose();
        } else {
          // Spring back to original position
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
        panY.flattenOffset();
        Animated.spring(panY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }).start();
      },
    })
  ).current;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop sits behind the sheet and handles taps to close */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        
        {/* The sheet is NOT wrapped by the backdrop touchable */}
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [
                { translateY: Animated.add(slideAnim, panY) },
              ],
            },
          ]}
        >
          <View style={styles.container}>
            {/* Draggable handle */}
            <View 
              {...panResponder.panHandlers}
              style={styles.handleContainer}
            >
              <View style={styles.handle} />
            </View>
            
            <ScrollView 
              ref={scrollViewRef}
              style={styles.content}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.contentContainer}
              directionalLockEnabled={true}
              scrollEventThrottle={16}
              onScroll={(event) => {
                scrollY.current = event.nativeEvent.contentOffset.y;
              }}
              onScrollBeginDrag={() => {
                // Reset dragging flag when user starts scrolling
                if (isDragging.current) {
                  isDragging.current = false;
                }
              }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Place Images */}
              {location.placeDetails?.images && location.placeDetails.images.length > 0 && (
                <View style={styles.imageScrollContainer}>
                  <ScrollView
                    ref={imageScrollViewRef}
                    horizontal
                    showsHorizontalScrollIndicator={true}
                    nestedScrollEnabled={true}
                    onStartShouldSetResponder={() => true}
                    onStartShouldSetResponderCapture={(e) => {
                      touchStartX.current = e.nativeEvent.pageX;
                      touchStartY.current = e.nativeEvent.pageY;
                      return false;
                    }}
                    onMoveShouldSetResponder={(e) => {
                      const dx = Math.abs(e.nativeEvent.pageX - touchStartX.current);
                      const dy = Math.abs(e.nativeEvent.pageY - touchStartY.current);
                      return dx > dy && dx > 10; // prefer horizontal drags
                    }}
                    scrollEventThrottle={16}
                    decelerationRate="fast"
                    bounces={false}
                    directionalLockEnabled={true}
                    contentContainerStyle={styles.imageScrollContent}
                  >
                    {location.placeDetails.images.map((imageUrl, index) => (
                      <View key={`image-container-${index}`} style={styles.imageWrapper}>
                        <Image
                          source={{ uri: imageUrl }}
                          style={styles.placeImage}
                          resizeMode="cover"
                        />
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

                <Text style={styles.title} numberOfLines={2}>
                  {location.placeDetails?.name || location.address || 'Searched Location'}
                </Text>
                
                {location.placeDetails?.address_line1 && (
                  <Text style={styles.addressLine} numberOfLines={1}>
                    {location.placeDetails.address_line1}
                  </Text>
                )}
                
                {(location.placeDetails?.address_line2 || location.address) && (
                  <Text style={styles.addressLine} numberOfLines={1}>
                    {location.placeDetails?.address_line2 || location.address}
                  </Text>
                )}

                <Text style={styles.coordinates}>
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </Text>

                {/* Place Details */}
                {location.placeDetails && (
                  <View style={styles.detailsContainer}>
                    {/* Debug: Show provider */}
                    {location.placeDetails.provider && (
                      <View style={styles.debugRow}>
                        <Text style={styles.debugText}>
                          Provider: {location.placeDetails.provider.toUpperCase()}
                        </Text>
                      </View>
                    )}
                    {location.placeDetails.phone && (
                      <View style={styles.detailRow}>
                        <MaterialIcons name="phone" size={20} color={theme.colors.secondary.medium} />
                        <Text style={styles.detailText}>{location.placeDetails.phone}</Text>
                      </View>
                    )}
                    
                    {location.placeDetails.website && (
                      <View style={styles.detailRow}>
                        <MaterialIcons name="language" size={20} color={theme.colors.secondary.medium} />
                        <Text style={styles.detailText} numberOfLines={1}>{location.placeDetails.website}</Text>
                      </View>
                    )}
                    
                    {location.placeDetails.opening_hours?.open_now !== undefined && (
                      <View style={styles.detailRow}>
                        <MaterialIcons 
                          name={location.placeDetails.opening_hours.open_now ? "check-circle" : "cancel"} 
                          size={20} 
                          color={location.placeDetails.opening_hours.open_now ? theme.colors.support.success : theme.colors.support.error} 
                        />
                        <Text style={styles.detailText}>
                          {location.placeDetails.opening_hours.open_now ? "Open now" : "Closed"}
                        </Text>
                      </View>
                    )}
                    
                    {location.placeDetails.rating && (
                      <View style={styles.detailRow}>
                        <MaterialIcons name="star" size={20} color={theme.colors.support.warning} />
                        <Text style={styles.detailText}>{location.placeDetails.rating.toFixed(1)} / 5.0</Text>
                      </View>
                    )}
                    
                    {/* Categories - Always show if available */}
                    {location.placeDetails.categories && location.placeDetails.categories.length > 0 ? (
                      <View style={styles.categoriesSection}>
                        <TouchableOpacity
                          onPress={() => setCategoriesExpanded(!categoriesExpanded)}
                          style={styles.categoriesHeader}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.categoriesHeaderText}>
                            Categories ({location.placeDetails.categories.length})
                          </Text>
                          <MaterialIcons
                            name={categoriesExpanded ? "expand-less" : "expand-more"}
                            size={20}
                            color={theme.colors.secondary.medium}
                          />
                        </TouchableOpacity>
                        {categoriesExpanded ? (
                          <View>
                            <View style={styles.categoriesContainer}>
                              {location.placeDetails.categories.map((category, index) => (
                                <View key={index} style={styles.categoryTag}>
                                  <Text style={styles.categoryText}>{String(category)}</Text>
                                </View>
                              ))}
                            </View>
                            {/* Show raw category data for debugging */}
                            {location.placeDetails.categoriesRaw && (
                              <View style={styles.rawDataContainer}>
                                <Text style={styles.rawDataLabel}>Raw Category Data:</Text>
                                <Text style={styles.rawDataText}>
                                  {typeof location.placeDetails.categoriesRaw === 'object' 
                                    ? JSON.stringify(location.placeDetails.categoriesRaw, null, 2)
                                    : String(location.placeDetails.categoriesRaw)}
                                </Text>
                              </View>
                            )}
                          </View>
                        ) : (
                          <View style={styles.categoriesContainer}>
                            {location.placeDetails.categories.slice(0, 3).map((category, index) => (
                              <View key={index} style={styles.categoryTag}>
                                <Text style={styles.categoryText}>{String(category)}</Text>
                              </View>
                            ))}
                            {location.placeDetails.categories.length > 3 && (
                              <Text style={styles.moreCategoriesText}>
                                +{location.placeDetails.categories.length - 3} more
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                    ) : (
                      <View style={styles.categoriesSection}>
                        <Text style={styles.noCategoriesText}>No categories available</Text>
                        {/* Show raw data even if no categories extracted */}
                        {location.placeDetails.categoriesRaw && (
                          <View style={styles.rawDataContainer}>
                            <Text style={styles.rawDataLabel}>Raw Category Data (not parsed):</Text>
                            <Text style={styles.rawDataText}>
                              {typeof location.placeDetails.categoriesRaw === 'object' 
                                ? JSON.stringify(location.placeDetails.categoriesRaw, null, 2)
                                : String(location.placeDetails.categoriesRaw)}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                )}

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={onOpenInMaps}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="map" size={24} color={theme.colors.support.success} />
                  <Text style={styles.actionButtonText}>Open in Maps</Text>
                  <MaterialIcons name="chevron-right" size={24} color={theme.colors.secondary.medium} />
                </TouchableOpacity>
              </ScrollView>
            </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    height: Math.round(SCREEN_HEIGHT * 0.9), // Give it a real height so ScrollView can flex
    backgroundColor: theme.colors.neutrallight.white, //was #fff // Make it opaque (avoid translucent stacking issues)
    zIndex: 10, // iOS stacking
    ...Platform.select({
      android: { elevation: 10 }, // Android stacking
    }),
  },
  container: {
    flex: 1, // Let children (the ScrollView) fill the sheet
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: theme.colors.secondary.light, //was #fff
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingHorizontal: 20,
  },
  imageScrollContainer: {
    height: 180,
    marginBottom: 16,
    marginHorizontal: -20,
  },
  imageScrollContent: {
    paddingHorizontal: 20,
    paddingRight: 8,
  },
  imageWrapper: {
    marginRight: 12,
  },
  placeImage: {
    width: 280,
    height: 180,
    borderRadius: 12,
    backgroundColor: theme.colors.neutrallight.white, //was #f0f0f0
  },
  handleContainer: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.secondary.medium, //was #c0c0c0
    borderRadius: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'InterSemiBold',
    color: theme.colors.secondary.dark, //was #202124
    marginBottom: 4,
  },
  addressLine: {
    fontSize: 14,
    fontFamily: 'Inter',
    fontWeight: '400',
    color: theme.colors.secondary.medium, //was #5f6368
    marginBottom: 2,
  },
  coordinates: {
    fontSize: 12,
    color: theme.colors.secondary.medium, //was 9aa0a6
    marginTop: 8,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  detailsContainer: {
    marginBottom: 16,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailText: {
    fontSize: 14,
    fontFamily: 'Inter',
    fontWeight: '400',
    color: theme.colors.secondary.dark, //was #202124
    flex: 1,
  },
  categoriesSection: {
    marginTop: 4,
  },
  categoriesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoriesHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'InterSemiBold',
    color: theme.colors.secondary.dark, //was #202124
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryTag: {
    backgroundColor: '#e8f0fe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: theme.colors.support.success, //was #1967d2
    fontWeight: '500',
  },
  moreCategoriesText: {
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '400',
    color: theme.colors.secondary.medium, //was #5f6368
    fontStyle: 'italic',
    alignSelf: 'center',
    paddingVertical: 6,
  },
  noCategoriesText: {
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '400',
    color: theme.colors.secondary.medium, //was 9aa0a6
    fontStyle: 'italic',
  },
  debugRow: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: theme.colors.neutrallight.white, //was #f5f5f5
    borderRadius: 4,
  },
  debugText: {
    fontSize: 11,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  rawDataContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: theme.colors.neutrallight.white, //was #f8f9fa
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.neutrallight.lightgray, //was #e8eaed
  },
  rawDataLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'InterSemiBold',
    color: theme.colors.secondary.medium, //was #5f6368
    marginBottom: 6,
  },
  rawDataText: {
    fontSize: 10,
    color: theme.colors.secondary.dark, //was #202124
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 14,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.neutrallight.white, //was #f8f9fa
    borderRadius: 12,
    marginTop: 8,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter',
    fontWeight: '500',
    color: theme.colors.secondary.dark, //was #202124
    marginLeft: 16,
  },
});

