// App Configuration
import { OccupancyStatus } from '../types';

export const APP_CONFIG = {
  COLLEGE_EMAIL_DOMAIN: '@college.edu',
  GEOFENCE_RADIUS: 1000, // meters
  LOCATION_UPDATE_INTERVAL: 15000, // 15 seconds in ms
  LOCATION_DISTANCE_INTERVAL: 30, // 30 meters
  TRIP_TIMEOUT_MINUTES: 45, // Auto-stop tracking after 45 minutes
  NOTIFICATION_TTL: 300, // 5 minutes in seconds
};

// Occupancy Status Configuration
export const OCCUPANCY_STATUS: Record<OccupancyStatus, { label: string; color: string; emoji: string }> = {
  SEATS_AVAILABLE: {
    label: 'Seats Available',
    color: '#22c55e',
    emoji: '🟢',
  },
  STANDING_ONLY: {
    label: 'Standing Only',
    color: '#f59e0b',
    emoji: '🟡',
  },
  FULL_SKIPPING_STOPS: {
    label: 'Full / Skipping Stops',
    color: '#ef4444',
    emoji: '🔴',
  },
};

// Default Hostel Stop (V1 Scope - Single route and stop)
export const DEFAULT_HOSTEL_STOP = {
  id: 'hostel-gate-2',
  stop_name: 'Hostel Gate 2',
  location: {
    latitude: 0.0, // Replace with actual coordinates
    longitude: 0.0, // Replace with actual coordinates
  },
  radius: APP_CONFIG.GEOFENCE_RADIUS,
};

// Default Route (V1 Scope - Single route)
export const DEFAULT_ROUTE: BusRoute = {
  id: 'hostel-to-campus',
  name: 'Hostel to Main Campus',
  origin: 'Hostel',
  destination: 'Main Campus Block',
};

// Colors
export const COLORS = {
  primary: '#3b82f6',
  secondary: '#1e40af',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  background: '#f8fafc',
  card: '#ffffff',
  text: '#1e293b',
  textSecondary: '#64748b',
  border: '#e2e8f0',
  muted: '#94a3b8',
};

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
};

// Typography
export const TYPOGRAPHY = {
  xs: { fontSize: 12, lineHeight: 16 },
  sm: { fontSize: 14, lineHeight: 20 },
  base: { fontSize: 16, lineHeight: 24 },
  lg: { fontSize: 18, lineHeight: 28 },
  xl: { fontSize: 20, lineHeight: 32 },
  '2xl': { fontSize: 24, lineHeight: 36 },
  '3xl': { fontSize: 30, lineHeight: 40 },
};

// Reusable styles
export const STYLES = {
  container: {
    flex: 1,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  button: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: TYPOGRAPHY.base.fontSize,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: SPACING.md,
    backgroundColor: COLORS.card,
    color: COLORS.text,
  },
};

// Notification Messages
export const NOTIFICATION_MESSAGES = {
  BUS_NEARBY: (stopName: string, status: string, minutes: number) =>
    `Bus is ${minutes} minutes away from ${stopName} (Status: ${status}).`,
  BUS_ARRIVED: (stopName: string) => `Bus has arrived at ${stopName}!`,
  NEW_BROADCASTER: (routeName: string) => `New broadcaster started for ${routeName}.`,
  TRIP_ENDED: (routeName: string) => `The trip for ${routeName} has ended.`,
};

// Reuse the BusRoute type from types
import type { BusRoute } from '../types';
