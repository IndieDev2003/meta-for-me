import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../utils/constants';
import { BusStop } from '../types';

interface StopSelectorProps {
  stops: BusStop[];
  selectedStop: BusStop | null;
  onSelectStop: (stop: BusStop) => void;
}

export const StopSelector: React.FC<StopSelectorProps> = ({ stops, selectedStop, onSelectStop }) => {
  if (stops.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No stops available</Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContainer}
    >
      {stops.map((stop) => (
        <TouchableOpacity
          key={stop.id}
          style={[
            styles.stopButton,
            selectedStop?.id === stop.id && styles.selectedStopButton,
          ]}
          onPress={() => onSelectStop(stop)}
        >
          <Text
            style={[
              styles.stopText,
              selectedStop?.id === stop.id && styles.selectedStopText,
            ]}
          >
            {stop.stop_name}
          </Text>
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
  stopButton: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginRight: SPACING.md,
    minWidth: 120,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  selectedStopButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  stopText: {
    fontSize: TYPOGRAPHY.base.fontSize,
    color: COLORS.text,
    fontWeight: '500',
  },
  selectedStopText: {
    color: 'white',
  },
  emptyText: {
    fontSize: TYPOGRAPHY.base.fontSize,
    color: COLORS.textSecondary,
    textAlign: 'center',
    padding: SPACING.md,
  },
});
