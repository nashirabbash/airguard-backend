import { describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import authRoute from "../../src/routes/auth.route";
import deviceRoute from "../../src/routes/device.route";
import { telemetryRoute } from "../../src/routes/telemetry.route";
import { createMessageRoute } from "../../src/models/messageRoute";

const app = new Elysia().group("/api", (root) =>
  root
    .get("/health", () =>
      createMessageRoute(true, 200, "AirGuard API is healthy", {
        uptime: 1,
        timestamp: new Date().toISOString(),
      }),
    )
    .use(authRoute)
    .use(deviceRoute)
    .use(telemetryRoute),
);

describe("System: API surface and contracts", () => {
  it("returns expected health contract", async () => {
    const response = await app.handle(
      new Request("http://localhost/api/health", { method: "GET" }),
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe("AirGuard API is healthy");
    expect(typeof body.data.timestamp).toBe("string");
  });

  it("keeps validation contract for malformed signup payload", async () => {
    const response = await app.handle(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "missing-password" }),
      }),
    );
    expect([400, 422]).toContain(response.status);
  });
});
