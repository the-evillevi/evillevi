import { expect, it } from "vitest";
import { resolveColor, isGameId } from "./protocol.ts";
it("resolves explicit choices and gives each random side exactly half the byte space", () => {
  expect(resolveColor("white", 255)).toBe("white");
  expect(resolveColor("black", 0)).toBe("black");
  const results = Array.from({ length: 256 }, (_, i) => resolveColor("random", i));
  expect(results.filter((c) => c === "white")).toHaveLength(128);
  expect(results.filter((c) => c === "black")).toHaveLength(128);
});
it("rejects invalid creation identifiers", () => {
  expect(isGameId("not-an-id")).toBe(false);
  expect(isGameId(crypto.randomUUID())).toBe(true);
});
