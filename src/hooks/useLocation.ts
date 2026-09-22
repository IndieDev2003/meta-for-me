import { useState, useEffect, useCallback } from 'react';
import { locationService } from '../services/locationService';
import { Location } from '../types';

export const useLocation = () => {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check permissions on mount
  useEffect(() => {
    const checkPermissions = async () => {
      const permissions = await locationService.hasPermissions();
      setHasPermissions(permissions);
    };

    checkPermissions();
  }, []);

  // Request permissions
  const requestPermissions = useCallback(async () => {
    try {
      const granted = await locationService.requestPermissions();
      setHasPermissions(granted);
      return granted;
    } catch (err) {
      setError('Failed to request permissions');
      return false;
    }
  }, []);

  // Start tracking
  const startTracking = useCallback(async (routeId: string, occupancyStatus: string) => {
    try {
      const success = await locationService.startTracking(routeId, occupancyStatus);
      if (success) {
        setIsTracking(true);
        
        // Get current location
        const location = await locationService.getCurrentLocation();
        if (location) {
          setCurrentLocation(location);
        }
      }
      return success;
    } catch (err) {
      setError('Failed to start tracking');
      return false;
    }
  }, []);

  // Stop tracking
  const stopTracking = useCallback(async () => {
    try {
      const success = await locationService.stopTracking();
      if (success) {
        setIsTracking(false);
      }
      return success;
    } catch (err) {
      setError('Failed to stop tracking');
      return false;
    }
  }, []);

  // Update occupancy status
  const updateOccupancyStatus = useCallback(async (status: string) => {
    try {
      return await locationService.updateOccupancyStatus(status);
    } catch (err) {
      setError('Failed to update occupancy status');
      return false;
    }
  }, []);

  // Get current location
  const getCurrentLocation = useCallback(async () => {
    try {
      const location = await locationService.getCurrentLocation();
      if (location) {
        setCurrentLocation(location);
      }
      return location;
    } catch (err) {
      setError('Failed to get current location');
      return null;
    }
  }, []);

  // Register background task
  const registerBackgroundTask = useCallback(async () => {
    await locationService.registerBackgroundTask();
  }, []);

  return {
    currentLocation,
    isTracking,
    hasPermissions,
    error,
    requestPermissions,
    startTracking,
    stopTracking,
    updateOccupancyStatus,
    getCurrentLocation,
    registerBackgroundTask,
  };
};
