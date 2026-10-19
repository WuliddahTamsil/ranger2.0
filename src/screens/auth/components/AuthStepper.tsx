import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { authColors } from "../authStyles";

interface AuthStepperProps {
  current: number;
  labels: string[] | readonly string[];
}

export const AuthStepper: React.FC<AuthStepperProps> = ({ current, labels }) => {
  if (labels.length <= 1) return null;

  const currentLabel = labels[current] || "";
  const percent = Math.round(((current + 1) / labels.length) * 100);

  return (
    <View style={styles.container}>
      {/* Step Info Row */}
      <View style={styles.headerRow}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>
            Langkah {current + 1} dari {labels.length}
          </Text>
        </View>
        <Text style={styles.stepTitle}>{currentLabel}</Text>
        <Text style={styles.percentText}>{percent}%</Text>
      </View>

      {/* Modern Segmented Progress Bar */}
      <View style={styles.segmentsRow}>
        {labels.map((_, index) => {
          const isCompleted = index <= current;
          return (
            <View
              key={index}
              style={[
                styles.segment,
                isCompleted ? styles.segmentActive : styles.segmentInactive,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginTop: 18,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  stepBadge: {
    backgroundColor: authColors.primaryLight,
    borderWidth: 1,
    borderColor: authColors.primaryBorder,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  stepBadgeText: {
    color: authColors.primaryDark,
    fontSize: 11,
    fontWeight: "700",
  },
  stepTitle: {
    flex: 1,
    marginHorizontal: 8,
    color: authColors.ink,
    fontSize: 12.5,
    fontWeight: "600",
  },
  percentText: {
    color: authColors.muted,
    fontSize: 11.5,
    fontWeight: "700",
  },
  segmentsRow: {
    flexDirection: "row",
    gap: 6,
    height: 5,
    width: "100%",
  },
  segment: {
    flex: 1,
    height: 5,
    borderRadius: 3,
  },
  segmentActive: {
    backgroundColor: authColors.primary,
  },
  segmentInactive: {
    backgroundColor: authColors.line,
  },
});
