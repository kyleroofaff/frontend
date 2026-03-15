export const DEFAULT_TIME_FORMAT = "12h";

export function normalizeTimeFormat(value) {
  return value === "24h" ? "24h" : DEFAULT_TIME_FORMAT;
}

export function getStoredTimeFormat() {
  if (typeof window === "undefined") return DEFAULT_TIME_FORMAT;
  try {
    return normalizeTimeFormat(window.localStorage.getItem("tlm-time-format"));
  } catch {
    return DEFAULT_TIME_FORMAT;
  }
}

export function setStoredTimeFormat(value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("tlm-time-format", normalizeTimeFormat(value));
  } catch {
    // ignore localStorage write failures
  }
}

export function formatDateTimeNoSeconds(value, timeFormat = getStoredTimeFormat()) {
  return new Date(value || Date.now()).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: normalizeTimeFormat(timeFormat) !== "24h",
  });
}

export function formatTimeNoSeconds(value, timeFormat = getStoredTimeFormat()) {
  return new Date(value || Date.now()).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: normalizeTimeFormat(timeFormat) !== "24h",
  });
}
