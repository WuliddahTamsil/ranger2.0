import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const getResponsiveGutter = (width: number) => clamp(width * 0.05, 16, 24);

export const getResponsiveScale = (width: number) => clamp(width / 390, 0.9, 1.08);

export const useResponsiveLayout = () => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return {
    width,
    height,
    isSmallPhone: width < 360,
    isLargePhone: width >= 430,
    gutter: getResponsiveGutter(width),
    scale: getResponsiveScale(width),
    topInset: insets.top,
    bottomInset: insets.bottom,
    safeBottom: insets.bottom + 16,
  };
};
