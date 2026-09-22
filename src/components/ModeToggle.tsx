import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../utils/constants';
import { AppMode } from '../types';

interface ModeToggleProps {
  mode: AppMode;
  onPress: () => void;
}

export const ModeToggle: React.FC<ModeToggleProps> = ({ mode, onPress }) => {
  const isWaitingMode = mode === 'WAITING';

  return (
    <View style={styles.container}>
      <View style={[styles.modeContainer, isWaitingMode && styles.activeModeContainer]}>
        <Text style={[styles.modeLabel, isWaitingMode && styles.activeModeLabel]}>
          🏠 Waiting Mode
        </Text>
      </View>

      <TouchableOpacity style={styles.toggleButton} onPress={onPress}>
        <View style={styles.toggleSwitch}>
          <View style={[styles.toggleThumb, isWaitingMode ? styles.thumbLeft : styles.thumbRight]} />
        </View>
      </TouchableOpacity>

      <View style={[styles.modeContainer, !isWaitingMode && styles.activeModeContainer]}>
        <Text style={[styles.modeLabel, !isWaitingMode && styles.activeModeLabel]}>
          🎤 Broadcaster
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: SPACING.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeContainer: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.md,
    opacity: 0.6,
  },
  activeModeContainer: {
    opacity: 1,
  },
  modeLabel: {
    fontSize: TYPOGRAPHY.base.fontSize,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  activeModeLabel: {
    color: COLORS.text,
    fontWeight: '600',
  },
  toggleButton: {
    padding: SPACING.xs,
  },
  toggleSwitch: {
    width: 50,
    height: 30,
    backgroundColor: COLORS.border,
    borderRadius: 15,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    backgroundColor: 'white',
    borderRadius: 13,
    position: 'absolute',
    top: 2,
  },
  thumbLeft: {
    left: 2,
  },
  thumbRight: {
    right: 2,
  },
});
