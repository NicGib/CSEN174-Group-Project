import React, { useState, useEffect, useCallback, useRef } from 'react';
import { locationService, LocationData, LocationTrackingOptions } from '@/src/lib/locationService';

interface UseLocationTrackingOptions {
  autoStart?: boolean;
  trackingOptions?: LocationTrackingOptions;
  updateInterval?: number; // How often to check for location updates (ms)
}

interface UseLocationTrackingReturn {
  isTracking: boolean;
  currentLocation: LocationData | null;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  getCurrentLocation: () => Promise<LocationData | null>;
}

/**
 * Custom hook for location tracking
 * Handles all location tracking logic with automatic cleanup
 */
export function useLocationTracking(
  options: UseLocationTrackingOptions = {}
): UseLocationTrackingReturn {
  const {
    autoStart = false,
    trackingOptions = {
      accuracy: 4, // Location.Accuracy.Balanced
      timeInterval: 10000,
      distanceInterval: 50,
    },
    updateInterval = 2000,
  } = options;

  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);

  const startTracking = useCallback(async () => {
    try {
      const hasPermission = await locationService.checkPermissions();
      if (!hasPermission) {
        const granted = await locationService.requestPermissions();
        if (!granted) {
          console.warn('Location permission not granted');
          return;
        }
      }

      const started = await locationService.startTracking(trackingOptions);
      if (started) {
        setIsTracking(true);
        // Get initial location
        const location = await locationService.getCurrentLocation();
        if (location) {
          setCurrentLocation(location);
        }
      }
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  }, [trackingOptions.accuracy, trackingOptions.timeInterval, trackingOptions.distanceInterval]);

  const stopTracking = useCallback(() => {
    locationService.stopTracking();
    setIsTracking(false);
  }, []);

  const getCurrentLocation = useCallback(async (): Promise<LocationData | null> => {
    const location = await locationService.getCurrentLocation();
    if (location) {
      setCurrentLocation(location);
    }
    return location;
  }, []);

  // Track if this instance started tracking
  const startedTrackingRef = useRef(false);

  // Auto-start tracking if requested
  useEffect(() => {
    if (autoStart && !startedTrackingRef.current) {
      startTracking();
      startedTrackingRef.current = true;
    }

    // Cleanup: stop tracking when component unmounts only if this instance started it
    return () => {
      if (startedTrackingRef.current) {
        locationService.stopTracking();
        startedTrackingRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]); // Only depend on autoStart, not startTracking

  // Poll for location updates when tracking
  useEffect(() => {
    if (!isTracking) return;

    const interval = setInterval(() => {
      const location = locationService.getLastKnownLocation();
      if (location) {
        setCurrentLocation(location);
      }
    }, updateInterval);

    return () => clearInterval(interval);
  }, [isTracking, updateInterval]);

  return {
    isTracking,
    currentLocation,
    startTracking,
    stopTracking,
    getCurrentLocation,
  };
}

