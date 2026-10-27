export const AUTH_ENABLED = import.meta.env.VITE_AUTH_ENABLED === "true";

export const FEATURE_FLAGS = {
  auth: AUTH_ENABLED,
} as const;
