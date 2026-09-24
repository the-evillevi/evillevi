import { describe, expect, it, vi } from "vitest";

import {
  KARMA_RESET_EVENT,
  KARMA_STORAGE_KEY,
  readKarmaState,
  resetKarmaState,
  writeKarmaState,
} from "./persistence.js";

function storageWith(value) {
  return {
    getItem: vi.fn(() => value),
    removeItem: vi.fn(),
    setItem: vi.fn(),
  };
}

describe("Karma persistence", () => {
  it("returns an empty object for missing, malformed, or non-object data", () => {
    expect(readKarmaState(storageWith(null))).toEqual({});
    expect(readKarmaState(storageWith("{"))).toEqual({});
    expect(readKarmaState(storageWith("[]"))).toEqual({});
  });

  it("returns a valid saved document", () => {
    const state = { session: "u3", folioSeq: 1054 };
    expect(readKarmaState(storageWith(JSON.stringify(state)))).toEqual(state);
  });

  it("serializes a saved document", () => {
    const storage = storageWith(null);
    expect(writeKarmaState(storage, { session: "u3" })).toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith(KARMA_STORAGE_KEY, '{"session":"u3"}');
  });

  it("removes saved state and announces an in-page reset", () => {
    const storage = storageWith(null);
    const eventTarget = { dispatchEvent: vi.fn() };
    resetKarmaState(storage, eventTarget);

    expect(storage.removeItem).toHaveBeenCalledWith(KARMA_STORAGE_KEY);
    expect(eventTarget.dispatchEvent).toHaveBeenCalledOnce();
    expect(eventTarget.dispatchEvent.mock.calls[0][0].type).toBe(KARMA_RESET_EVENT);
  });
});
