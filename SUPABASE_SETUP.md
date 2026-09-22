# 🚀 Supabase Setup Guide for Campus Bus Tracker

> **Complete step-by-step guide to configure Supabase for the Campus Bus Tracker Expo app**

---

## 📋 Overview

This guide will walk you through setting up Supabase for the Campus Bus Tracker app, including:
- Project creation
- Database schema setup
- Row Level Security (RLS) configuration
- Realtime setup
- Environment configuration

---

## 🎯 Step 1: Create Supabase Project

### 1.1 Sign up for Supabase
- Go to [https://supabase.com](https://supabase.com)
- Sign up with your GitHub account or email

### 1.2 Create a New Project
1. Click **"New Project"** in the dashboard
2. Enter a project name (e.g., `campus-bus-tracker`)
3. Select a database password (remember this!)
4. Choose a region closest to your college
5. Click **"Create Project"**

### 1.3 Get Project Credentials
After creation, go to:
- **Project Settings** → **API**
- Copy these values (you'll need them for `.env`):
  - **Project URL**: `https://your-project-ref.supabase.co`
  - **anon (public) key**: Your public API key

---

## 🗃️ Step 2: Enable PostGIS Extension

### 2.1 Open SQL Editor
1. In your Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"**

### 2.2 Run PostGIS Extension
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

Click **"Run"** to execute.

✅ **PostGIS is now enabled for spatial queries!**

---

## 🏗️ Step 3: Create Database Schema

### 3.1 Run the Complete Schema

Copy the entire content from [`database/schema.sql`](database/schema.sql) and paste it into the SQL Editor.

Click **"Run"** to execute.

This will create:
- ✅ `bus_routes` table - Stores all bus routes
- ✅ `bus_stops` table - Stores all stops with geographic coordinates
- ✅ `active_trips` table - Stores real-time trip data
- ✅ `user_profiles` table - Extended user information
- ✅ `notification_preferences` table - User notification settings
- ✅ Spatial indexes for fast proximity queries
- ✅ Helper functions for distance calculations
- ✅ Sample data for V1 (commented out by default)

### 3.2 Insert Sample Data (Optional)

If you want to start with sample data, uncomment and run the insert statements at the bottom of `schema.sql`:

```sql
-- Insert sample route
INSERT INTO bus_routes (name, origin, destination)
VALUES ('Hostel to Main Campus', 'Hostel', 'Main Campus Block')
ON CONFLICT (name) DO NOTHING;

-- Insert sample stop (replace coordinates with your actual hostel gate)
INSERT INTO bus_stops (route_id, stop_name, location, sequence_order, is_hostel_stop, geofence_radius)
VALUES (
  (SELECT id FROM bus_routes WHERE name = 'Hostel to Main Campus'),
  'Hostel Gate 2',
  ST_PointFromText('POINT(77.2088 28.6139)', 4326), -- Replace with your coordinates
  1,
  TRUE,
  1000
)
ON CONFLICT (stop_name) DO NOTHING;
```

**How to get your coordinates:**
1. Open Google Maps
2. Search for your hostel gate
3. Right-click and select "What's here?"
4. Copy the latitude and longitude
5. Format as: `ST_PointFromText('POINT(LONGITUDE LATITUDE)', 4326)`

---

## 🔒 Step 4: Configure Row Level Security (RLS)

### 4.1 Enable RLS on Tables

Run these SQL commands to enable security:

```sql
-- Enable RLS on bus_routes (read-only for all)
ALTER TABLE bus_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to bus_routes"
ON bus_routes FOR SELECT
USING (true);

-- Enable RLS on bus_stops (read-only for all)
ALTER TABLE bus_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to bus_stops"
ON bus_stops FOR SELECT
USING (true);

-- Enable RLS on active_trips
ALTER TABLE active_trips ENABLE ROW LEVEL SECURITY;

-- Allow read access to all users
CREATE POLICY "Allow read access to active_trips"
ON active_trips FOR SELECT
USING (true);

-- Allow insert to authenticated users
CREATE POLICY "Allow insert on active_trips"
ON active_trips FOR INSERT
WITH CHECK (true);

-- Allow update only to the trip broadcaster
CREATE POLICY "Allow update on active_trips"
ON active_trips FOR UPDATE
USING (auth.uid() = broadcaster_id)
WITH CHECK (auth.uid() = broadcaster_id);

-- Allow delete only to the trip broadcaster
CREATE POLICY "Allow delete on active_trips"
ON active_trips FOR DELETE
USING (auth.uid() = broadcaster_id);

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow read access to all
CREATE POLICY "Allow read access to user_profiles"
ON user_profiles FOR SELECT
USING (true);

-- Allow insert only for own profile
CREATE POLICY "Allow insert on user_profiles"
ON user_profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Allow update only to own profile
CREATE POLICY "Allow update on user_profiles"
ON user_profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Enable RLS on notification_preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Allow read/write only for own preferences
CREATE POLICY "Allow access to own notification_preferences"
ON notification_preferences FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

---

## 📡 Step 5: Enable Realtime

Supabase Realtime is **enabled by default** for tables with primary keys. 

To verify:
1. Go to **Realtime** in your Supabase dashboard
2. Check that `active_trips`, `bus_routes`, and `bus_stops` are listed
3. If not, click **"Enable"** for each table

---

## ⚡ Step 6: Configure Storage (Optional)

If you want to store profile pictures or other assets:

1. Go to **Storage** in your Supabase dashboard
2. Create a new bucket (e.g., `avatars`)
3. Set up RLS policies:

```sql
-- Enable RLS on storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow read access to all
CREATE POLICY "Allow read access to public objects"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars' AND visibility = 'public');

-- Allow upload/delete only to authenticated users
CREATE POLICY "Allow upload to own objects"
ON storage.objects FOR ALL
USING (
  auth.uid() IS NOT NULL AND
  bucket_id = 'avatars' AND
  (name = auth.uid() || owner = auth.uid())
);
```

---

## 🔧 Step 7: Configure Environment Variables

### 7.1 Create `.env` File

In your project root, create a `.env` file:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# College Email Domain (REQUIRED)
EXPO_PUBLIC_COLLEGE_DOMAIN=@yourcollege.edu

# Optional: Customize these if needed
EXPO_PUBLIC_GEOFENCE_RADIUS=1000
EXPO_PUBLIC_LOCATION_UPDATE_INTERVAL=15000
EXPO_PUBLIC_LOCATION_DISTANCE_INTERVAL=30
EXPO_PUBLIC_TRIP_TIMEOUT_MINUTES=45
```

### 7.2 Get Your Supabase Credentials

- **Project URL**: Found in Settings → API → Project URL
- **Anon Key**: Found in Settings → API → anon (public) key

**⚠️ Never commit your `.env` file to Git!** It's already in `.gitignore`.

---

## 🧪 Step 8: Test the Connection

### 8.1 Test in Development

1. Start your Expo app:
   ```bash
   npx expo start
   ```

2. Open the app in Expo Go
3. Try signing up with a `@yourcollege.edu` email
4. Verify you can see the app working

### 8.2 Test Database Directly

You can test your Supabase connection using the SQL Editor:

```sql
-- Test: Get all active trips
SELECT * FROM active_trips WHERE ended_at IS NULL;

-- Test: Get all routes
SELECT * FROM bus_routes;

-- Test: Get stops for a route
SELECT * FROM bus_stops WHERE route_id = 'your-route-id';

-- Test: Spatial query - find stops within 1km of a point
SELECT * FROM bus_stops 
WHERE ST_DWithin(
  location,
  ST_PointFromText('POINT(77.2088 28.6139)', 4326),
  1000
);
```

---

## 🎨 Step 9: Customize for Your Campus

### 9.1 Update Default Route and Stop

In [`src/utils/constants.ts`](src/utils/constants.ts):

```typescript
export const DEFAULT_ROUTE: BusRoute = {
  id: 'hostel-to-campus',
  name: 'Hostel to Main Campus',
  origin: 'Hostel',
  destination: 'Main Campus Block',
};

export const DEFAULT_HOSTEL_STOP = {
  id: 'hostel-gate-2',
  stop_name: 'Hostel Gate 2',
  location: {
    latitude: YOUR_LATITUDE,    // e.g., 28.6139
    longitude: YOUR_LONGITUDE,  // e.g., 77.2088
  },
  radius: 1000,
};
```

### 9.2 Or Insert in Database

Add your actual routes and stops:

```sql
-- Insert your route
INSERT INTO bus_routes (name, origin, destination)
VALUES ('Your Route Name', 'Start Location', 'End Location');

-- Insert your stops with actual coordinates
INSERT INTO bus_stops (route_id, stop_name, location, sequence_order, is_hostel_stop, geofence_radius)
VALUES (
  (SELECT id FROM bus_routes WHERE name = 'Your Route Name'),
  'Stop Name',
  ST_PointFromText('POINT(YOUR_LONGITUDE YOUR_LATITUDE)', 4326),
  1,  -- Sequence order
  TRUE,  -- Is this a hostel stop?
  1000  -- Geofence radius in meters
);
```

---

## 🚀 Step 10: Deploy and Test

### 10.1 Test with Multiple Devices

1. Install the app on 2+ devices
2. On Device 1: Sign in and start broadcasting
3. On Device 2: Select a stop and wait for notifications
4. Walk with Device 1 towards Device 2's location
5. Verify notifications appear when within 1km

### 10.2 Test Background Location

**For Android:**
1. Build with EAS: `eas build --profile development --platform android`
2. Install the APK
3. Close the app (don't force stop)
4. Start broadcasting
5. Verify location updates continue in background

**For iOS:**
1. Build with EAS: `eas build --profile development --platform ios`
2. Install via TestFlight
3. Enable background app refresh in iOS settings
4. Test similar to Android

---

## 🔍 Troubleshooting

### ❌ "Invalid credentials" Error
- **Solution**: Verify your `.env` file has correct Supabase URL and anon key
- Check for typos in the environment variables

### ❌ "Permission denied" on Location
- **Solution**: Grant location permissions in device settings
- For background location, ensure you've built with EAS

### ❌ "No active trips found"
- **Solution**: Make sure someone is broadcasting from a bus
- Check that the broadcaster's location permissions are enabled
- Verify the trip wasn't auto-ended (45 minute timeout)

### ❌ "Email not allowed"
- **Solution**: Update `EXPO_PUBLIC_COLLEGE_DOMAIN` in `.env`
- Ensure you're using the correct college email domain

### ❌ "RLS policy error"
- **Solution**: Verify all RLS policies are correctly configured
- Check Supabase logs for detailed error messages

### ❌ "Realtime not working"
- **Solution**: Ensure Realtime is enabled for the tables
- Check your Supabase project's Realtime settings
- Verify you're using the correct Supabase URL

---

## 📊 Monitoring and Analytics

### View Realtime Activity
1. Go to **Realtime** in Supabase dashboard
2. View active connections and subscriptions

### View Database Activity
1. Go to **Logs** in Supabase dashboard
2. Filter by table name to see queries

### View Authentication
1. Go to **Authentication** → **Users**
2. View all registered users
3. Check user metadata

---

## 🎯 Best Practices

### 1. Security
- ✅ Always use RLS policies
- ✅ Never expose your service role key in the app
- ✅ Use environment variables for sensitive data
- ✅ Regularly audit your database permissions

### 2. Performance
- ✅ Use spatial indexes for location queries
- ✅ Limit realtime subscriptions to necessary tables
- ✅ Set appropriate update intervals (15-30 seconds)
- ✅ Clean up ended trips regularly

### 3. Battery Optimization
- ✅ Use `distanceInterval` to reduce GPS pings when stationary
- ✅ Set reasonable `timeInterval` (15-30 seconds)
- ✅ Stop tracking when not needed
- ✅ Use foreground service notifications

### 4. Data Management
- ✅ Auto-end trips after 45 minutes
- ✅ Clean up old trip data periodically
- ✅ Archive historical data for analytics

---

## 📅 Maintenance Tasks

### Weekly
- [ ] Monitor database size and performance
- [ ] Check for and clean up orphaned trips
- [ ] Review authentication logs

### Monthly
- [ ] Update dependencies
- [ ] Review RLS policies
- [ ] Optimize database indexes
- [ ] Archive old data

### As Needed
- [ ] Add new routes and stops
- [ ] Update geofence radii
- [ ] Adjust notification preferences

---

## 🔗 Useful Links

- [Supabase Dashboard](https://app.supabase.com)
- [Supabase Documentation](https://supabase.com/docs)
- [Expo Documentation](https://docs.expo.dev)
- [PostGIS Documentation](https://postgis.net/docs)

---

## 💬 Support

If you encounter issues:
1. Check the [Supabase Community](https://github.com/supabase/supabase/discussions)
2. Review [Supabase GitHub Issues](https://github.com/supabase/supabase/issues)
3. Consult [Expo Forums](https://forums.expo.dev)

---

**✅ Your Supabase is now ready for the Campus Bus Tracker!**

Run the app, sign up with your college email, and start tracking buses! 🚌
