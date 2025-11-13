import React, { useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { LocationData } from '@/src/lib/locationService';

interface UserProfileData {
  uid?: string;
  name?: string;
  username?: string;
  profilePicture?: string;
  totalHikes?: number;
  totalDistance?: number;
  achievements?: string[];
  hikingLevel?: string;
}

interface EmbeddedMapProps {
  location: LocationData | null;
  searchedLocation?: { latitude: number; longitude: number; address?: string } | null;
  userProfile?: UserProfileData | null;
  defaultLatitude?: number;
  defaultLongitude?: number;
  onLocationUpdate?: (location: LocationData) => void;
  onSearchedLocationClick?: (location: { latitude: number; longitude: number; address?: string }) => void;
}

export interface EmbeddedMapRef {
  updateLocation: (lat: number, lng: number, shouldCenter?: boolean) => void;
  setSearchedLocation: (lat: number, lng: number, address?: string) => void;
  clearSearchedLocation: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

/**
 * Embedded map component using Leaflet/OpenStreetMap
 * Handles map rendering and location updates
 */
export const EmbeddedMap = forwardRef<EmbeddedMapRef, EmbeddedMapProps>(
  ({ location, searchedLocation, userProfile, defaultLatitude = 37.3496, defaultLongitude = -121.9390, onLocationUpdate, onSearchedLocationClick }, ref) => {
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
        /* Custom popup styling - remove default Leaflet popup padding/margin */
        .custom-profile-popup .leaflet-popup-content-wrapper {
            padding: 0;
            border-radius: 0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .custom-profile-popup .leaflet-popup-content {
            margin: 0;
            width: auto !important;
        }
        .custom-profile-popup .leaflet-popup-tip {
            background: #fff;
        }
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
        
        /* === Searched location pin (red) === */
        .searched-marker {
            position: relative;
            margin: 0;
            padding: 0;
            background: transparent;
            border: none;
        }
        
        .pin-wrapper {
            position: relative;
            width: 28px;
            height: 36px;
            margin: 0;
            padding: 0;
        }
        
        /* Pin body (rounded top, pointed bottom) */
        .pin {
            position: absolute;
            width: 18px;
            height: 18px;
            background: #ea4335;              /* Google red */
            border-radius: 9px 9px 9px 0;      /* pill with one "corner" */
            transform: rotate(-45deg);
            top: 0px;
            left: 5px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        
        /* White "hole" in the center */
        .pin-inner {
            position: absolute;
            width: 8px;
            height: 8px;
            background: #ffffff;
            border-radius: 50%;
            top: 5px;
            left: 10px;
        }
    </style>
</head>
<body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        // Google Maps-style location dot with pulsing animation (for user location)
        const customIcon = L.divIcon({
            className: 'custom-marker',
            html: '<div class="marker-wrapper"><div class="pulse"></div><div class="dot"></div></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8], // Center of 16x16 container
            popupAnchor: [0, -8]
        });
        
        // Red pin icon for searched locations (flat, Google-style)
        const searchedLocationIcon = L.divIcon({
            className: 'searched-marker',
            html: '<div class="pin-wrapper"><div class="pin"></div><div class="pin-inner"></div></div>',
            iconSize: [28, 36],
            iconAnchor: [14, 36], // horizontally centered (14 = 28/2), tip at bottom (36 = full height)
            popupAnchor: [0, -36] // popup above the pin
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
            
            // Bind popup once (empty, will be populated by updateUserProfilePopup)
            window.markerInstance.bindPopup('', {
                closeOnClick: false,
                autoClose: false
            });
            
            // Open popup when marker is clicked
            window.markerInstance.on('click', function(e) {
                // Stop event propagation to prevent map click from closing it immediately
                L.DomEvent.stopPropagation(e);
                // Ensure popup content is up to date before opening
                if (window.updateUserProfilePopup && window.__currentProfileData) {
                    window.updateUserProfilePopup(window.__currentProfileData);
                }
                window.markerInstance.openPopup();
            });
            
            // Close popup when clicking anywhere else on the map
            window.mapInstance.on('click', function() {
                if (window.markerInstance && window.markerInstance.isPopupOpen()) {
                    window.markerInstance.closePopup();
                }
            });
            
            // Initialize searched location marker (starts as null)
            window.searchedMarkerInstance = null;
        }
        
        // Process any pending updates that arrived before updateLocation was defined
        if (window.__pendingUpdates && window.__pendingUpdates.length) {
            const queue = window.__pendingUpdates.splice(0);
            queue.forEach(([lat, lng, accuracy, shouldCenter]) => {
                if (window.updateLocation) {
                    window.updateLocation(lat, lng, accuracy, shouldCenter || false);
                }
            });
        }
        
        // Called from React Native to update position and accuracy
        window.updateLocation = function(newLat, newLng, accuracyMeters, shouldCenter) {
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
            
            // Don't update popup content here - it's handled by updateUserProfilePopup
            // Just ensure popup exists
            if (!window.markerInstance.getPopup()) {
                window.markerInstance.bindPopup('', {
                    className: 'custom-profile-popup',
                    closeOnClick: false,
                    autoClose: false
                });
            }
            
            // Only recenter if explicitly requested (e.g., from "My Location" button)
            // Don't auto-center when there's a searched location active
            if (shouldCenter && (!window.searchedMarkerInstance)) {
                window.mapInstance.setView([newLat, newLng], window.mapInstance.getZoom());
            }
        };
        
        // Set searched location marker (red pin)
        window.setSearchedLocation = function(lat, lng, address) {
            if (!window.mapInstance) return;
            
            // Remove existing searched marker if it exists
            if (window.searchedMarkerInstance) {
                window.mapInstance.removeLayer(window.searchedMarkerInstance);
            }
            
            // Create new marker for searched location
            window.searchedMarkerInstance = L.marker([lat, lng], {
                icon: searchedLocationIcon,
                zIndexOffset: 500 // Below user location marker but above circle
            }).addTo(window.mapInstance);
            
            // Store location data for click handler
            window.searchedMarkerLocation = { lat: lat, lng: lng, address: address || null };
            
            // Bind popup with address (minimal, just for visual feedback)
            const popupText = address || 'Searched Location<br>Lat: ' + lat.toFixed(6) + '<br>Lng: ' + lng.toFixed(6);
            window.searchedMarkerInstance.bindPopup(popupText);
            
            // Handle marker click - communicate to React Native
            window.searchedMarkerInstance.off('click'); // Remove any existing handlers
            window.searchedMarkerInstance.on('click', function(e) {
                // Stop event propagation to prevent map click from interfering
                L.DomEvent.stopPropagation(e);
                // Notify React Native about the click
                if (window.ReactNativeWebView && window.searchedMarkerLocation) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'searchedLocationClick',
                        location: window.searchedMarkerLocation
                    }));
                }
            });
            
            // Center map on searched location (but don't change zoom if user has zoomed)
            window.mapInstance.setView([lat, lng], window.mapInstance.getZoom());
        };
        
        // Clear searched location marker
        window.clearSearchedLocation = function() {
            if (window.searchedMarkerInstance && window.mapInstance) {
                window.mapInstance.removeLayer(window.searchedMarkerInstance);
                window.searchedMarkerInstance = null;
            }
        };
        
        // Update user profile popup
        window.updateUserProfilePopup = function(profileData) {
            if (!window.mapInstance || !window.markerInstance) return;
            
            // Store profile data for click handler
            window.__currentProfileData = profileData;
            
            let html = '';
            if (profileData && (profileData.name || profileData.username)) {
                // Build profile popup HTML - ID card style (fills entire popup)
                const name = profileData.name || profileData.username || 'User';
                const username = profileData.username ? '@' + profileData.username : '';
                const profilePic = profileData.profilePicture || '';
                const totalHikes = profileData.totalHikes || 0;
                const totalDistance = profileData.totalDistance || 0;
                const hikingLevel = profileData.hikingLevel || 'beginner';
                const achievements = profileData.achievements || [];
                
                html = '<div style="display: flex; padding: 10px; min-width: 240px; max-width: 280px; background: #fff; border-radius: 0; margin: 0;">';
                
                // Left side - Profile picture
                html += '<div style="flex-shrink: 0; margin-right: 10px;">';
                if (profilePic) {
                    html += '<img src="' + profilePic + '" style="width: 60px; height: 60px; border-radius: 6px; object-fit: cover; border: 2px solid #617337;" />';
                } else {
                    html += '<div style="width: 60px; height: 60px; border-radius: 6px; background: #617337; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px; border: 2px solid #617337;">' + (name.charAt(0).toUpperCase()) + '</div>';
                }
                html += '</div>';
                
                // Right side - Info
                html += '<div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; min-width: 0;">';
                
                // Name and username
                html += '<div>';
                html += '<div style="font-weight: bold; font-size: 16px; color: #202124; margin-bottom: 2px; line-height: 1.2;">' + name + '</div>';
                if (username) {
                    html += '<div style="font-size: 12px; color: #5f6368; margin-bottom: 6px; line-height: 1.2;">' + username + '</div>';
                }
                html += '</div>';
                
                // Stats row
                html += '<div style="display: flex; justify-content: space-between; margin: 6px 0; padding: 6px 0; border-top: 1px solid #e8eaed; border-bottom: 1px solid #e8eaed;">';
                html += '<div style="text-align: center; flex: 1;"><div style="font-weight: bold; font-size: 14px; color: #617337; line-height: 1.2;">' + totalHikes + '</div><div style="font-size: 9px; color: #5f6368; margin-top: 2px; line-height: 1.2;">Hikes</div></div>';
                html += '<div style="text-align: center; flex: 1;"><div style="font-weight: bold; font-size: 14px; color: #617337; line-height: 1.2;">' + totalDistance.toFixed(1) + '</div><div style="font-size: 9px; color: #5f6368; margin-top: 2px; line-height: 1.2;">km</div></div>';
                html += '<div style="text-align: center; flex: 1;"><div style="font-weight: bold; font-size: 14px; color: #617337; line-height: 1.2;">' + achievements.length + '</div><div style="font-size: 9px; color: #5f6368; margin-top: 2px; line-height: 1.2;">Badges</div></div>';
                html += '</div>';
                
                // Bottom row - Level only
                html += '<div style="margin-top: 2px;">';
                html += '<div style="font-size: 11px; color: #5f6368; line-height: 1.2;">Level: <span style="font-weight: bold; color: #617337; text-transform: capitalize;">' + hikingLevel + '</span></div>';
                html += '</div>';
                
                html += '</div>'; // Close right side
                html += '</div>'; // Close main container
            } else {
                // Fallback to location info if no profile
                html = 'Your Location<br>Lat: ' + (window.markerInstance ? window.markerInstance.getLatLng().lat.toFixed(6) : '') + '<br>Lng: ' + (window.markerInstance ? window.markerInstance.getLatLng().lng.toFixed(6) : '');
            }
            
            const popup = window.markerInstance.getPopup();
            if (popup) {
                popup.setContent(html);
                // Remove default Leaflet popup styling to make ID card fill entire popup
                popup.options.className = 'custom-profile-popup';
            } else {
                window.markerInstance.bindPopup(html, {
                    className: 'custom-profile-popup',
                    closeOnClick: false,
                    autoClose: false
                });
            }
        };
    </script>
</body>
</html>
    `;
  }, []);

  // Track last sent location to avoid duplicate updates
  const lastSentRef = React.useRef<{ lat: number; lng: number } | null>(null);

  const updateMapLocation = useCallback(
    (lat: number, lng: number, shouldCenter: boolean = false, locationData?: LocationData | null) => {
      if (!mapRef.current) return;

      // Only update if location actually changed (helps with high-frequency trackers)
      const last = lastSentRef.current;
      if (last && Math.abs(last.lat - lat) < 1e-7 && Math.abs(last.lng - lng) < 1e-7 && !shouldCenter) {
        return; // Skip duplicate updates (unless we need to center)
      }

      lastSentRef.current = { lat, lng };

      // Get accuracy from locationData if available
      const accuracy = locationData?.accuracy ? Math.round(locationData.accuracy) : null;
      
      // Safe update: queue if updateLocation not ready yet
      const updateScript = `
        (function(){
          if (window.updateLocation) {
            window.updateLocation(${lat}, ${lng}, ${accuracy || 'null'}, ${shouldCenter});
          } else {
            window.__pendingUpdates = window.__pendingUpdates || [];
            window.__pendingUpdates.push([${lat}, ${lng}, ${accuracy || 'null'}, ${shouldCenter}]);
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

  const setSearchedLocation = useCallback((lat: number, lng: number, address?: string) => {
    if (!mapRef.current) return;
    const script = `
      (function(){
        if (window.setSearchedLocation) {
          window.setSearchedLocation(${lat}, ${lng}, ${address ? `'${address.replace(/'/g, "\\'")}'` : 'null'});
        }
      })();
    `;
    (mapRef.current as any)?.injectJavaScript(script);
  }, []);

  const clearSearchedLocation = useCallback(() => {
    if (!mapRef.current) return;
    const script = `
      (function(){
        if (window.clearSearchedLocation) {
          window.clearSearchedLocation();
        }
      })();
    `;
    (mapRef.current as any)?.injectJavaScript(script);
  }, []);

  useImperativeHandle(ref, () => ({
    updateLocation: (lat: number, lng: number, shouldCenter?: boolean) => {
      updateMapLocation(lat, lng, shouldCenter || false);
    },
    setSearchedLocation,
    clearSearchedLocation,
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
  // Don't auto-center unless there's no searched location
  useEffect(() => {
    if (location) {
      // Only center if there's no searched location active
      const shouldCenter = !searchedLocation;
      updateMapLocation(location.latitude, location.longitude, shouldCenter, location);
      if (onLocationUpdate) {
        onLocationUpdate(location);
      }
    }
  }, [location, searchedLocation, updateMapLocation, onLocationUpdate]);

  // Update searched location marker
  useEffect(() => {
    if (searchedLocation) {
      setSearchedLocation(
        searchedLocation.latitude,
        searchedLocation.longitude,
        searchedLocation.address
      );
    } else {
      clearSearchedLocation();
    }
  }, [searchedLocation, setSearchedLocation, clearSearchedLocation]);

  // Update user profile popup when profile changes
  useEffect(() => {
    if (!mapRef.current) return;
    
    const script = `
      (function(){
        if (window.updateUserProfilePopup) {
          window.updateUserProfilePopup(${JSON.stringify(userProfile || {})});
        }
      })();
    `;
    (mapRef.current as any)?.injectJavaScript(script);
  }, [userProfile]);

  // Handle messages from WebView
  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'searchedLocationClick' && data.location && onSearchedLocationClick) {
        onSearchedLocationClick({
          latitude: data.location.lat,
          longitude: data.location.lng,
          address: data.location.address,
        });
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  }, [onSearchedLocationClick]);

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
        onMessage={handleWebViewMessage}
        onLoadEnd={() => {
          // Initialize profile popup on load
          if (userProfile && mapRef.current) {
            const script = `
              (function(){
                if (window.updateUserProfilePopup) {
                  window.updateUserProfilePopup(${JSON.stringify(userProfile)});
                }
              })();
            `;
            (mapRef.current as any)?.injectJavaScript(script);
          }
          
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
              const shouldCenter = !searchedLocation;
              updateMapLocation(currentLat, currentLng, shouldCenter, location);
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

