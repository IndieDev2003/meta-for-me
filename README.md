# 🚍 Campus Bus Tracker

> Real-time, crowdsourced bus tracking and overcrowding notifications built for college hostel students.

---

## 📌 Problem Statement

Public university buses often lack open real-time GPS APIs. Students waiting at hostel stops frequently miss buses or wait for vehicles that arrive completely full.

**Campus Bus Tracker** solves this through crowdsourced updates: students riding the bus broadcast their location in the background and report occupancy status, triggering proximity alerts for waiting hostel mates.

---

## ✨ Features

* 🔒 **Campus-Only Auth:** Sign-up locked strictly to `@college.edu` domain emails.
* 🛰️ **Crowdsourced GPS Pings:** Low-battery background location broadcasting for passengers on board.
* 🚦 **Live Overcrowding Status:** Simple 1-tap reporting (*Seats Available*, *Standing Only*, *Full / Skipping Stops*).
* 📍 **Geofenced Arrival Alerts:** Automated push notifications sent when a bus crosses a 1 km radius threshold from the hostel gate.
* ⚡ **Zero-Polling Updates:** Powered by Supabase Realtime WebSocket channels.

---

## 🛠️ Tech Stack

* **Frontend:** React Native (Expo)
* **Location & Background Services:** `expo-location`, `expo-task-manager`
* **Notifications:** `expo-notifications`
* **Backend & Database:** Supabase (PostgreSQL + PostGIS)
* **Realtime Streaming:** Supabase Realtime Channels
* **Hosting / CI:** Expo Application Services (EAS)

---

## 🏗️ Database Setup (Supabase + PostGIS)

1. Enable the **PostGIS** extension in your Supabase SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;

```


2. Run the core database schema script:
```sql
-- Routes
CREATE TABLE bus_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL
);

-- Stops with Spatial Coordinates
CREATE TABLE bus_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES bus_routes(id) ON DELETE CASCADE,
  stop_name TEXT NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  sequence_order INT NOT NULL
);

-- Active Trip Telemetry
CREATE TABLE active_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES bus_routes(id) ON DELETE CASCADE,
  broadcaster_id UUID REFERENCES auth.users(id),
  current_location GEOGRAPHY(POINT, 4326),
  occupancy_status TEXT CHECK (occupancy_status IN ('SEATS_AVAILABLE', 'STANDING_ONLY', 'FULL_SKIPPING_STOPS')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial index for high-speed proximity queries
CREATE INDEX idx_bus_stops_location ON bus_stops USING GIST(location);
CREATE INDEX idx_active_trips_location ON active_trips USING GIST(current_location);

```



---

## 🚀 Getting Started

### Prerequisites

* Node.js (v18 or higher)
* npm / yarn / bun
* Expo Go app on iOS/Android (for basic testing) or EAS Build setup (for background location permissions)
* A [Supabase](https://supabase.com?utm_source=gemini) project

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/your-username/campus-bus-tracker.git
cd campus-bus-tracker

```


2. **Install dependencies:**
```bash
npm install

```


3. **Configure Environment Variables:**
Create a `.env` file in the root directory:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

```


4. **Start the development server:**
```bash
npx expo start

```



---

## 📱 Build for Background Location Testing

Standard Expo Go does not support persistent background location tasks. Create a development build using **EAS**:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build development client for Android/iOS
eas build --profile development --platform android

```

---

## 🗺️ Roadmap

* [x] Student domain auth locking
* [x] Background location broadcasting
* [x] PostGIS spatial queries for stop proximity
* [ ] Automated trip ending when the bus reaches the final destination
* [ ] Multi-route selection UI
* [ ] Bus captain leaderboards & contributor rewards

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
