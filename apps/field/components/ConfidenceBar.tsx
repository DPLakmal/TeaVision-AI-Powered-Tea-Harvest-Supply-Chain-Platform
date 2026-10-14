import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Colors from '../constants/colors';
import { QualityGrade } from '../types';

interface ConfidenceBarProps {
  confidence: number; // 0.0 to 1.0 or 0 to 100
  grade?: QualityGrade | string;
  showBreakdown?: boolean;
  scores?: {
    high_quality: number;
    medium_quality: number;
    low_quality: number;
  };
}

export const ConfidenceBar: React.FC<ConfidenceBarProps> = ({
  confidence,
  grade = 'high',
  showBreakdown = false,
  scores,
}) => {
  // Normalize confidence to 0-100 percentage
  const pct = confidence <= 1 ? Math.round(confidence * 100) : Math.min(100, Math.round(confidence));

  let barColor: string = Colors.high;
  const normalizedGrade = (grade || '').toLowerCase();
  if (normalizedGrade.includes('low')) {
    barColor = Colors.low;
  } else if (normalizedGrade.includes('medium')) {
    barColor = Colors.medium;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>AI Confidence</Text>
        <Text style={[styles.percentage, { color: barColor }]}>{pct}%</Text>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>

      {showBreakdown && scores && (
        <View style={styles.breakdownContainer}>
          <View style={styles.scoreItem}>
            <View style={[styles.dot, { backgroundColor: Colors.high }]} />
            <Text style={styles.scoreLabel}>High</Text>
            <Text style={styles.scoreValue}>
              {Math.round((scores.high_quality <= 1 ? scores.high_quality * 100 : scores.high_quality))}%
            </Text>
          </View>

          <View style={styles.scoreItem}>
            <View style={[styles.dot, { backgroundColor: Colors.medium }]} />
            <Text style={styles.scoreLabel}>Med</Text>
            <Text style={styles.scoreValue}>
              {Math.round((scores.medium_quality <= 1 ? scores.medium_quality * 100 : scores.medium_quality))}%
            </Text>
          </View>

          <View style={styles.scoreItem}>
            <View style={[styles.dot, { backgroundColor: Colors.low }]} />
            <Text style={styles.scoreLabel}>Low</Text>
            <Text style={styles.scoreValue}>
              {Math.round((scores.low_quality <= 1 ? scores.low_quality * 100 : scores.low_quality))}%
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  percentage: {
    fontSize: 14,
    fontWeight: '700',
  },
  track: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  breakdownContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
  },
  scoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  scoreLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  scoreValue: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text,
  },
});

export default ConfidenceBar;
