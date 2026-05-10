import { Elysia } from "elysia";
import authRoute from "./routes/auth.route";
import deviceRoute from "./routes/device.route";
import { telemetryRoute } from "./routes/telemetry.route";

const app = new Elysia()
  .group("/api", (app) =>
    app.use(authRoute).use(deviceRoute).use(telemetryRoute),
  )
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
