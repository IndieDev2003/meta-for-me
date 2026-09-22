import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a single supabase client for the app
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type-safe database types
export type Database = {
  public: {
    Tables: {
      bus_routes: {
        Row: {
          id: string;
          name: string;
          origin: string;
          destination: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['bus_routes']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['bus_routes']['Row']>;
      };
      bus_stops: {
        Row: {
          id: string;
          route_id: string;
          stop_name: string;
          location: { latitude: number; longitude: number };
          sequence_order: number;
          is_hostel_stop: boolean;
          geofence_radius: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['bus_stops']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['bus_stops']['Row']>;
      };
      active_trips: {
        Row: {
          id: string;
          route_id: string;
          broadcaster_id: string;
          current_location: { latitude: number; longitude: number } | null;
          occupancy_status: 'SEATS_AVAILABLE' | 'STANDING_ONLY' | 'FULL_SKIPPING_STOPS';
          speed: number | null;
          bearing: number | null;
          passenger_count: number;
          started_at: string;
          updated_at: string;
          ended_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['active_trips']['Row'], 'id' | 'started_at' | 'updated_at' | 'ended_at'>;
        Update: Partial<Database['public']['Tables']['active_trips']['Row']>;
      };
      user_profiles: {
        Row: {
          id: string;
          name: string | null;
          email: string;
          phone: string | null;
          is_verified: boolean;
          is_broadcaster: boolean;
          total_trips: number;
          last_active_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_profiles']['Row'], 'id' | 'created_at' | 'updated_at' | 'last_active_at'>;
        Update: Partial<Database['public']['Tables']['user_profiles']['Row']>;
      };
      notification_preferences: {
        Row: {
          id: string;
          user_id: string;
          route_id: string | null;
          stop_id: string | null;
          is_enabled: boolean;
          notification_radius: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notification_preferences']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['notification_preferences']['Row']>;
      };
    };
    Views: {
      active_trips_view: {
        Row: {
          id: string;
          route_id: string;
          broadcaster_id: string;
          current_location: { latitude: number; longitude: number } | null;
          occupancy_status: 'SEATS_AVAILABLE' | 'STANDING_ONLY' | 'FULL_SKIPPING_STOPS';
          speed: number | null;
          bearing: number | null;
          passenger_count: number;
          started_at: string;
          updated_at: string;
          ended_at: string | null;
          route_name: string | null;
          route_origin: string | null;
          route_destination: string | null;
          broadcaster_name: string | null;
          broadcaster_email: string | null;
        };
      };
    };
  };
};

export type BusRoute = Database['public']['Tables']['bus_routes']['Row'];
export type BusStop = Database['public']['Tables']['bus_stops']['Row'];
export type ActiveTrip = Database['public']['Tables']['active_trips']['Row'];
export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
