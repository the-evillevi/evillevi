import { describe, expect, it } from "vitest";
import { assertServerAlive, readJson, waitForFixtures } from "./chess-test-http.mjs";
import { sanitizeLog } from "./chess-test-logs.mjs";

const options = { timeoutMs: 500, intervalMs: 1, assertAlive() {} };
describe("local chess backend readiness", () => {
  it("waits through startup 404s and gateway errors for the authenticated fixture result", async () => {
    const responses = [
      new Response("Not found", { status: 404 }),
      new Response('{"message":"booting"}', { status: 503 }),
      new Response('{"passed":24}', { status: 200 }),
    ];
    await waitForFixtures(() => readJson(responses.shift(), "chess-fixtures"), options);
    expect(responses).toHaveLength(0);
  });
  it.each([
    [401, { message: "Unauthorized" }],
    [500, { failed: "movement fixture" }],
    [200, { passed: 23 }],
  ])("rejects HTTP %s without retrying invalid fixtures or authorization", async (status, data) => {
    let calls = 0;
    await expect(
      waitForFixtures(async () => {
        calls++;
        return { status, data };
      }, options),
    ).rejects.toThrow(`chess-fixtures: HTTP ${status}`);
    expect(calls).toBe(1);
  });
  it("times out unavailable fixtures with their last response", async () => {
    await expect(
      waitForFixtures(
        () => readJson(new Response("Not found", { status: 404 }), "chess-fixtures"),
        {
          ...options,
          timeoutMs: 20,
        },
      ),
    ).rejects.toThrow(/not ready after 20ms.*HTTP 404.*Not found/);
  });
  it("bounds stalled requests with an abort signal", async () => {
    await expect(
      waitForFixtures(
        (signal) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener("abort", () => reject(signal.reason), { once: true });
          }),
        { ...options, timeoutMs: 20 },
      ),
    ).rejects.toThrow(/not ready after 20ms/);
  });
  it("fails immediately when the serving process has exited", async () => {
    expect(() => assertServerAlive(2147483647)).toThrow(/server exited/);
    expect(() => assertServerAlive(process.pid)).not.toThrow();
  });
  it("reports endpoint, status and a bounded excerpt for non-JSON responses", async () => {
    await expect(
      readJson(new Response("Not found", { status: 404 }), "submit-move"),
    ).rejects.toThrow('submit-move: HTTP 404; expected JSON, received "Not found"');
    try {
      await readJson(new Response("x".repeat(1000), { status: 502 }), "submit-move");
    } catch (error) {
      expect(error.message.length).toBeLessThan(400);
    }
  });
  it("redacts backend credentials while retaining startup diagnostics", () => {
    const log = [
      "Serving functions on port 55431",
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature",
      "sb_secret_example sb_publishable_example",
      "postgresql://postgres:supersecret@127.0.0.1:55432/postgres",
      "│ Secret: arbitrary-secret │",
      "│ Access Key │ arbitrary-access-key │",
      "Authorization: Bearer any-token",
      "known-credential-value",
      "Not found",
    ].join("\n");
    const safe = sanitizeLog(log, ["known-credential-value"]);
    expect(safe).toContain("Serving functions on port 55431");
    expect(safe).toContain("Not found");
    expect(safe).not.toMatch(
      /eyJ|sb_secret_|sb_publishable_|supersecret|arbitrary-secret|any-token|arbitrary-access-key|known-credential-value/,
    );
  });
});
