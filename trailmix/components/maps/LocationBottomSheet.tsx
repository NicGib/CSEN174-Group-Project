import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface LocationBottomSheetProps {
  visible: boolean;
  location: { latitude: number; longitude: number; address?: string };
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
    }
  }, [visible, slideAnim]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.container}>
              <View style={styles.content}>
                <View style={styles.handle} />
                <Text style={styles.title} numberOfLines={1}>
                  {location.address || 'Searched Location'}
                </Text>
                <Text style={styles.coordinates}>
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </Text>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={onOpenInMaps}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="map" size={24} color="#4285f4" />
                  <Text style={styles.actionButtonText}>Open in Maps</Text>
                  <MaterialIcons name="chevron-right" size={24} color="#5f6368" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
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
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  content: {
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingHorizontal: 20,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#c0c0c0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 4,
  },
  coordinates: {
    fontSize: 13,
    color: '#5f6368',
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginTop: 8,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#202124',
    marginLeft: 16,
  },
});

