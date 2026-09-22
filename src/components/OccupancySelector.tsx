import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, OCCUPANCY_STATUS } from '../utils/constants';
import { OccupancyStatus } from '../types';

interface OccupancySelectorProps {
  selectedStatus: OccupancyStatus;
  onSelectStatus: (status: OccupancyStatus) => void;
}

export const OccupancySelector: React.FC<OccupancySelectorProps> = ({
  selectedStatus,
  onSelectStatus,
}) => {
  const statuses: OccupancyStatus[] = ['SEATS_AVAILABLE', 'STANDING_ONLY', 'FULL_SKIPPING_STOPS'];

  return (
    <View style={styles.container}>
      {statuses.map((status) => {
        const statusInfo = OCCUPANCY_STATUS[status];
        const isSelected = selectedStatus === status;

        return (
          <TouchableOpacity
            key={status}
            style={[
              styles.statusButton,
              { backgroundColor: statusInfo.color },
              isSelected && styles.selectedStatusButton,
            ]}
            onPress={() => onSelectStatus(status)}
          >
            <Text style={styles.statusEmoji}>{statusInfo.emoji}</Text>
            <Text
              style={[
                styles.statusLabel,
                isSelected && styles.selectedStatusLabel,
              ]}
            >
              {statusInfo.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  statusButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedStatusButton: {
    borderColor: COLORS.text,
    borderWidth: 2,
  },
  statusEmoji: {
    fontSize: 32,
    marginBottom: SPACING.sm,
  },
  statusLabel: {
    fontSize: TYPOGRAPHY.sm.fontSize,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
  },
  selectedStatusLabel: {
    textDecorationLine: 'underline',
  },
});
