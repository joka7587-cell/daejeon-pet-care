// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  // Navigation
  "house.fill": "home",
  "magnifyingglass": "search",
  "bell.fill": "notifications",
  "person.fill": "person",
  // Actions
  "paperplane.fill": "send",
  "plus": "add",
  "plus.circle.fill": "add-circle",
  "checkmark.circle.fill": "check-circle",
  "xmark.circle.fill": "cancel",
  "heart.fill": "favorite",
  "heart": "favorite-border",
  "star.fill": "star",
  "star": "star-border",
  // Navigation arrows
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "chevron.left.forwardslash.chevron.right": "code",
  // Map/Location
  "location.fill": "location-on",
  "map.fill": "map",
  // Communication
  "message.fill": "chat",
  "bubble.left.fill": "chat-bubble",
  "text.bubble.fill": "forum",
  "phone.fill": "phone",
  // Pet/Care
  "pawprint.fill": "pets",
  "figure.walk": "directions-walk",
  "house.and.flag.fill": "home-work",
  // Status
  "clock.fill": "access-time",
  "exclamationmark.triangle.fill": "warning",
  "checkmark": "check",
  "xmark": "close",
  // Settings
  "gearshape.fill": "settings",
  "arrow.right.square.fill": "logout",
  // Toggle
  "toggle.on": "toggle-on",
  "toggle.off": "toggle-off",
} as unknown as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
