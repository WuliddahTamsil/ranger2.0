import { Platform } from "react-native";
import { NativeMapComponent as NativeMap } from "./NativeMapComponent.native";
import { NativeMapComponent as WebMap } from "./NativeMapComponent.web";

export * from "./NativeMapComponent.native";

export const NativeMapComponent: typeof NativeMap =
  Platform.OS === "web" ? (WebMap as any) : NativeMap;
