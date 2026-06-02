import { describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { createMessageRoute } from "../../src/models/messageRoute";

const app = new Elysia().group("/api", (root) =>
  root.get("/health", () =>
    createMessageRoute(true, 200, "AirGuard API is healthy", {
      uptime: 1,
      timestamp: new Date().toISOString(),
    }),
  ),
);

describe("Performance: health endpoint", () => {
  it("handles 200 requests with stable average latency", async () => {
    const iterations = 200;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      const response = await app.handle(
        new Request("http://localhost/api/health", { method: "GET" }),
      );
      expect(response.status).toBe(200);
    }

    const elapsedMs = performance.now() - start;
    const averageMs = elapsedMs / iterations;

    // Keep threshold loose to avoid noisy CI and machine variance.
    expect(averageMs).toBeLessThan(25);
  });
});
