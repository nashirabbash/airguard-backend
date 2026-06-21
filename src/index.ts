import { Elysia } from "elysia";
import authRoute from "./routes/auth.route";
import deviceRoute from "./routes/device.route";
import { telemetryRoute } from "./routes/telemetry.route";
import { realtimeDataRoute } from "./routes/realtimeData.route";
import { logsRoute } from "./routes/logs.route";
import swagger from "@elysiajs/swagger";
import openapi from "@elysia/openapi";
import { createMessageRoute } from "./models/messageRoute";
import { safeLogger } from "./plugins/safeLogger";
import { logger } from "./plugins/logger";

// Function to get process uptime with error handling
function getProcessUptime() {
  const uptime = process.uptime();

  if (!Number.isFinite(uptime)) {
    throw new Error("Unable to read process uptime");
  }

  return uptime;
}

const app = new Elysia()
  .use(openapi())
  .use(swagger())
  .use(safeLogger())
  .use(realtimeDataRoute)
  .use(logsRoute)
  .group("/api", (app) =>
    app
      .get("/health", ({ set }) => {
        try {
          const uptime = getProcessUptime();

          return createMessageRoute(true, 200, "AirGuard API is healthy", {
            uptime,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          set.status = 503;

          return createMessageRoute(
            false,
            503,
            "AirGuard API health check fallback response",
            {
              error: error instanceof Error ? error.message : "Unknown error",
              timestamp: new Date().toISOString(),
            },
          );
        }
      })
      .use(authRoute)
      .use(deviceRoute)
      .use(telemetryRoute),
  )
  .listen(3000);

logger.info({
  event: "server:start",
  hostname: app.server?.hostname,
  port: app.server?.port,
  logLevel: process.env.LOG_LEVEL ?? "trace",
  nodeEnv: process.env.NODE_ENV ?? "development",
});
