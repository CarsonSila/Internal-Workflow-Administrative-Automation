import { useState, useEffect } from "react";

const KEY = "plp_settings";
export const SETTINGS_EVENT = "plp:settings-changed";

export interface AppSettings {
  autoMergeAbove: number;
  reviewAbove: number;
  separateBelow: number;
  fontScale: number;   // 0.85 – 1.2
  fontWeight: number;  // 400 / 600 / 800
}

const DEFAULTS: AppSettings = { autoMergeAbove: 98, reviewAbove: 75, separateBelow: 50, fontScale: 1, fontWeight: 500 };

export function getSettings(): AppSettings {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; }
  catch { return DEFAULTS; }
}

export function setSettings(patch: Partial<AppSettings>) {
  const next = { ...getSettings(), ...patch };
  localStorage.setItem(KEY, JSON.stringify(next));
  document.documentElement.style.setProperty("--font-scale", String(next.fontScale));
  document.documentElement.style.setProperty("--font-weight-base", String(next.fontWeight));
  window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: next }));
}

export function useSettings(): AppSettings {
  const [s, setS] = useState(getSettings());
  useEffect(() => {
    const handler = (e: Event) => setS((e as CustomEvent<AppSettings>).detail);
    window.addEventListener(SETTINGS_EVENT, handler);
    return () => window.removeEventListener(SETTINGS_EVENT, handler);
  }, []);
  return s;
}
