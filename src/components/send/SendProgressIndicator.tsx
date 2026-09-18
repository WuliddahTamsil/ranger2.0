import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Check } from "lucide-react-native";

interface SendProgressIndicatorProps {
  currentStep: 1 | 2 | 3;
}

export const SendProgressIndicator: React.FC<SendProgressIndicatorProps> = ({ currentStep }) => {
  const steps = [
    { num: 1, label: "Rute" },
    { num: 2, label: "Barang" },
    { num: 3, label: "Review" },
  ];

  return (
    <View style={styles.container}>
      {steps.map((step, idx) => {
        const isCompleted = step.num < currentStep;
        const isActive = step.num === currentStep;

        return (
          <React.Fragment key={step.num}>
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.circle,
                  isCompleted && styles.circleCompleted,
                  isActive && styles.circleActive,
                ]}
              >
                {isCompleted ? (
                  <Check size={12} color="#FFFFFF" strokeWidth={3} />
                ) : (
                  <Text
                    style={[
                      styles.stepNumText,
                      isActive && styles.stepNumTextActive,
                    ]}
                  >
                    {step.num}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  (isActive || isCompleted) && styles.stepLabelActive,
                ]}
              >
                {step.label}
              </Text>
            </View>

            {idx < steps.length - 1 && (
              <View
                style={[
                  styles.connector,
                  isCompleted && styles.connectorCompleted,
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  circle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  circleActive: {
    backgroundColor: "#059669",
  },
  circleCompleted: {
    backgroundColor: "#059669",
  },
  stepNumText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  stepNumTextActive: {
    color: "#FFFFFF",
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
  },
  stepLabelActive: {
    color: "#0F172A",
    fontWeight: "800",
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 10,
    maxWidth: 48,
  },
  connectorCompleted: {
    backgroundColor: "#059669",
  },
});
