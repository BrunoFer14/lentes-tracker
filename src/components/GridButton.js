import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function GridButton({ icon, label, bgColor = '#eee', onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.squareButton, { backgroundColor: bgColor }]}
    >
      <Text style={styles.gridIcon}>{icon}</Text>
      <Text style={styles.gridLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  squareButton: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  gridIcon: { fontSize: 36, marginBottom: 10 },
  gridLabel: { fontSize: 16, fontWeight: '600', color: '#222', textAlign: 'center' },
});
