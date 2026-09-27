import { setTimeout as delay } from "node:timers/promises";

export class HttpResponseError extends Error {
  constructor(endpoint, status, body) {
    super(
      `${endpoint}: HTTP ${status}; expected JSON, received ${JSON.stringify(body.slice(0, 300))}`,
    );
    this.status = status;
  }
}

export async function readJson(response, endpoint) {
  const body = await response.text();
  try {
    return { status: response.status, data: JSON.parse(body) };
  } catch {
    throw new HttpResponseError(endpoint, response.status, body);
  }
}

export function assertServerAlive(pid) {
  if (!pid) return; // Local developers may run the server in another terminal.
  try {
    process.kill(Number(pid), 0);
  } catch {
    throw new Error("Supabase functions server exited before readiness; inspect the backend logs.");
  }
}

// A gateway 401 does not prove that the function or its test environment is ready.
export async function waitForFixtures(
  call,
  {
    timeoutMs = 60_000,
    intervalMs = 2_000,
    assertAlive = () => assertServerAlive(process.env.CHESS_FUNCTIONS_PID),
  } = {},
) {
  const deadline = performance.now() + timeoutMs;
  let last = "no response";
  const retryable = (status) => [404, 502, 503, 504].includes(status);
  while (performance.now() < deadline) {
    assertAlive();
    let result;
    try {
      result = await call(
        AbortSignal.timeout(Math.max(1, Math.ceil(Math.min(5_000, deadline - performance.now())))),
      );
    } catch (error) {
      if (
        !(error instanceof HttpResponseError && retryable(error.status)) &&
        !(error instanceof TypeError) &&
        error.name !== "TimeoutError"
      )
        throw error;
      last = error.message;
    }
    if (result) {
      if (result.status === 200 && result.data?.passed === 24) return;
      last = `chess-fixtures: HTTP ${result.status}; ${JSON.stringify(result.data).slice(0, 300)}`;
      // Fixture failures and auth/configuration errors must not be hidden by retries.
      if (!retryable(result.status)) throw new Error(last);
    }
    const remaining = deadline - performance.now();
    if (remaining > 0) await delay(Math.min(intervalMs, remaining));
  }
  throw new Error(`chess-fixtures not ready after ${timeoutMs}ms. Last response: ${last}`);
}
