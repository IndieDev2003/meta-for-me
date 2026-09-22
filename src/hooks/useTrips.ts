import { useState, useEffect, useCallback } from 'react';
import { tripService } from '../services/tripService';
import { ActiveTrip, BusRoute, BusStop } from '../types';

export const useTrips = () => {
  const [activeTrips, setActiveTrips] = useState<ActiveTrip[]>([]);
  const [busRoutes, setBusRoutes] = useState<BusRoute[]>([]);
  const [busStops, setBusStops] = useState<BusStop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [trips, routes, stops] = await Promise.all([
        tripService.getActiveTrips(),
        tripService.getBusRoutes(),
        tripService.getHostelStops(),
      ]);

      setActiveTrips(trips);
      setBusRoutes(routes);
      setBusStops(stops);
    } catch (err) {
      setError('Failed to load data');
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    const setupRealtime = () => {
      tripService.subscribeToActiveTrips((trip: ActiveTrip) => {
        setActiveTrips((prev) => {
          const existingIndex = prev.findIndex((t) => t.id === trip.id);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = trip;
            return updated;
          }
          return [...prev, trip];
        });
      });
    };

    setupRealtime();
    fetchAllData();

    return () => {
      tripService.unsubscribeFromActiveTrips();
    };
  }, [fetchAllData]);

  // Get trips for a specific route
  const getTripsByRoute = useCallback((routeId: string) => {
    return activeTrips.filter((trip) => trip.route_id === routeId);
  }, [activeTrips]);

  // Get trips near a stop
  const getTripsNearStop = useCallback((stopId: string, radius: number = 1000) => {
    // This is a simplified version - actual distance calculation happens on the server
    return activeTrips.filter((trip) => {
      // For now, just return all trips
      // In production, you would filter based on actual distance
      return true;
    });
  }, [activeTrips]);

  // Create a new trip
  const createTrip = useCallback(async (
    routeId: string,
    broadcasterId: string,
    currentLocation: { latitude: number; longitude: number },
    occupancyStatus: string
  ) => {
    return tripService.createActiveTrip(
      routeId,
      broadcasterId,
      currentLocation,
      occupancyStatus
    );
  }, []);

  // End a trip
  const endTrip = useCallback(async (tripId: string) => {
    return tripService.endActiveTrip(tripId);
  }, []);

  // Update trip occupancy
  const updateTripOccupancy = useCallback(async (tripId: string, status: string) => {
    return tripService.updateActiveTrip(tripId, { occupancy_status: status });
  }, []);

  return {
    activeTrips,
    busRoutes,
    busStops,
    isLoading,
    error,
    fetchAllData,
    getTripsByRoute,
    getTripsNearStop,
    createTrip,
    endTrip,
    updateTripOccupancy,
  };
};
