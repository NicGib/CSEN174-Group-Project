import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { EmbeddedMapRef } from './EmbeddedMap';

import { theme } from "@/app/theme";

interface MapControlsProps {
  mapRef: React.RefObject<EmbeddedMapRef | null> | React.MutableRefObject<EmbeddedMapRef | null>;
  onMyLocationPress: () => void;
  onDownloadPress: () => void;
}

/**
 * Map controls component (zoom, my location, download)
 * Handles map interaction controls
 */
export function MapControls({ mapRef, onMyLocationPress, onDownloadPress }: MapControlsProps) {
  const handleZoomIn = () => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut();
  };

  return (
    <View style={styles.mapControls}>
      {/* Zoom controls */}
      <View style={styles.zoomControls}>
        <TouchableOpacity style={styles.zoomButton} onPress={handleZoomIn} activeOpacity={0.7}>
          <MaterialIcons name="add" size={24} color={theme.colors.secondary.dark} />
        </TouchableOpacity>
        <View style={styles.zoomDivider} />
        <TouchableOpacity style={styles.zoomButton} onPress={handleZoomOut} activeOpacity={0.7}>
          <MaterialIcons name="remove" size={24} color={theme.colors.secondary.dark} />
        </TouchableOpacity>
      </View>

      {/* My location button */}
      <TouchableOpacity
        style={styles.myLocationButton}
        onPress={onMyLocationPress}
        activeOpacity={0.7}
      >
        <MaterialIcons name="my-location" size={24} color={theme.colors.support.success} />
      </TouchableOpacity>

      {/* Download button */}
      <TouchableOpacity style={styles.downloadButton} onPress={onDownloadPress} activeOpacity={0.7}>
        <MaterialIcons name="download" size={20} color={theme.colors.secondary.dark} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  mapControls: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    zIndex: 998,
  },
  zoomControls: {
    backgroundColor: theme.colors.secondary.light, //was #fff
    borderRadius: 2,
    shadowColor: theme.colors.secondary.dark, //was #000
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  zoomButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.secondary.light, //was #fff
  },
  zoomDivider: {
    height: 1,
    backgroundColor: '#e8eaed',
  },
  myLocationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.secondary.light, //was #fff
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.secondary.dark, //was #000
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 12,
  },
  downloadButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.secondary.light, //was #fff
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.secondary.dark, //was #000
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
});

