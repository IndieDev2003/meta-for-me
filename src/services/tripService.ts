import { supabase } from './supabaseClient';
import { ActiveTrip, BusRoute, BusStop } from '../types';

export class TripService {
  private static instance: TripService;

  private constructor() {}

  public static getInstance(): TripService {
    if (!TripService.instance) {
      TripService.instance = new TripService();
    }
    return TripService.instance;
  }

  // Get all active trips
  async getActiveTrips(): Promise<ActiveTrip[]> {
    try {
      const { data, error } = await supabase
        .from('active_trips_view')
        .select('*')
        .eq('ended_at', null)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching active trips:', error);
        return [];
      }

      return data as ActiveTrip[];
    } catch (err) {
      console.error('Error getting active trips:', err);
      return [];
    }
  }

  // Get active trips for a specific route
  async getActiveTripsByRoute(routeId: string): Promise<ActiveTrip[]> {
    try {
      const { data, error } = await supabase
        .from('active_trips_view')
        .select('*')
        .eq('route_id', routeId)
        .eq('ended_at', null)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching active trips for route:', error);
        return [];
      }

      return data as ActiveTrip[];
    } catch (err) {
      console.error('Error getting active trips for route:', err);
      return [];
    }
  }

  // Get active trip by ID
  async getActiveTripById(tripId: string): Promise<ActiveTrip | null> {
    try {
      const { data, error } = await supabase
        .from('active_trips_view')
        .select('*')
        .eq('id', tripId)
        .eq('ended_at', null)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching active trip:', error);
        return null;
      }

      return data as ActiveTrip | null;
    } catch (err) {
      console.error('Error getting active trip by ID:', err);
      return null;
    }
  }

  // Get active trip by broadcaster ID
  async getActiveTripByBroadcaster(broadcasterId: string): Promise<ActiveTrip | null> {
    try {
      const { data, error } = await supabase
        .from('active_trips_view')
        .select('*')
        .eq('broadcaster_id', broadcasterId)
        .eq('ended_at', null)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching active trip by broadcaster:', error);
        return null;
      }

      return data as ActiveTrip | null;
    } catch (err) {
      console.error('Error getting active trip by broadcaster:', err);
      return null;
    }
  }

  // Create a new active trip
  async createActiveTrip(
    routeId: string,
    broadcasterId: string,
    currentLocation: { latitude: number; longitude: number },
    occupancyStatus: string
  ): Promise<ActiveTrip | null> {
    try {
      const { data, error } = await supabase
        .from('active_trips')
        .insert({
          route_id: routeId,
          broadcaster_id: broadcasterId,
          current_location: `POINT(${currentLocation.longitude} ${currentLocation.latitude})`,
          occupancy_status: occupancyStatus,
          speed: 0,
          bearing: 0,
          passenger_count: 1,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating active trip:', error);
        return null;
      }

      return data as ActiveTrip;
    } catch (err) {
      console.error('Error creating active trip:', err);
      return null;
    }
  }

  // Update active trip
  async updateActiveTrip(
    tripId: string,
    updates: Partial<ActiveTrip>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('active_trips')
        .update(updates)
        .eq('id', tripId);

      if (error) {
        console.error('Error updating active trip:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error updating active trip:', err);
      return false;
    }
  }

  // End active trip
  async endActiveTrip(tripId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('active_trips')
        .update({
          ended_at: new Date().toISOString(),
        })
        .eq('id', tripId);

      if (error) {
        console.error('Error ending active trip:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error ending active trip:', err);
      return false;
    }
  }

  // Get all bus routes
  async getBusRoutes(): Promise<BusRoute[]> {
    try {
      const { data, error } = await supabase
        .from('bus_routes')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching bus routes:', error);
        return [];
      }

      return data as BusRoute[];
    } catch (err) {
      console.error('Error getting bus routes:', err);
      return [];
    }
  }

  // Get bus route by ID
  async getBusRouteById(routeId: string): Promise<BusRoute | null> {
    try {
      const { data, error } = await supabase
        .from('bus_routes')
        .select('*')
        .eq('id', routeId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching bus route:', error);
        return null;
      }

      return data as BusRoute | null;
    } catch (err) {
      console.error('Error getting bus route by ID:', err);
      return null;
    }
  }

  // Get bus stops for a route
  async getBusStopsByRoute(routeId: string): Promise<BusStop[]> {
    try {
      const { data, error } = await supabase
        .from('bus_stops')
        .select('*')
        .eq('route_id', routeId)
        .order('sequence_order', { ascending: true });

      if (error) {
        console.error('Error fetching bus stops:', error);
        return [];
      }

      return data as BusStop[];
    } catch (err) {
      console.error('Error getting bus stops by route:', err);
      return [];
    }
  }

  // Get hostel stops
  async getHostelStops(): Promise<BusStop[]> {
    try {
      const { data, error } = await supabase
        .from('bus_stops')
        .select('*')
        .eq('is_hostel_stop', true);

      if (error) {
        console.error('Error fetching hostel stops:', error);
        return [];
      }

      return data as BusStop[];
    } catch (err) {
      console.error('Error getting hostel stops:', err);
      return [];
    }
  }

  // Get stops within radius of a location
  async getStopsWithinRadius(
    latitude: number,
    longitude: number,
    radius: number = 1000
  ): Promise<BusStop[]> {
    try {
      // Using PostGIS ST_DWithin function via RPC
      const { data, error } = await supabase.rpc('get_stops_within_radius', {
        center_lat: latitude,
        center_lon: longitude,
        radius_meters: radius,
      });

      if (error) {
        console.error('Error fetching stops within radius:', error);
        return [];
      }

      return data as BusStop[];
    } catch (err) {
      console.error('Error getting stops within radius:', err);
      return [];
    }
  }

  // Increment passenger count for a trip
  async incrementPassengerCount(tripId: string): Promise<boolean> {
    try {
      const { data: trip, error: fetchError } = await supabase
        .from('active_trips')
        .select('passenger_count')
        .eq('id', tripId)
        .single();

      if (fetchError) {
        console.error('Error fetching trip for passenger count:', fetchError);
        return false;
      }

      const currentCount = trip?.passenger_count || 1;

      const { error } = await supabase
        .from('active_trips')
        .update({
          passenger_count: currentCount + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tripId);

      if (error) {
        console.error('Error incrementing passenger count:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error incrementing passenger count:', err);
      return false;
    }
  }

  // Subscribe to active trips updates
  subscribeToActiveTrips(callback: (trip: ActiveTrip) => void): void {
    try {
      const channel = supabase
        .channel('active_trips_updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'active_trips',
          },
          (payload) => {
            callback(payload.new as ActiveTrip);
          }
        )
        .subscribe();

      console.log('Subscribed to active trips updates');
    } catch (err) {
      console.error('Error subscribing to active trips:', err);
    }
  }

  // Unsubscribe from active trips
  unsubscribeFromActiveTrips(): void {
    try {
      supabase.removeChannel(supabase.getChannelByName('active_trips_updates'));
    } catch (err) {
      console.error('Error unsubscribing from active trips:', err);
    }
  }
}

// Export singleton instance
export const tripService = TripService.getInstance();
