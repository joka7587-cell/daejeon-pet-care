import { Platform } from "react-native";

/**
 * Pretendard font family mapping for React Native StyleSheet.
 * Use these constants in `fontFamily` style props.
 * 
 * On web, we fall back to CSS font-family which is set in global.css.
 * On native, we use the loaded OTF font names.
 */
export const Fonts = {
  light: Platform.select({ web: "Pretendard-Light, system-ui, sans-serif", default: "Pretendard-Light" }) as string,
  regular: Platform.select({ web: "Pretendard-Regular, system-ui, sans-serif", default: "Pretendard-Regular" }) as string,
  medium: Platform.select({ web: "Pretendard-Medium, system-ui, sans-serif", default: "Pretendard-Medium" }) as string,
  semiBold: Platform.select({ web: "Pretendard-SemiBold, system-ui, sans-serif", default: "Pretendard-SemiBold" }) as string,
  bold: Platform.select({ web: "Pretendard-Bold, system-ui, sans-serif", default: "Pretendard-Bold" }) as string,
  extraBold: Platform.select({ web: "Pretendard-ExtraBold, system-ui, sans-serif", default: "Pretendard-ExtraBold" }) as string,
};

/**
 * Typography presets using Pretendard.
 * Import and spread into StyleSheet styles.
 */
export const Typography = {
  h1: {
    fontFamily: Fonts.extraBold,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  h3: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  bodyMedium: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  caption: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  captionMedium: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  label: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.1,
  },
  button: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  buttonSmall: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    lineHeight: 18,
  },
  tabLabel: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    lineHeight: 14,
  },
} as const;
