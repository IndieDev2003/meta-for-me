import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, OCCUPANCY_STATUS } from '../utils/constants';
import { ActiveTrip } from '../types';

interface TripCardProps {
  trip: ActiveTrip;
  onPress: () => void;
}

export const TripCard: React.FC<TripCardProps> = ({ trip, onPress }) => {
  // Format time since last update
  const formatTimeSinceUpdate = () => {
    const updatedAt = new Date(trip.updated_at || '');
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - updatedAt.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds}s ago`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    }
  };

  // Get occupancy status info
  const statusInfo = OCCUPANCY_STATUS[trip.occupancy_status as keyof typeof OCCUPANCY_STATUS] || {
    label: trip.occupancy_status,
    color: COLORS.muted,
    emoji: '❓',
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.routeInfo}>
          <Text style={styles.routeName}>{trip.route_name || 'Unknown Route'}</Text>
          <Text style={styles.routeDetails}>
            {trip.route_origin} → {trip.route_destination}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
          <Text style={styles.statusText}>
            {statusInfo.emoji} {statusInfo.label}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        {trip.broadcaster_name && (
          <Text style={styles.broadcasterText}>
            Broadcaster: {trip.broadcaster_name}
          </Text>
        )}

        {trip.passenger_count && (
          <Text style={styles.passengerText}>
            Passengers: {trip.passenger_count}
          </Text>
        )}

        {trip.current_location && (
          <Text style={styles.locationText}>
            Lat: {trip.current_location.latitude.toFixed(6)}, 
            Lon: {trip.current_location.longitude.toFixed(6)}
          </Text>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.timestamp}>
          Updated {formatTimeSinceUpdate()}
        </Text>
        {trip.speed && (
          <Text style={styles.speed}>
            {Math.round(trip.speed)} km/h
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  routeInfo: {
    flex: 1,
  },
  routeName: {
    fontSize: TYPOGRAPHY.lg.fontSize,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  routeDetails: {
    fontSize: TYPOGRAPHY.sm.fontSize,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontWeight: '600',
    fontSize: TYPOGRAPHY.sm.fontSize,
  },
  body: {
    marginBottom: SPACING.md,
  },
  broadcasterText: {
    fontSize: TYPOGRAPHY.sm.fontSize,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  passengerText: {
    fontSize: TYPOGRAPHY.sm.fontSize,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  locationText: {
    fontSize: TYPOGRAPHY.xs.fontSize,
    color: COLORS.muted,
    fontFamily: 'monospace',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: TYPOGRAPHY.xs.fontSize,
    color: COLORS.textSecondary,
  },
  speed: {
    fontSize: TYPOGRAPHY.xs.fontSize,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
