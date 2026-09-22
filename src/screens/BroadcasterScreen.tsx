import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { locationService } from '../services/locationService';
import { tripService } from '../services/tripService';
import { authService } from '../services/authService';
import { COLORS, SPACING, TYPOGRAPHY, OCCUPANCY_STATUS, DEFAULT_ROUTE, APP_CONFIG } from '../utils/constants';
import { ActiveTrip, BusRoute, OccupancyStatus } from '../types';
import { ModeToggle } from '../components/ModeToggle';
import { OccupancySelector } from '../components/OccupancySelector';
import { RouteSelector } from '../components/RouteSelector';

type RootStackParamList = {
  Waiting: undefined;
  Broadcaster: undefined;
  Auth: undefined;
};

type BroadcasterScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Broadcaster'>;

export const BroadcasterScreen: React.FC = () => {
  const navigation = useNavigation<BroadcasterScreenNavigationProp>();
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<BusRoute | null>(null);
  const [occupancyStatus, setOccupancyStatus] = useState<OccupancyStatus>('SEATS_AVAILABLE');
  const [busRoutes, setBusRoutes] = useState<BusRoute[]>([]);
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passengerCount, setPassengerCount] = useState(1);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Check if user is authenticated
  const user = authService.getAuthState().user;

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch bus routes
      const routes = await tripService.getBusRoutes();
      setBusRoutes(routes);

      // Set default route if available
      if (routes.length > 0) {
        setSelectedRoute(routes[0]);
      } else {
        setSelectedRoute(DEFAULT_ROUTE);
      }

      // Check for existing active trip
      if (user) {
        const trip = await tripService.getActiveTripByBroadcaster(user.id);
        if (trip) {
          setActiveTrip(trip);
          setIsTracking(true);
          setOccupancyStatus(trip.occupancy_status as OccupancyStatus);
          setPassengerCount(trip.passenger_count || 1);
        }
      }

      // Get current location
      const location = await locationService.getCurrentLocation();
      if (location) {
        setCurrentLocation({
          latitude: location.latitude,
          longitude: location.longitude,
        });
      }
    } catch (err) {
      setError('Failed to load data');
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Check location permissions
  useEffect(() => {
    const checkPermissions = async () => {
      const hasPermissions = await locationService.hasPermissions();
      if (!hasPermissions) {
        const granted = await locationService.requestPermissions();
        if (!granted) {
          Alert.alert(
            'Location Permission Required',
            'This app needs location permissions to track bus movements. Please enable them in settings.'
          );
        }
      }
    };

    checkPermissions();
    fetchData();

    // Register background task
    locationService.registerBackgroundTask();

    return () => {
      locationService.unregisterBackgroundTask();
    };
  }, [fetchData]);

  // Start tracking
  const startTracking = useCallback(async () => {
    try {
      if (!user) {
        Alert.alert('Please sign in to start broadcasting');
        navigation.navigate('Auth');
        return;
      }

      if (!selectedRoute) {
        Alert.alert('Please select a route');
        return;
      }

      if (!currentLocation) {
        Alert.alert('Could not determine your location. Please try again.');
        return;
      }

      setIsLoading(true);
      setError(null);

      const success = await locationService.startTracking(
        selectedRoute.id,
        occupancyStatus
      );

      if (success) {
        setIsTracking(true);
        setElapsedTime(0);
        
        // Start timer
        const timer = setInterval(() => {
          setElapsedTime((prev) => prev + 1);
        }, 1000);

        // Fetch updated trip info
        const trip = await tripService.getActiveTripByBroadcaster(user.id);
        if (trip) {
          setActiveTrip(trip);
        }

        Alert.alert('Success', 'Bus tracking started! Your location is now being broadcast.');

        return () => clearInterval(timer);
      } else {
        setError('Failed to start tracking');
      }
    } catch (err) {
      setError('Failed to start tracking');
      console.error('Error starting tracking:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedRoute, currentLocation, occupancyStatus, navigation]);

  // Stop tracking
  const stopTracking = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const success = await locationService.stopTracking();

      if (success) {
        setIsTracking(false);
        setElapsedTime(0);
        setActiveTrip(null);
        Alert.alert('Success', 'Bus tracking stopped.');
      } else {
        setError('Failed to stop tracking');
      }
    } catch (err) {
      setError('Failed to stop tracking');
      console.error('Error stopping tracking:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update occupancy status
  const handleOccupancyChange = useCallback(async (status: OccupancyStatus) => {
    try {
      setOccupancyStatus(status);
      
      if (isTracking) {
        await locationService.updateOccupancyStatus(status);
        
        // Update local trip state
        setActiveTrip((prev) => prev ? { ...prev, occupancy_status: status } : null);
      }
    } catch (err) {
      console.error('Error updating occupancy status:', err);
    }
  }, [isTracking]);

  // Increment passenger count
  const incrementPassengerCount = useCallback(async () => {
    try {
      if (!activeTrip) return;

      const newCount = passengerCount + 1;
      const success = await tripService.incrementPassengerCount(activeTrip.id);

      if (success) {
        setPassengerCount(newCount);
        setActiveTrip((prev) => prev ? { ...prev, passenger_count: newCount } : null);
      }
    } catch (err) {
      console.error('Error incrementing passenger count:', err);
    }
  }, [activeTrip, passengerCount]);

  // Format elapsed time
  const formatElapsedTime = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  // Navigate to waiting mode
  const navigateToWaiting = useCallback(() => {
    navigation.navigate('Waiting');
  }, [navigation]);

  // Navigate to auth screen
  const navigateToAuth = useCallback(() => {
    navigation.navigate('Auth');
  }, [navigation]);

  // Auto-stop tracking after timeout
  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null;

    if (isTracking) {
      // Auto-stop after TRIP_TIMEOUT_MINUTES
      timeout = setTimeout(() => {
        Alert.alert(
          'Trip Timeout',
          `Your broadcasting session has been active for ${APP_CONFIG.TRIP_TIMEOUT_MINUTES} minutes. Would you like to continue?`,
          [
            { text: 'Stop', onPress: stopTracking },
            { text: 'Continue', onPress: () => {} }, // Reset timer
          ]
        );
      }, APP_CONFIG.TRIP_TIMEOUT_MINUTES * 60 * 1000);
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [isTracking, stopTracking]);

  if (!user) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>🎤 Broadcaster Mode</Text>
            <Text style={styles.subtitle}>Broadcast your bus location to help others</Text>
          </View>

          <View style={styles.authPrompt}>
            <Text style={styles.authPromptText}>
              Please sign in to start broadcasting
            </Text>
            <TouchableOpacity style={styles.button} onPress={navigateToAuth}>
              <Text style={styles.buttonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🎤 Broadcaster Mode</Text>
          <Text style={styles.subtitle}>
            {isTracking 
              ? `Broadcasting for ${selectedRoute?.name || 'your route'}`
              : 'Start broadcasting your bus location'
            }
          </Text>
        </View>

        {/* Mode Toggle */}
        <View style={styles.modeToggleContainer}>
          <ModeToggle 
            mode="BROADCASTING" 
            onPress={navigateToWaiting}
          />
        </View>

        {/* Route Selector */}
        {busRoutes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Route</Text>
            <RouteSelector
              routes={busRoutes}
              selectedRoute={selectedRoute}
              onSelectRoute={setSelectedRoute}
              disabled={isTracking}
            />
          </View>
        )}

        {/* Tracking Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tracking Controls</Text>

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          {isLoading ? (
            <ActivityIndicator size="large" color={COLORS.primary} />
          ) : isTracking ? (
            <View style={styles.trackingContainer}>
              <View style={styles.statusCard}>
                <Text style={styles.statusLabel}>Status</Text>
                <View style={[styles.statusBadge, { backgroundColor: OCCUPANCY_STATUS[occupancyStatus].color }]}>
                  <Text style={styles.statusText}>
                    {OCCUPANCY_STATUS[occupancyStatus].emoji} {OCCUPANCY_STATUS[occupancyStatus].label}
                  </Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Passengers</Text>
                  <View style={styles.passengerCounter}>
                    <TouchableOpacity 
                      style={styles.countButton} 
                      onPress={incrementPassengerCount}
                    >
                      <Text style={styles.countButtonText}>+</Text>
                    </TouchableOpacity>
                    <Text style={styles.statValue}>{passengerCount}</Text>
                  </View>
                </View>

                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Time</Text>
                  <Text style={styles.statValue}>{formatElapsedTime(elapsedTime)}</Text>
                </View>
              </View>

              {currentLocation && (
                <View style={styles.locationInfo}>
                  <Text style={styles.locationLabel}>Current Location:</Text>
                  <Text style={styles.locationText}>
                    Lat: {currentLocation.latitude.toFixed(6)}, 
                    Lon: {currentLocation.longitude.toFixed(6)}
                  </Text>
                </View>
              )}

              <TouchableOpacity 
                style={[styles.button, styles.stopButton]} 
                onPress={stopTracking}
              >
                <Text style={styles.buttonText}>Stop Broadcasting</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.controlsContainer}>
              <Text style={styles.instructions}>
                Start broadcasting to share your bus location with others waiting at stops.
              </Text>
              
              <Text style={[styles.instructions, { marginTop: SPACING.sm }]}>
                Make sure you have:
              </Text>
              <Text style={[styles.instructions, { marginLeft: SPACING.sm }]}>
                ✓ Location permissions enabled
              </Text>
              <Text style={[styles.instructions, { marginLeft: SPACING.sm }]}>
                ✓ Selected the correct route
              </Text>

              <TouchableOpacity 
                style={[styles.button, styles.startButton]} 
                onPress={startTracking}
                disabled={!selectedRoute || !currentLocation}
              >
                <Text style={styles.buttonText}>Start Broadcasting</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Occupancy Selector */}
        {isTracking && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Occupancy Status</Text>
            <Text style={[styles.instructions, { marginBottom: SPACING.md }]}>
              Tap to update the current occupancy status
            </Text>
            <OccupancySelector
              selectedStatus={occupancyStatus}
              onSelectStatus={handleOccupancyChange}
            />
          </View>
        )}

        {/* Info Section */}
        <View style={[styles.section, styles.infoSection]}>
          <Text style={[styles.sectionTitle, { fontSize: TYPOGRAPHY.sm.fontSize }]}>
            💡 Tips:
          </Text>
          <Text style={[styles.instructions, { marginTop: SPACING.sm }]}>
            • Keep the app open or in background for continuous tracking
          </Text>
          <Text style={styles.instructions}>
            • Update occupancy status when it changes
          </Text>
          <Text style={styles.instructions}>
            • Stop broadcasting when you reach your destination
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
  button: {
    padding: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SPACING.sm,
  },
  startButton: {
    backgroundColor: COLORS.primary,
  },
  stopButton: {
    backgroundColor: COLORS.danger,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: TYPOGRAPHY.base.fontSize,
  },
  controlsContainer: {
    alignItems: 'center',
  },
  trackingContainer: {
    alignItems: 'center',
  },
  statusCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.lg,
    width: '100%',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusLabel: {
    fontSize: TYPOGRAPHY.sm.fontSize,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  statusBadge: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 20,
    marginBottom: SPACING.md,
  },
  statusText: {
    color: 'white',
    fontWeight: '600',
    fontSize: TYPOGRAPHY.base.fontSize,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: SPACING.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: TYPOGRAPHY.sm.fontSize,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: TYPOGRAPHY.xl.fontSize,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  passengerCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  countButton: {
    backgroundColor: COLORS.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  locationInfo: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: SPACING.md,
    width: '100%',
    marginBottom: SPACING.lg,
  },
  locationLabel: {
    fontSize: TYPOGRAPHY.sm.fontSize,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  locationText: {
    fontSize: TYPOGRAPHY.sm.fontSize,
    color: COLORS.text,
    fontFamily: 'monospace',
  },
  instructions: {
    fontSize: TYPOGRAPHY.base.fontSize,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  authPrompt: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  authPromptText: {
    fontSize: TYPOGRAPHY.base.fontSize,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  infoSection: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
});
