import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const getResponsiveGutter = (width: number) => clamp(width * 0.05, 16, 24);

export const getResponsiveScale = (width: number) => clamp(width / 390, 0.9, 1.08);

export const MAX_FONT_SCALE_MULTIPLIER = 1.15;

export const scaleFont = (fontSize: number, width: number) => {
  const fontRatio = clamp(width / 390, 0.88, 1.05);
  return Math.round(fontSize * fontRatio);
};

export const getBottomBarPadding = (bottomInset: number, basePadding = 8) => {
  return Math.max(bottomInset, basePadding);
};

export const getBottomSpace = (bottomInset: number, barHeight = 64, extraPadding = 16) => {
  return Math.max(bottomInset, 0) + barHeight + extraPadding;
};

export const isShortScreen = (height: number) => height < 680;
export const isNarrowScreen = (width: number) => width < 360;
export const isTablet = (width: number) => width >= 768;

export const useResponsiveLayout = () => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return {
    width,
    height,
    isSmallPhone: width < 360,
    isNarrow: width < 360,
    isShort: height < 680,
    isLargePhone: width >= 430,
    isTablet: width >= 768,
    gutter: getResponsiveGutter(width),
    scale: getResponsiveScale(width),
    fontScaleLimit: MAX_FONT_SCALE_MULTIPLIER,
    topInset: insets.top,
    bottomInset: insets.bottom,
    safeBottom: insets.bottom + 16,
    bottomBarPadding: Math.max(insets.bottom, 8),
    bottomSpace: Math.max(insets.bottom, 0) + 80,
    getBottomSpace: (barHeight = 64, extra = 16) => Math.max(insets.bottom, 0) + barHeight + extra,
    scaleText: (size: number) => scaleFont(size, width),
  };
};

