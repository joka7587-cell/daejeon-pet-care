import { useMemo } from "react";
import { useColors } from "./use-colors";

/**
 * Returns a set of commonly used dynamic colors that respond to dark/light mode.
 * Use this in components that have hardcoded colors to make them dark-mode aware.
 */
export function useThemeColors() {
  const colors = useColors();

  return useMemo(
    () => ({
      // Text colors
      text: colors.foreground,
      textSecondary: colors.muted,
      textPrimary: colors.primary,

      // Background colors
      bg: colors.background,
      bgSurface: colors.surface,
      bgCard: colors.surface,

      // Border
      border: colors.border,
      borderLight: colors.border,

      // Accent
      primary: colors.primary,
      success: colors.success,
      warning: colors.warning,
      error: colors.error,

      // Specific UI patterns
      headerBg: colors.background,
      cardBg: colors.surface,
      inputBg: colors.surface,
      inputBorder: colors.border,
      divider: colors.border,
      badgeBg: colors.surface,
      overlay: "rgba(0,0,0,0.5)",
    }),
    [colors]
  );
}
