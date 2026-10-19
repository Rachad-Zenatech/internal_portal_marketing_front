// Universal environment variable reader for Vite (web) and Metro (React Native).

// `process` is provided by Metro on native; it is not typed under vite/client.
declare const process: { env: Record<string, string | undefined> };

export function getEnv(key: string, defaultValue = ""): string {
  try {
    // 1. Vite inlines import.meta.env on web.
    const viteEnv = (import.meta as { env?: Record<string, unknown> }).env;
    if (viteEnv && key in viteEnv) {
      const val = viteEnv[key];
      if (val !== undefined && val !== null) return String(val);
    }
  } catch {
    // import.meta is unavailable in some non-module environments.
  }

  try {
    // 2. Node / Metro process.env
    if (typeof process !== "undefined" && process.env && key in process.env) {
      const val = process.env[key];
      if (val !== undefined && val !== null) return String(val);
    }
  } catch {
    // Ignore
  }

  return defaultValue;
}

// Expo/Metro replaces `process.env.EXPO_PUBLIC_*` at build time, but ONLY for a
// literal member expression. The dynamic `process.env[key]` lookup in getEnv() is
// never substituted, so native builds must read this statically or they fall back
// to localhost — which on a real device means the phone itself, not the dev machine.
function getNativeApiBaseUrl(): string {
  try {
    const val = process.env.EXPO_PUBLIC_API_BASE_URL;
    return val ? String(val) : "";
  } catch {
    return "";
  }
}

export function getApiBaseUrl(): string {
  const envUrl = getNativeApiBaseUrl() || getEnv("VITE_API_BASE_URL", "");
  if (envUrl) {
    return envUrl.endsWith("/") ? envUrl.slice(0, -1) : envUrl;
  }
  // In production browser environments, use window.location.origin
  if (
    typeof window !== "undefined" &&
    window.location &&
    window.location.origin &&
    !window.location.hostname.includes("localhost") &&
    !window.location.hostname.includes("127.0.0.1")
  ) {
    return window.location.origin;
  }
  return "http://localhost:8010";
}
