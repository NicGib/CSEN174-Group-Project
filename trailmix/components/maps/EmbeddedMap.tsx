import React, { useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { LocationData } from '@/src/lib/locationService';

interface EmbeddedMapProps {
  location: LocationData | null;
  defaultLatitude?: number;
  defaultLongitude?: number;
  onLocationUpdate?: (location: LocationData) => void;
}

export interface EmbeddedMapRef {
  updateLocation: (lat: number, lng: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

/**
 * Embedded map component using Leaflet/OpenStreetMap
 * Handles map rendering and location updates
 */
export const EmbeddedMap = forwardRef<EmbeddedMapRef, EmbeddedMapProps>(
  ({ location, defaultLatitude = 37.3496, defaultLongitude = -121.9390, onLocationUpdate }, ref) => {
    const mapRef = React.useRef<any>(null);

  // Generate HTML with initial coordinates from React
  const generateMapHTML = useCallback((initialLat: number, initialLng: number) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        body { margin: 0; padding: 0; }
        #map { width: 100%; height: 100vh; }
        .custom-marker {
            position: relative;
            margin: 0;
            padding: 0;
            border: none;
            background: transparent;
        }
        .marker-wrapper {
            position: relative;
            width: 16px;
            height: 16px;
            margin: 0;
            padding: 0;
            isolation: isolate; /* Forces isolated stacking context like Google Maps */
            z-index: 10;
        }
        .dot {
            position: absolute;
            width: 10px;
            height: 10px;
            background: #617337;
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 3; /* Top-most */
            will-change: transform; /* Optimize for animation */
        }
        .pulse {
            position: absolute;
            width: 10px;
            height: 10px;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #617337;
            border-radius: 50%;
            opacity: 0.4;
            z-index: 1; /* Behind dot */
            animation: pulse-green 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            will-change: transform, opacity; /* Optimize for animation */
        }
        @keyframes pulse-green {
            0% {
                transform: translate(-50%, -50%) scale(1);
                opacity: 0.4;
            }
            100% {
                transform: translate(-50%, -50%) scale(2.4);
                opacity: 0;
            }
        }
    </style>
</head>
<body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        // Google Maps-style location dot with pulsing animation
        // Wrapper creates proper stacking context for Leaflet
        const customIcon = L.divIcon({
            className: 'custom-marker',
            html: '<div class="marker-wrapper"><div class="pulse"></div><div class="dot"></div></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8], // Center of 16x16 container
            popupAnchor: [0, -8]
        });
        
        // One-time setup - initialize map only once with initial coordinates
        if (!window.mapInstance) {
            window.mapInstance = L.map('map', {
                zoomControl: false
            }).setView([${initialLat}, ${initialLng}], 15);
            
            // Use CartoDB Positron for a cleaner, Google Maps-like appearance
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                attribution: '© OpenStreetMap contributors © CARTO',
                subdomains: 'abcd',
                maxZoom: 19
            }).addTo(window.mapInstance);
            
            // Remove any existing marker if it exists (safety check)
            if (window.markerInstance) {
                try {
                    window.mapInstance.removeLayer(window.markerInstance);
                } catch(e) {}
            }
            
            // Remove any existing accuracy circle if it exists (safety check)
            if (window.accuracyCircle) {
                try {
                    window.mapInstance.removeLayer(window.accuracyCircle);
                } catch(e) {}
            }
            
            // Create accuracy circle FIRST (so it's below the marker)
            // Circle center must match marker position exactly
            window.accuracyCircle = L.circle([${initialLat}, ${initialLng}], {
                radius: 25,
                color: '#617337',
                fillColor: '#617337',
                fillOpacity: 0.15,
                weight: 2,
                opacity: 0.5,
                pane: 'overlayPane' // Ensure it's in the overlay layer
            }).addTo(window.mapInstance);
            
            // Create marker AFTER circle (so it's on top)
            // Start at initial position from React
            window.markerInstance = L.marker([${initialLat}, ${initialLng}], {
                icon: customIcon,
                zIndexOffset: 1000 // Ensure marker is above circle
            }).addTo(window.mapInstance);
            
            // Bind popup once
            window.markerInstance.bindPopup('');
        }
        
        // Process any pending updates that arrived before updateLocation was defined
        if (window.__pendingUpdates && window.__pendingUpdates.length) {
            const queue = window.__pendingUpdates.splice(0);
            queue.forEach(([lat, lng, accuracy]) => {
                if (window.updateLocation) {
                    window.updateLocation(lat, lng, accuracy);
                }
            });
        }
        
        // Called from React Native to update position and accuracy
        window.updateLocation = function(newLat, newLng, accuracyMeters) {
            if (!window.mapInstance || !window.markerInstance) return;
            
            // Update marker position - this is the exact coordinate
            window.markerInstance.setLatLng([newLat, newLng]);
            
            // Update accuracy circle position and radius FIRST
            // Circle center must match marker position exactly
            if (window.accuracyCircle) {
                window.accuracyCircle.setLatLng([newLat, newLng]);
                // Use accuracy in meters, default to 25m if not provided
                const radius = accuracyMeters && accuracyMeters > 0 ? accuracyMeters : 25;
                window.accuracyCircle.setRadius(radius);
                // Ensure circle stays below marker
                window.accuracyCircle.bringToBack();
            }
            
            // Ensure marker is on top
            if (window.markerInstance) {
                window.markerInstance.bringToFront();
            }
            
            // Update popup content (don't rebind, just update)
            const accuracyText = accuracyMeters ? 'Accuracy: ' + accuracyMeters.toFixed(0) + 'm<br>' : '';
            const html = 'Your Location<br>' + accuracyText + 'Lat: ' + newLat.toFixed(6) + '<br>Lng: ' + newLng.toFixed(6);
            const popup = window.markerInstance.getPopup();
            if (popup) {
                popup.setContent(html);
            } else {
                window.markerInstance.bindPopup(html);
            }
            
            // Keep current zoom; just recenter
            window.mapInstance.setView([newLat, newLng], window.mapInstance.getZoom());
        };
    </script>
</body>
</html>
    `;
  }, []);

  // Track last sent location to avoid duplicate updates
  const lastSentRef = React.useRef<{ lat: number; lng: number } | null>(null);

  const updateMapLocation = useCallback(
    (lat: number, lng: number, locationData?: LocationData | null) => {
      if (!mapRef.current) return;

      // Only update if location actually changed (helps with high-frequency trackers)
      const last = lastSentRef.current;
      if (last && Math.abs(last.lat - lat) < 1e-7 && Math.abs(last.lng - lng) < 1e-7) {
        return;
      }

      lastSentRef.current = { lat, lng };

      // Get accuracy from locationData if available
      const accuracy = locationData?.accuracy ? Math.round(locationData.accuracy) : null;
      
      // Safe update: queue if updateLocation not ready yet
      const updateScript = `
        (function(){
          if (window.updateLocation) {
            window.updateLocation(${lat}, ${lng}, ${accuracy || 'null'});
          } else {
            window.__pendingUpdates = window.__pendingUpdates || [];
            window.__pendingUpdates.push([${lat}, ${lng}, ${accuracy || 'null'}]);
          }
        })();
      `;
      (mapRef.current as any)?.injectJavaScript(updateScript);
    },
    []
  );

  const zoomIn = useCallback(() => {
    if (mapRef.current) {
      const zoomScript = `if (window.mapInstance) { window.mapInstance.zoomIn(); }`;
      (mapRef.current as any)?.injectJavaScript(zoomScript);
    }
  }, []);

  const zoomOut = useCallback(() => {
    if (mapRef.current) {
      const zoomScript = `if (window.mapInstance) { window.mapInstance.zoomOut(); }`;
      (mapRef.current as any)?.injectJavaScript(zoomScript);
    }
  }, []);

  useImperativeHandle(ref, () => ({
    updateLocation: updateMapLocation,
    zoomIn,
    zoomOut,
  }));

  // Memoize HTML with initial coordinates from React
  const staticHTML = React.useMemo(
    () => generateMapHTML(
      location?.latitude ?? defaultLatitude,
      location?.longitude ?? defaultLongitude
    ),
    [location?.latitude, location?.longitude, defaultLatitude, defaultLongitude, generateMapHTML]
  );

  // Update map when location changes (debounced by updateMapLocation)
  useEffect(() => {
    if (location) {
      updateMapLocation(location.latitude, location.longitude, location);
      if (onLocationUpdate) {
        onLocationUpdate(location);
      }
    }
  }, [location, updateMapLocation, onLocationUpdate]);

  return (
    <View style={styles.container}>
      <WebView
        key="map-webview"
        ref={mapRef}
        style={styles.webview}
        source={{ html: staticHTML }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        onLoadEnd={() => {
          // Update location if it changed after initial render
          // The map already starts at the correct location from staticHTML
          if (location) {
            // Only update if location actually changed from initial
            const initialLat = location?.latitude ?? defaultLatitude;
            const initialLng = location?.longitude ?? defaultLongitude;
            const currentLat = location.latitude;
            const currentLng = location.longitude;
            
            // Only update if coordinates differ (avoid unnecessary updates)
            if (Math.abs(currentLat - initialLat) > 1e-6 || Math.abs(currentLng - initialLng) > 1e-6) {
              updateMapLocation(currentLat, currentLng, location);
            }
          }
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});

EmbeddedMap.displayName = 'EmbeddedMap';

