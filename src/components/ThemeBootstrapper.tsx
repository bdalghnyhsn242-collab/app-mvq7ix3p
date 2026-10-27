import { useEffect } from "react";
import { useTheme } from "next-themes";
import { applyAppThemePreference } from "@/lib/appTheme";

export function ThemeBootstrapper() {
  const { resolvedTheme, theme } = useTheme();

  useEffect(() => {
    applyAppThemePreference(theme === "system" ? resolvedTheme : theme);
  }, [resolvedTheme, theme]);

  return null;
}
