# 🚌 Campus Bus Tracker

> **Real-time, crowdsourced bus tracking and overcrowding notifications built for college hostel students.**

---

## 📌 Problem Statement

Public university buses often lack open real-time GPS APIs. Students waiting at hostel stops frequently miss buses or wait for vehicles that arrive completely full.

**Campus Bus Tracker** solves this through crowdsourced updates: students riding the bus broadcast their location in the background and report occupancy status, triggering proximity alerts for waiting hostel mates.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔒 **Campus-Only Auth** | Sign-up locked strictly to `@college.edu` domain emails |
| 🛰️ **Crowdsourced GPS Pings** | Low-battery background location broadcasting for passengers on board |
| 🚦 **Live Overcrowding Status** | Simple 1-tap reporting (*Seats Available*, *Standing Only*, *Full / Skipping Stops*) |
| 📍 **Geofenced Arrival Alerts** | Automated push notifications sent when a bus crosses a 1 km radius threshold from the hostel gate |
| ⚡ **Zero-Polling Updates** | Powered by Supabase Realtime WebSocket channels |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React Native (Expo) |
| **Location & Background Services** | `expo-location`, `expo-task-manager` |
| **Notifications** | `expo-notifications` |
| **Backend & Database** | Supabase (PostgreSQL + PostGIS) |
| **Realtime Streaming** | Supabase Realtime Channels |
| **Hosting / CI** | Expo Application Services (EAS) |

---

## 🏗️ Database Setup (Supabase + PostGIS)

### Step 1: Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com) and create a new project
2. Note your project URL and anon key

### Step 2: Enable PostGIS Extension

In your Supabase SQL Editor, run:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Step 3: Run Database Schema

Copy and execute the complete schema from [`database/schema.sql`](database/schema.sql):

```sql
-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create tables: bus_routes, bus_stops, active_trips, user_profiles
-- Create spatial indexes for high-speed proximity queries
-- Create helper functions for distance calculations
-- Insert sample data for V1 (single route and stop)
```

### Step 4: Configure Row Level Security (RLS)

Enable RLS on your tables and create policies:

```sql
-- Enable RLS on active_trips
ALTER TABLE active_trips ENABLE ROW LEVEL SECURITY;

-- Allow read access to all users
CREATE POLICY "Allow read access to active_trips"
ON active_trips FOR SELECT
USING (true);

-- Allow insert/update to authenticated users
CREATE POLICY "Allow insert on active_trips"
ON active_trips FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow update on active_trips"
ON active_trips FOR UPDATE
USING (auth.uid() = broadcaster_id)
WITH CHECK (auth.uid() = broadcaster_id);

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to user_profiles"
ON user_profiles FOR SELECT
USING (true);

CREATE POLICY "Allow insert on user_profiles"
ON user_profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow update on user_profiles"
ON user_profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm / yarn / bun
- Expo Go app on iOS/Android (for basic testing)
- **OR** EAS Build setup (for background location permissions)
- A [Supabase](https://supabase.com) project

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/IndieDev2003/meta-for-me.git
   cd meta-for-me
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   
   Create a `.env` file in the root directory:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   EXPO_PUBLIC_COLLEGE_DOMAIN=@college.edu
   ```
   
   You can find your Supabase credentials in:
   - **Project URL**: Settings → API → Project URL
   - **Anon Key**: Settings → API → anon (public) key

4. **Update College Domain:**
   
   Change `EXPO_PUBLIC_COLLEGE_DOMAIN` to your actual college email domain (e.g., `@yourcollege.edu`)

5. **Start the development server:**
   ```bash
   npx expo start
   ```

6. **Scan the QR code** with Expo Go app on your phone

---

## 📱 Build for Background Location Testing

⚠️ **Important:** Standard Expo Go does NOT support persistent background location tasks.

### For Android:

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo
eas login

# Build development client for Android
eas build --profile development --platform android

# Install the APK on your device
```

### For iOS (macOS required):

```bash
# Build development client for iOS
eas build --profile development --platform ios

# Install via TestFlight or directly to device
```

### Configure Background Location in app.json

The app.json already includes the necessary configuration:
```json
{
  "ios": {
    "infoPlist": {
      "UIBackgroundModes": ["location"],
      "NSLocationWhenInUseUsageDescription": "...",
      "NSLocationAlwaysAndWhenInUseUsageDescription": "...",
      "NSLocationAlwaysUsageDescription": "..."
    }
  },
  "android": {
    "permissions": [
      "ACCESS_FINE_LOCATION",
      "ACCESS_BACKGROUND_LOCATION",
      "ACCESS_COARSE_LOCATION",
      "FOREGROUND_SERVICE",
      "POST_NOTIFICATIONS"
    ]
  }
}
```

---

## 🗺️ App Configuration

### Customize for Your Campus

1. **Update Stop Coordinates:**
   
   In [`src/utils/constants.ts`](src/utils/constants.ts), update the default stop:
   ```typescript
   export const DEFAULT_HOSTEL_STOP = {
     id: 'hostel-gate-2',
     stop_name: 'Hostel Gate 2',
     location: {
       latitude: YOUR_LATITUDE,    // Replace with actual coordinates
       longitude: YOUR_LONGITUDE,  // Replace with actual coordinates
     },
     radius: 1000,
   };
   ```

2. **Update Route Information:**
   ```typescript
   export const DEFAULT_ROUTE: BusRoute = {
     id: 'hostel-to-campus',
     name: 'Hostel to Main Campus',
     origin: 'Hostel',
     destination: 'Main Campus Block',
   };
   ```

3. **Or Insert in Database:**
   
   Uncomment and modify the sample data in `database/schema.sql`:
   ```sql
   INSERT INTO bus_routes (name, origin, destination)
   VALUES ('Hostel to Main Campus', 'Hostel', 'Main Campus Block');

   INSERT INTO bus_stops (route_id, stop_name, location, sequence_order, is_hostel_stop)
   VALUES (
     (SELECT id FROM bus_routes WHERE name = 'Hostel to Main Campus'),
     'Hostel Gate 2',
     ST_PointFromText('POINT(YOUR_LONGITUDE YOUR_LATITUDE)', 4326),
     1,
     TRUE
   );
   ```

### Configuration Options

In [`src/utils/constants.ts`](src/utils/constants.ts):

```typescript
export const APP_CONFIG = {
  COLLEGE_EMAIL_DOMAIN: '@college.edu',    // Change to your domain
  GEOFENCE_RADIUS: 1000,                   // meters
  LOCATION_UPDATE_INTERVAL: 15000,        // 15 seconds
  LOCATION_DISTANCE_INTERVAL: 30,         // 30 meters
  TRIP_TIMEOUT_MINUTES: 45,               // Auto-stop after 45 min
};
```

---

## 📱 App Usage

### Mode A: "I'm Waiting at Stop" (Consumer)

1. Open the app
2. Select your hostel stop
3. View real-time bus locations and occupancy status
4. Receive push notifications when buses are nearby

### Mode B: "I'm On the Bus" (Broadcaster)

1. Sign in with your college email
2. Select your bus route
3. Tap "Start Broadcasting"
4. Update occupancy status with 1-tap buttons:
   - 🟢 **Seats Available**
   - 🟡 **Standing Only**
   - 🔴 **Full / Skipping Stops**
5. Your location is automatically shared every 15 seconds
6. Stop broadcasting when you reach your destination

---

## 🗺️ Roadmap

| Status | Feature |
|--------|---------|
| ✅ | Student domain auth locking |
| ✅ | Background location broadcasting |
| ✅ | PostGIS spatial queries for stop proximity |
| ⬜ | Automated trip ending when bus reaches final destination |
| ⬜ | Multi-route selection UI |
| ⬜ | Bus captain leaderboards & contributor rewards |
| ⬜ | Historical trip data and analytics |
| ⬜ | Scheduled bus timings integration |

---

## 🛠️ Project Structure

```
meta-for-me/
├── App.tsx                          # Main app with React Navigation
├── app.json                         # Expo configuration
├── package.json                     # Dependencies
├── .env.example                     # Environment variables template
├── database/
│   └── schema.sql                   # Supabase database schema
└── src/
    ├── types/
    │   └── index.ts                 # TypeScript interfaces
    ├── utils/
    │   └── constants.ts             # App configuration
    ├── services/
    │   ├── authService.ts           # Authentication logic
    │   ├── locationService.ts       # GPS tracking
    │   ├── notificationService.ts   # Push notifications
    │   ├── supabaseClient.ts        # Supabase client
    │   └── tripService.ts            # Trip management
    ├── hooks/
    │   ├── useAuth.ts
    │   ├── useLocation.ts
    │   └── useTrips.ts
    ├── screens/
    │   ├── AuthScreen.tsx           # Login/Register
    │   ├── WaitingScreen.tsx        # Consumer mode
    │   └── BroadcasterScreen.tsx    # Broadcaster mode
    └── components/
        ├── TripCard.tsx
        ├── StopSelector.tsx
        ├── RouteSelector.tsx
        ├── OccupancySelector.tsx
        └── ModeToggle.tsx
```

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/IndieDev2003/meta-for-me/issues)
- **Documentation:** [Expo Docs](https://docs.expo.dev) | [Supabase Docs](https://supabase.com/docs)

---

## 🔗 Links

- [Expo Documentation](https://docs.expo.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [React Native Maps](https://github.com/react-native-maps/react-native-maps)
- [Expo Location](https://docs.expo.dev/versions/latest/sdk/location/)
- [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)

---

**Made with ❤️ for college students by students**
