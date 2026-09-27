import { expect, it } from "vitest";
import {
  DAYS,
  RAPID,
  clockText,
  guestName,
  rapid,
  remaining,
  synchronizedNow,
  timeControl,
  timeLabel,
} from "./timing.ts";
it("validates every preset and custom boundary", () => {
  for (const [m, i] of [...RAPID, [1, 0], [120, 60]])
    expect(timeControl(rapid(m, i))).toEqual(rapid(m, i));
  for (const days of DAYS)
    expect(timeControl({ version: "clock-v1", mode: "correspondence", days })).toEqual({
      version: "clock-v1",
      mode: "correspondence",
      days,
    });
  for (const value of [
    rapid(0),
    rapid(121),
    rapid(1, -1),
    rapid(1, 61),
    rapid(1.5),
    { version: "clock-v1", mode: "correspondence", days: 4 },
    { version: "clock-v2", mode: "untimed" },
    { ...rapid(30), clientTime: 0 },
    null,
  ])
    expect(() => timeControl(value)).toThrow();
  expect(timeControl({ version: "clock-v1", mode: "untimed" })).toEqual({
    version: "clock-v1",
    mode: "untimed",
  });
  expect(timeLabel(rapid(30))).toBe("30 min");
  expect(timeLabel(rapid(10, 5))).toBe("10+5");
});
it("trims plain-text Unicode names and rejects invalid names", () => {
  expect(guestName("  Ada <3  ")).toBe("Ada <3");
  expect(guestName("♞".repeat(32))).toHaveLength(32);
  expect(guestName("😀".repeat(32))).toBe("😀".repeat(32));
  for (const n of [null, 1, " ", "a".repeat(33), "a\nb", "a\0b"])
    expect(() => guestName(n)).toThrow();
});
it("counts down against monotonic server synchronization despite local wall-clock skew", () => {
  const server = "2026-09-25T00:00:00Z",
    at = 100;
  const now = synchronizedNow(server, at, 1100);
  expect(now).toBe(Date.parse(server) + 1000);
  const game = {
    time_control: rapid(10, 5),
    white_ms: 600000,
    black_ms: 600000,
    deadline: new Date(Date.parse(server) + 5000).toISOString(),
    started_at: server,
    turn: "white" as const,
    status: "active",
  };
  expect(remaining(game, "white", now)).toBe(4000);
  expect(remaining(game, "black", now)).toBe(600000);
  expect(remaining(game, "white", now + 9000)).toBe(0);
  expect(clockText(1)).toBe("0:01");
  expect(clockText(0)).toBe("0:00");
  expect(clockText(86400000)).toBe("1d 0h");
});
