// Occupancy Status Types
export type OccupancyStatus = 'SEATS_AVAILABLE' | 'STANDING_ONLY' | 'FULL_SKIPPING_STOPS';

// Bus Route Types
export interface BusRoute {
  id: string;
  name: string;
  origin: string;
  destination: string;
  created_at?: string;
}

// Bus Stop Types
export interface BusStop {
  id: string;
  route_id: string;
  stop_name: string;
  location: {
    latitude: number;
    longitude: number;
  };
  sequence_order: number;
}

// Active Trip Types
export interface ActiveTrip {
  id: string;
  route_id: string;
  broadcaster_id: string;
  broadcaster_name?: string;
  current_location: {
    latitude: number;
    longitude: number;
  };
  occupancy_status: OccupancyStatus;
  updated_at: string;
}

// Location Types
export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

// User Types
export interface User {
  id: string;
  email: string;
  name?: string;
  is_broadcaster: boolean;
  current_trip_id?: string;
}

// Notification Types
export interface Notification {
  id: string;
  title: string;
  body: string;
  data: {
    trip_id?: string;
    route_id?: string;
    stop_name?: string;
    occupancy_status?: OccupancyStatus;
  };
}

// Geofence Types
export interface Geofence {
  id: string;
  stop_id: string;
  radius: number; // in meters
  center: {
    latitude: number;
    longitude: number;
  };
}

// App Mode Types
export type AppMode = 'WAITING' | 'BROADCASTING';

// API Response Types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}
