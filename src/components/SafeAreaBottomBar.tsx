import React from "react";
import { StyleProp, View, ViewProps, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface SafeAreaBottomBarProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
  absolute?: boolean;
}

export const SafeAreaBottomBar: React.FC<SafeAreaBottomBarProps> = ({ style, absolute = false, children, ...props }) => {
  const { bottom } = useSafeAreaInsets();

  return <View {...props} style={[style, absolute && { bottom }]}>{children}</View>;
};
