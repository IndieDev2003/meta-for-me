import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../utils/constants';
import { BusRoute } from '../types';

interface RouteSelectorProps {
  routes: BusRoute[];
  selectedRoute: BusRoute | null;
  onSelectRoute: (route: BusRoute) => void;
  disabled?: boolean;
}

export const RouteSelector: React.FC<RouteSelectorProps> = ({
  routes,
  selectedRoute,
  onSelectRoute,
  disabled = false,
}) => {
  if (routes.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No routes available</Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContainer}
    >
      {routes.map((route) => (
        <TouchableOpacity
          key={route.id}
          style={[
            styles.routeButton,
            selectedRoute?.id === route.id && styles.selectedRouteButton,
            disabled && styles.disabledButton,
          ]}
          onPress={() => !disabled && onSelectRoute(route)}
          disabled={disabled}
        >
          <View style={styles.routeContent}>
            <Text
              style={[
                styles.routeName,
                selectedRoute?.id === route.id && styles.selectedRouteName,
              ]}
            >
              {route.name}
            </Text>
            <Text
              style={[
                styles.routeDetails,
                selectedRoute?.id === route.id && styles.selectedRouteDetails,
              ]}
            >
              {route.origin} → {route.destination}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    paddingVertical: SPACING.sm,
  },
  routeButton: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginRight: SPACING.md,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  selectedRouteButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  disabledButton: {
    opacity: 0.6,
  },
  routeContent: {
    alignItems: 'flex-start',
  },
  routeName: {
    fontSize: TYPOGRAPHY.base.fontSize,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  selectedRouteName: {
    color: 'white',
  },
  routeDetails: {
    fontSize: TYPOGRAPHY.sm.fontSize,
    color: COLORS.textSecondary,
  },
  selectedRouteDetails: {
    color: '#e0f2fe',
  },
  emptyText: {
    fontSize: TYPOGRAPHY.base.fontSize,
    color: COLORS.textSecondary,
    textAlign: 'center',
    padding: SPACING.md,
  },
});
