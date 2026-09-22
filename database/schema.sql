-- Campus Bus Tracker Database Schema
-- Supabase PostgreSQL with PostGIS extension

-- Enable PostGIS extension for spatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Routes table: Stores all bus routes
CREATE TABLE IF NOT EXISTS bus_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for bus_routes
CREATE TRIGGER update_bus_routes_updated_at
  BEFORE UPDATE ON bus_routes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Stops table: Stores all bus stops with geographic coordinates
CREATE TABLE IF NOT EXISTS bus_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES bus_routes(id) ON DELETE CASCADE,
  stop_name TEXT NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  sequence_order INT NOT NULL,
  is_hostel_stop BOOLEAN DEFAULT FALSE,
  geofence_radius INT DEFAULT 1000, -- meters
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for bus_stops
CREATE TRIGGER update_bus_stops_updated_at
  BEFORE UPDATE ON bus_stops
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Active trips table: Stores real-time trip data from broadcasters
CREATE TABLE IF NOT EXISTS active_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES bus_routes(id) ON DELETE CASCADE,
  broadcaster_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_location GEOGRAPHY(POINT, 4326),
  occupancy_status TEXT NOT NULL CHECK (
    occupancy_status IN ('SEATS_AVAILABLE', 'STANDING_ONLY', 'FULL_SKIPPING_STOPS')
  ),
  speed FLOAT, -- Speed in km/h
  bearing FLOAT, -- Direction in degrees
  passenger_count INT DEFAULT 1,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- Trigger for active_trips
CREATE TRIGGER update_active_trips_updated_at
  BEFORE UPDATE ON active_trips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Spatial indexes for high-speed proximity queries
CREATE INDEX IF NOT EXISTS idx_bus_stops_location 
  ON bus_stops USING GIST(location);

CREATE INDEX IF NOT EXISTS idx_active_trips_location 
  ON active_trips USING GIST(current_location);

CREATE INDEX IF NOT EXISTS idx_active_trips_route_id 
  ON active_trips(route_id);

CREATE INDEX IF NOT EXISTS idx_active_trips_broadcaster_id 
  ON active_trips(broadcaster_id);

CREATE INDEX IF NOT EXISTS idx_active_trips_updated_at 
  ON active_trips(updated_at);

-- User profiles table: Extended user information
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  is_broadcaster BOOLEAN DEFAULT FALSE,
  total_trips INT DEFAULT 0,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for user_profiles
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  route_id UUID REFERENCES bus_routes(id) ON DELETE CASCADE,
  stop_id UUID REFERENCES bus_stops(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT TRUE,
  notification_radius INT DEFAULT 1000, -- meters
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, route_id, stop_id)
);

-- Trigger for notification_preferences
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to check if bus is near a stop
CREATE OR REPLACE FUNCTION is_bus_near_stop(
  bus_location GEOGRAPHY(POINT, 4326),
  stop_location GEOGRAPHY(POINT, 4326),
  radius_meters INT DEFAULT 1000
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN ST_DWithin(bus_location, stop_location, radius_meters);
END;
$$ LANGUAGE plpgsql;

-- Function to get distance between bus and stop in meters
CREATE OR REPLACE FUNCTION get_distance_to_stop(
  bus_location GEOGRAPHY(POINT, 4326),
  stop_location GEOGRAPHY(POINT, 4326)
)
RETURNS FLOAT AS $$
BEGIN
  RETURN ST_Distance(bus_location, stop_location)::FLOAT;
END;
$$ LANGUAGE plpgsql;

-- Function to estimate time to stop in minutes
CREATE OR REPLACE FUNCTION estimate_time_to_stop(
  bus_location GEOGRAPHY(POINT, 4326),
  stop_location GEOGRAPHY(POINT, 4326),
  bus_speed FLOAT DEFAULT 30
)
RETURNS FLOAT AS $$
DECLARE
  distance_meters FLOAT;
  speed_mps FLOAT;
  time_seconds FLOAT;
BEGIN
  distance_meters := ST_Distance(bus_location, stop_location);
  speed_mps := bus_speed * 1000 / 3600; -- Convert km/h to m/s
  
  IF speed_mps > 0 THEN
    time_seconds := distance_meters / speed_mps;
    RETURN time_seconds / 60; -- Convert to minutes
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- View to get active trips with route and broadcaster info
CREATE OR REPLACE VIEW active_trips_view AS
SELECT 
  at.*,
  br.name AS route_name,
  br.origin AS route_origin,
  br.destination AS route_destination,
  up.name AS broadcaster_name,
  up.email AS broadcaster_email
FROM active_trips at
LEFT JOIN bus_routes br ON at.route_id = br.id
LEFT JOIN user_profiles up ON at.broadcaster_id = up.id
WHERE at.ended_at IS NULL;

-- Function to end expired trips (older than 45 minutes)
CREATE OR REPLACE FUNCTION end_expired_trips()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.updated_at < NOW() - INTERVAL '45 minutes' THEN
    UPDATE active_trips 
    SET ended_at = NOW()
    WHERE id = NEW.id;
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Insert sample data for V1 (Single route and stop)
-- Uncomment and modify coordinates as needed
/*
INSERT INTO bus_routes (name, origin, destination) 
VALUES ('Hostel to Main Campus', 'Hostel', 'Main Campus Block')
ON CONFLICT (name) DO NOTHING;

-- Replace these coordinates with your actual hostel gate coordinates
INSERT INTO bus_stops (route_id, stop_name, location, sequence_order, is_hostel_stop, geofence_radius)
VALUES (
  (SELECT id FROM bus_routes WHERE name = 'Hostel to Main Campus'),
  'Hostel Gate 2',
  ST_PointFromText('POINT(77.2088 28.6139)', 4326), -- Example: New Delhi coordinates
  1,
  TRUE,
  1000
)
ON CONFLICT (stop_name) DO NOTHING;
*/

-- Enable realtime for tables
-- This is automatically enabled in Supabase for tables with primary keys
