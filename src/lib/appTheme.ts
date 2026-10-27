export type AppThemePreference = "system" | "light" | "dark";

export function getSystemColorScheme() {
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }

  return "light";
}

export function applyAppThemePreference(theme: string | null | undefined) {
  if (typeof document === "undefined") return;

  const normalizedTheme = (theme || "system") as AppThemePreference;
  const root = document.documentElement;

  root.classList.remove("dark");

  if (normalizedTheme === "dark") {
    root.classList.add("dark");
    return;
  }

  if (normalizedTheme === "system" && getSystemColorScheme() === "dark") {
    root.classList.add("dark");
  }
}
