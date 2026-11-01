import React from "react";
import { Platform, StyleProp, StyleSheet, View, ViewProps, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface SafeAreaBottomBarProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
  absolute?: boolean;
}

export const SafeAreaBottomBar: React.FC<SafeAreaBottomBarProps> = ({ style, absolute = false, children, ...props }) => {
  const { bottom } = useSafeAreaInsets();
  const flatStyle = StyleSheet.flatten(style) || {};
  const basePadding = typeof flatStyle.paddingBottom === "number"
    ? flatStyle.paddingBottom
    : (typeof flatStyle.paddingVertical === "number" ? flatStyle.paddingVertical : 10);
  const effectivePaddingBottom = Math.max(bottom > 0 ? bottom + (Platform.OS === "ios" ? 4 : 2) : 0, basePadding);

  return (
    <View
      {...props}
      style={[
        style,
        absolute && { position: "absolute", bottom: 0, left: 0, right: 0 },
        { paddingBottom: effectivePaddingBottom },
      ]}
    >
      {children}
    </View>
  );
};
