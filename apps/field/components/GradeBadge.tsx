import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Colors from '../constants/colors';
import { QualityGrade } from '../types';

interface GradeBadgeProps {
  grade: QualityGrade | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const GradeBadge: React.FC<GradeBadgeProps> = ({
  grade,
  size = 'md',
  showIcon = true,
}) => {
  const normalized = (grade || '').toLowerCase();
  
  let backgroundColor: string;
  let textColor: string;
  let label: string;

  if (normalized.includes('high')) {
    backgroundColor = '#dcfce7'; // green-100
    textColor = Colors.high;
    label = size === 'sm' ? 'High' : 'High Quality';
  } else if (normalized.includes('low')) {
    backgroundColor = '#fee2e2'; // red-100
    textColor = Colors.low;
    label = size === 'sm' ? 'Low' : 'Low Quality';
  } else {
    backgroundColor = '#fef3c7'; // amber-100
    textColor = Colors.medium;
    label = size === 'sm' ? 'Medium' : 'Medium Quality';
  }

  const iconSize = size === 'sm' ? 12 : size === 'lg' ? 18 : 14;

  return (
    <View
      style={[
        styles.badge,
        styles[size],
        { backgroundColor },
      ]}
    >
      {showIcon && (
        <Ionicons
          name="leaf"
          size={iconSize}
          color={textColor}
          style={styles.icon}
        />
      )}
      <Text style={[styles.text, styles[`text_${size}`], { color: textColor }]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 9999,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  sm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  md: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  lg: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  text_sm: {
    fontSize: 11,
  },
  text_md: {
    fontSize: 13,
  },
  text_lg: {
    fontSize: 16,
  },
});

export default GradeBadge;
