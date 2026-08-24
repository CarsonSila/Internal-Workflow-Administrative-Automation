const STORAGE_KEY = "plp_tours_enabled";
export const TOURS_ENABLED_EVENT = "plp:tours-enabled-changed";
export const RESTART_TOUR_EVENT = "plp:restart-tour";

export function toursEnabled(): boolean {
  const v = localStorage.getItem(STORAGE_KEY);
  return v === null ? true : v === "1";
}

export function setToursEnabled(enabled: boolean) {
  localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  window.dispatchEvent(new CustomEvent(TOURS_ENABLED_EVENT, { detail: enabled }));
}

export function restartCurrentTour() {
  window.dispatchEvent(new CustomEvent(RESTART_TOUR_EVENT));
}
