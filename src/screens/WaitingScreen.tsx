import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { tripService } from '../services/tripService';
import { notificationService } from '../services/notificationService';
import { authService } from '../services/authService';
import { COLORS, SPACING, TYPOGRAPHY, OCCUPANCY_STATUS, DEFAULT_HOSTEL_STOP } from '../utils/constants';
import { ActiveTrip, BusRoute, BusStop, OccupancyStatus } from '../types';
import { TripCard } from '../components/TripCard';
import { StopSelector } from '../components/StopSelector';
import { ModeToggle } from '../components/ModeToggle';

type RootStackParamList = {
  Waiting: undefined;
  Broadcaster: undefined;
  Auth: undefined;
};

type WaitingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Waiting'>;

export const WaitingScreen: React.FC = () => {
  const navigation = useNavigation<WaitingScreenNavigationProp>();
  const [activeTrips, setActiveTrips] = useState<ActiveTrip[]>([]);
  const [selectedStop, setSelectedStop] = useState<BusStop | null>(null);
  const [busStops, setBusStops] = useState<BusStop[]>([]);
  const [busRoutes, setBusRoutes] = useState<BusRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch bus routes and stops
      const [routes, stops] = await Promise.all([
        tripService.getBusRoutes(),
        tripService.getHostelStops(),
      ]);

      setBusRoutes(routes);
      setBusStops(stops);

      // Set default stop if available
      if (stops.length > 0) {
        setSelectedStop(stops[0]);
      } else {
        // Use default stop from constants
        setSelectedStop(DEFAULT_HOSTEL_STOP);
      }

      // Fetch active trips
      await fetchActiveTrips();
    } catch (err) {
      setError('Failed to load data');
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Fetch active trips
  const fetchActiveTrips = useCallback(async () => {
    try {
      const trips = await tripService.getActiveTrips();
      setActiveTrips(trips);
    } catch (err) {
      console.error('Error fetching active trips:', err);
    }
  }, []);

  // Filter trips near selected stop
  const getTripsNearStop = useCallback((stop: BusStop | null) => {
    if (!stop) return activeTrips;

    return activeTrips.filter((trip) => {
      if (!trip.current_location || !stop.location) return false;

      const distance = Math.sqrt(
        Math.pow(trip.current_location.latitude - stop.location.latitude, 2) +
        Math.pow(trip.current_location.longitude - stop.location.longitude, 2)
      );

      // Simple distance check (more accurate calculation in notification service)
      return distance < 0.01; // ~1km at equator
    });
  }, [activeTrips]);

  // Set up realtime subscription
  useEffect(() => {
    const setupRealtime = async () => {
      try {
        // Subscribe to all active trips updates
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

        // Subscribe to notifications for selected stop
        if (selectedStop) {
          notificationService.subscribeToStop(selectedStop.id, (trip: ActiveTrip) => {
            // Trigger notification when bus is near
            notificationService.sendBusNearbyNotification(trip, selectedStop);
          });
        }
      } catch (err) {
        console.error('Error setting up realtime:', err);
      }
    };

    setupRealtime();

    // Initial data fetch
    fetchData();

    // Set up interval for periodic refresh
    const interval = setInterval(fetchActiveTrips, 30000);

    return () => {
      clearInterval(interval);
      tripService.unsubscribeFromActiveTrips();
      if (selectedStop) {
        notificationService.unsubscribeFromStop(selectedStop.id);
      }
    };
  }, [fetchData, fetchActiveTrips, selectedStop]);

  // Handle stop selection change
  const handleStopChange = useCallback((stop: BusStop) => {
    setSelectedStop(stop);
    
    // Subscribe to notifications for new stop
    notificationService.subscribeToStop(stop.id, (trip: ActiveTrip) => {
      notificationService.sendBusNearbyNotification(trip, stop);
    });

    // Unsubscribe from previous stop
    if (selectedStop && selectedStop.id !== stop.id) {
      notificationService.unsubscribeFromStop(selectedStop.id);
    }
  }, [selectedStop]);

  // Handle refresh
  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData();
  }, [fetchData]);

  // Navigate to broadcaster mode
  const navigateToBroadcaster = useCallback(() => {
    navigation.navigate('Broadcaster');
  }, [navigation]);

  // Navigate to auth screen
  const navigateToAuth = useCallback(() => {
    navigation.navigate('Auth');
  }, [navigation]);

  // Get trips sorted by proximity
  const sortedTrips = useCallback(() => {
    const trips = getTripsNearStop(selectedStop);
    
    // Sort by updated_at (most recent first)
    return [...trips].sort((a, b) => {
      const dateA = new Date(a.updated_at || '').getTime();
      const dateB = new Date(b.updated_at || '').getTime();
      return dateB - dateA;
    });
  }, [getTripsNearStop, selectedStop]);

  // Check if user is authenticated
  const user = authService.getAuthState().user;

  if (isLoading && activeTrips.length === 0) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[styles.text, { marginTop: SPACING.md }]}>Loading bus data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🚌 Campus Bus Tracker</Text>
          <Text style={styles.subtitle}>Real-time bus updates for hostel students</Text>
        </View>

        {/* Mode Toggle */}
        <View style={styles.modeToggleContainer}>
          <ModeToggle 
            mode="WAITING" 
            onPress={navigateToBroadcaster}
          />
        </View>

        {/* Stop Selector */}
        {busStops.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Your Stop</Text>
            <StopSelector
              stops={busStops}
              selectedStop={selectedStop}
              onSelectStop={handleStopChange}
            />
          </View>
        )}

        {/* Active Trips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedStop ? `Buses Near ${selectedStop.stop_name}` : 'Active Bus Trips'}
          </Text>

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          {sortedTrips().length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {isLoading ? 'Loading trips...' : 'No active buses found. Be the first to broadcast!'}
              </Text>
              {!user && (
                <Text style={[styles.emptyText, { marginTop: SPACING.sm }]}>
                  <Text onPress={navigateToAuth} style={styles.linkText}>Sign in</Text> to start broadcasting
                </Text>
              )}
            </View>
          ) : (
            sortedTrips().map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onPress={() => {}}
              />
            ))
          )}
        </View>

        {/* Info Section */}
        <View style={[styles.section, styles.infoSection]}>
          <Text style={[styles.sectionTitle, { fontSize: TYPOGRAPHY.sm.fontSize }]}>
            💡 Tip: Ask a friend on the bus to start broadcasting to see real-time updates!
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  header: {
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: TYPOGRAPHY['2xl'].fontSize,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.base.fontSize,
    color: COLORS.textSecondary,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.lg.fontSize,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  modeToggleContainer: {
    marginBottom: SPACING.lg,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: TYPOGRAPHY.base.fontSize,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: TYPOGRAPHY.base.fontSize,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  linkText: {
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  infoSection: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  text: {
    fontSize: TYPOGRAPHY.base.fontSize,
    color: COLORS.text,
  },
});
