export const KARMA_STORAGE_KEY = "karma-pos-v1";
export const KARMA_RESET_EVENT = "karma:reset";

export function readKarmaState(storage) {
  try {
    const value = JSON.parse(storage.getItem(KARMA_STORAGE_KEY) || "null");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

export function writeKarmaState(storage, state) {
  try {
    storage.setItem(KARMA_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function resetKarmaState(storage, eventTarget) {
  storage.removeItem(KARMA_STORAGE_KEY);
  eventTarget?.dispatchEvent(new Event(KARMA_RESET_EVENT));
}
