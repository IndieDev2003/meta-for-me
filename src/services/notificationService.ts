import * as Notifications from 'expo-notifications';
import { supabase } from './supabaseClient';
import { authService } from './authService';
import { APP_CONFIG, NOTIFICATION_MESSAGES } from '../utils/constants';
import { ActiveTrip, BusStop, OccupancyStatus } from '../types';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export class NotificationService {
  private static instance: NotificationService;
  private listeners: Array<(notification: any) => void> = [];

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Request notification permissions
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (err) {
      console.error('Error requesting notification permissions:', err);
      return false;
    }
  }

  // Configure notification channels (Android)
  async configureChannels(): Promise<void> {
    try {
      await Notifications.setNotificationChannelAsync('bus_alerts', {
        name: 'Bus Alerts',
        importance: Notifications.AndroidImportance.High,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3b82f6',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.Public,
      });
    } catch (err) {
      console.error('Error configuring notification channels:', err);
    }
  }

  // Subscribe to realtime updates for a specific stop
  async subscribeToStop(stopId: string, callback: (trip: ActiveTrip) => void): Promise<void> {
    const user = authService.getAuthState().user;
    
    if (!user) {
      console.error('No authenticated user');
      return;
    }

    try {
      // Subscribe to active trips table
      const channel = supabase
        .channel('bus_stop_updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'active_trips',
          },
          async (payload) => {
            const trip = payload.new as ActiveTrip;
            
            // Check if trip is near the stop
            const isNear = await this.isTripNearStop(trip, stopId);
            
            if (isNear) {
              callback(trip);
            }
          }
        )
        .subscribe();

      console.log('Subscribed to stop updates:', stopId);
    } catch (err) {
      console.error('Error subscribing to stop updates:', err);
    }
  }

  // Unsubscribe from realtime updates
  unsubscribeFromStop(stopId: string): void {
    try {
      supabase.removeChannel(supabase.getChannelByName(`bus_stop_updates_${stopId}`));
    } catch (err) {
      console.error('Error unsubscribing from stop updates:', err);
    }
  }

  // Check if trip is near a stop
  private async isTripNearStop(trip: ActiveTrip, stopId: string): Promise<boolean> {
    try {
      // Get stop location
      const { data: stop, error } = await supabase
        .from('bus_stops')
        .select('*')
        .eq('id', stopId)
        .single();

      if (error || !stop) {
        return false;
      }

      // Check if trip location is within geofence radius
      if (trip.current_location) {
        const distance = this.calculateDistance(
          trip.current_location.latitude,
          trip.current_location.longitude,
          stop.location.latitude,
          stop.location.longitude
        );

        return distance <= (stop.geofence_radius || APP_CONFIG.GEOFENCE_RADIUS);
      }

      return false;
    } catch (err) {
      console.error('Error checking trip proximity to stop:', err);
      return false;
    }
  }

  // Calculate distance between two points in meters (Haversine formula)
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Send notification when bus is near a stop
  async sendBusNearbyNotification(trip: ActiveTrip, stop: BusStop): Promise<void> {
    try {
      const user = authService.getAuthState().user;
      
      if (!user) {
        return;
      }

      // Calculate estimated time to stop
      const timeToStop = this.estimateTimeToStop(trip, stop);
      const statusLabel = this.getOccupancyLabel(trip.occupancy_status);

      const message = NOTIFICATION_MESSAGES.BUS_NEARBY(
        stop.stop_name,
        statusLabel,
        Math.round(timeToStop)
      );

      // Send push notification
      await Notifications.scheduleNotificationAsync({
        identifier: `bus_nearby_${trip.id}_${stop.id}`,
        content: {
          title: '🚌 Bus Nearby!',
          body: message,
          sound: 'default',
          vibrate: [0, 250, 250, 250],
          data: {
            trip_id: trip.id,
            route_id: trip.route_id,
            stop_id: stop.id,
            stop_name: stop.stop_name,
            occupancy_status: trip.occupancy_status,
          },
        },
        trigger: null, // Send immediately
      });

      console.log('Sent bus nearby notification:', message);
    } catch (err) {
      console.error('Error sending bus nearby notification:', err);
    }
  }

  // Estimate time to stop in minutes
  private estimateTimeToStop(trip: ActiveTrip, stop: BusStop): number {
    if (!trip.current_location || !trip.speed) {
      return 3; // Default to 3 minutes if no speed data
    }

    const distance = this.calculateDistance(
      trip.current_location.latitude,
      trip.current_location.longitude,
      stop.location.latitude,
      stop.location.longitude
    );

    // Convert speed from km/h to m/s
    const speedMPS = trip.speed * 1000 / 3600;
    
    if (speedMPS <= 0) {
      return 3; // Default to 3 minutes if speed is 0
    }

    const timeSeconds = distance / speedMPS;
    return timeSeconds / 60;
  }

  // Get occupancy label
  private getOccupancyLabel(status: OccupancyStatus): string {
    const labels: Record<OccupancyStatus, string> = {
      SEATS_AVAILABLE: 'Seats Available',
      STANDING_ONLY: 'Standing Only',
      FULL_SKIPPING_STOPS: 'Full / Skipping Stops',
    };
    return labels[status] || status;
  }

  // Send notification when bus arrives at stop
  async sendBusArrivedNotification(trip: ActiveTrip, stop: BusStop): Promise<void> {
    try {
      const message = NOTIFICATION_MESSAGES.BUS_ARRIVED(stop.stop_name);

      await Notifications.scheduleNotificationAsync({
        identifier: `bus_arrived_${trip.id}_${stop.id}`,
        content: {
          title: '🚍 Bus Arrived!',
          body: message,
          sound: 'default',
          vibrate: [0, 250, 250, 250],
          data: {
            trip_id: trip.id,
            route_id: trip.route_id,
            stop_id: stop.id,
            stop_name: stop.stop_name,
          },
        },
        trigger: null,
      });

      console.log('Sent bus arrived notification:', message);
    } catch (err) {
      console.error('Error sending bus arrived notification:', err);
    }
  }

  // Send notification when new broadcaster starts
  async sendNewBroadcasterNotification(routeId: string, broadcasterName: string): Promise<void> {
    try {
      const { data: route, error } = await supabase
        .from('bus_routes')
        .select('*')
        .eq('id', routeId)
        .single();

      if (error || !route) {
        return;
      }

      const message = NOTIFICATION_MESSAGES.NEW_BROADCASTER(route.name);

      await Notifications.scheduleNotificationAsync({
        identifier: `new_broadcaster_${routeId}`,
        content: {
          title: '📢 New Broadcaster',
          body: message,
          sound: 'default',
          data: {
            route_id: routeId,
            broadcaster_name: broadcasterName,
          },
        },
        trigger: null,
      });

      console.log('Sent new broadcaster notification:', message);
    } catch (err) {
      console.error('Error sending new broadcaster notification:', err);
    }
  }

  // Add notification listener
  addNotificationListener(callback: (notification: Notifications.Notification) => void): void {
    this.listeners.push(callback);
    
    Notifications.addNotificationReceivedListener((notification) => {
      callback(notification);
    });
  }

  // Remove notification listener
  removeNotificationListener(callback: (notification: Notifications.Notification) => void): void {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  // Get all pending notifications
  async getPendingNotifications(): Promise<Notifications.Notification[]> {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      return notifications;
    } catch (err) {
      console.error('Error getting pending notifications:', err);
      return [];
    }
  }

  // Cancel all notifications
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (err) {
      console.error('Error canceling all notifications:', err);
    }
  }

  // Cancel specific notification
  async cancelNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch (err) {
      console.error('Error canceling notification:', err);
    }
  }

  // Subscribe to all active trips for a route
  async subscribeToRoute(routeId: string, callback: (trip: ActiveTrip) => void): Promise<void> {
    try {
      const channel = supabase
        .channel(`route_${routeId}_updates`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'active_trips',
            filter: `route_id=eq.${routeId}`,
          },
          (payload) => {
            callback(payload.new as ActiveTrip);
          }
        )
        .subscribe();

      console.log('Subscribed to route updates:', routeId);
    } catch (err) {
      console.error('Error subscribing to route updates:', err);
    }
  }

  // Unsubscribe from route updates
  unsubscribeFromRoute(routeId: string): void {
    try {
      supabase.removeChannel(supabase.getChannelByName(`route_${routeId}_updates`));
    } catch (err) {
      console.error('Error unsubscribing from route updates:', err);
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
