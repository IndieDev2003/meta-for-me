import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { supabase } from './supabaseClient';
import { authService } from './authService';
import { APP_CONFIG } from '../utils/constants';
import { Location as LocationType, ActiveTrip } from '../types';

// Define the background task name
const LOCATION_TRACKING_TASK = 'LOCATION_TRACKING_TASK';

// Define the background task
TaskManager.defineTask(LOCATION_TRACKING_TASK, () => {
  return new Promise((resolve) => {
    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: APP_CONFIG.LOCATION_UPDATE_INTERVAL,
        distanceInterval: APP_CONFIG.LOCATION_DISTANCE_INTERVAL,
      },
      async (location) => {
        try {
          const user = authService.getAuthState().user;
          if (!user) {
            resolve(TaskManager.TaskResult.Success);
            return;
          }

          // Check if user has an active trip
          const activeTrip = await getActiveTripByBroadcaster(user.id);
          
          if (activeTrip) {
            // Update the trip with new location
            const { error } = await supabase
              .from('active_trips')
              .update({
                current_location: `POINT(${location.coords.longitude} ${location.coords.latitude})`,
                speed: location.coords.speed,
                bearing: location.coords.heading,
                updated_at: new Date().toISOString(),
              })
              .eq('id', activeTrip.id);

            if (error) {
              console.error('Error updating location:', error);
            }
          }
        } catch (err) {
          console.error('Error in background location task:', err);
        }
        resolve(TaskManager.TaskResult.Success);
      }
    );
  });
});

// Get active trip by broadcaster ID
async function getActiveTripByBroadcaster(broadcasterId: string): Promise<ActiveTrip | null> {
  const { data, error } = await supabase
    .from('active_trips')
    .select('*')
    .eq('broadcaster_id', broadcasterId)
    .eq('ended_at', null)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching active trip:', error);
    return null;
  }

  return data as ActiveTrip | null;
}

export class LocationService {
  private static instance: LocationService;
  private isTracking = false;
  private watchId: Location.LocationSubscription | null = null;

  private constructor() {}

  public static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  // Request location permissions
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        return false;
      }

      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      
      if (backgroundStatus !== 'granted') {
        console.warn('Background location permission not granted');
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error requesting location permissions:', err);
      return false;
    }
  }

  // Check if location permissions are granted
  async hasPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
      const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();
      
      return foregroundStatus === 'granted' && backgroundStatus === 'granted';
    } catch (err) {
      console.error('Error checking location permissions:', err);
      return false;
    }
  }

  // Start location tracking
  async startTracking(routeId: string, occupancyStatus: string): Promise<boolean> {
    try {
      const user = authService.getAuthState().user;
      
      if (!user) {
        console.error('No authenticated user');
        return false;
      }

      // Check if already tracking
      if (this.isTracking) {
        console.warn('Already tracking location');
        return true;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Create a new active trip
      const { data: trip, error } = await supabase
        .from('active_trips')
        .insert({
          route_id: routeId,
          broadcaster_id: user.id,
          current_location: `POINT(${location.coords.longitude} ${location.coords.latitude})`,
          occupancy_status: occupancyStatus,
          speed: location.coords.speed,
          bearing: location.coords.heading,
          passenger_count: 1,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating active trip:', error);
        return false;
      }

      // Update user profile to mark as broadcaster
      await authService.updateUserProfile(user.id, { 
        is_broadcaster: true,
        current_trip_id: trip.id
      });

      // Start foreground tracking
      this.startForegroundTracking(user.id);

      // Start background tracking
      await this.startBackgroundTracking();

      this.isTracking = true;
      return true;
    } catch (err) {
      console.error('Error starting location tracking:', err);
      return false;
    }
  }

  // Start foreground location tracking
  private startForegroundTracking(broadcasterId: string): void {
    this.watchId = Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: APP_CONFIG.LOCATION_UPDATE_INTERVAL,
        distanceInterval: APP_CONFIG.LOCATION_DISTANCE_INTERVAL,
      },
      async (location) => {
        try {
          // Update the active trip with new location
          const { error } = await supabase
            .from('active_trips')
            .update({
              current_location: `POINT(${location.coords.longitude} ${location.coords.latitude})`,
              speed: location.coords.speed,
              bearing: location.coords.heading,
              updated_at: new Date().toISOString(),
            })
            .eq('broadcaster_id', broadcasterId)
            .eq('ended_at', null);

          if (error) {
            console.error('Error updating location:', error);
          }
        } catch (err) {
          console.error('Error in foreground location tracking:', err);
        }
      }
    );
  }

  // Start background location tracking
  private async startBackgroundTracking(): Promise<void> {
    try {
      await Location.startLocationUpdatesAsync(LOCATION_TRACKING_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: APP_CONFIG.LOCATION_UPDATE_INTERVAL,
        distanceInterval: APP_CONFIG.LOCATION_DISTANCE_INTERVAL,
        foregroundService: {
          notificationTitle: 'Bus Location Tracking',
          notificationBody: 'Tracking your location to provide real-time bus updates',
          notificationColor: '#3b82f6',
        },
      });
    } catch (err) {
      console.error('Error starting background location tracking:', err);
    }
  }

  // Stop location tracking
  async stopTracking(): Promise<boolean> {
    try {
      const user = authService.getAuthState().user;
      
      if (!user) {
        console.error('No authenticated user');
        return false;
      }

      // Stop foreground tracking
      if (this.watchId) {
        this.watchId.remove();
        this.watchId = null;
      }

      // Stop background tracking
      await Location.stopLocationUpdatesAsync(LOCATION_TRACKING_TASK);

      // End the active trip
      const { error } = await supabase
        .from('active_trips')
        .update({
          ended_at: new Date().toISOString(),
        })
        .eq('broadcaster_id', user.id)
        .eq('ended_at', null);

      if (error) {
        console.error('Error ending active trip:', error);
      }

      // Update user profile
      await authService.updateUserProfile(user.id, { 
        is_broadcaster: false,
        current_trip_id: null
      });

      this.isTracking = false;
      return true;
    } catch (err) {
      console.error('Error stopping location tracking:', err);
      return false;
    }
  }

  // Update occupancy status
  async updateOccupancyStatus(status: string): Promise<boolean> {
    try {
      const user = authService.getAuthState().user;
      
      if (!user) {
        console.error('No authenticated user');
        return false;
      }

      const { error } = await supabase
        .from('active_trips')
        .update({
          occupancy_status: status,
          updated_at: new Date().toISOString(),
        })
        .eq('broadcaster_id', user.id)
        .eq('ended_at', null);

      if (error) {
        console.error('Error updating occupancy status:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error updating occupancy status:', err);
      return false;
    }
  }

  // Get current location
  async getCurrentLocation(): Promise<LocationType | null> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
      };
    } catch (err) {
      console.error('Error getting current location:', err);
      return null;
    }
  }

  // Check if tracking is active
  isTrackingActive(): boolean {
    return this.isTracking;
  }

  // Register background task (call this on app startup)
  async registerBackgroundTask(): Promise<void> {
    try {
      await TaskManager.registerTaskAsync(LOCATION_TRACKING_TASK);
    } catch (err) {
      console.error('Error registering background task:', err);
    }
  }

  // Unregister background task
  async unregisterBackgroundTask(): Promise<void> {
    try {
      await TaskManager.unregisterTaskAsync(LOCATION_TRACKING_TASK);
    } catch (err) {
      console.error('Error unregistering background task:', err);
    }
  }

  // Check if background task is registered
  async isBackgroundTaskRegistered(): Promise<boolean> {
    try {
      const tasks = await TaskManager.getRegisteredTasksAsync();
      return tasks.some(task => task.taskName === LOCATION_TRACKING_TASK);
    } catch (err) {
      console.error('Error checking background task registration:', err);
      return false;
    }
  }
}

// Export singleton instance
export const locationService = LocationService.getInstance();
