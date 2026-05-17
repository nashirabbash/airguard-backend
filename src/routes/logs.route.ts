import Elysia from "elysia";
import { logStore } from "../models/logStore";

export const logsRoute = new Elysia({ prefix: "/api/logs" })
  .get("/:deviceId", ({ params }) => {
    const entries = logStore.get(params.deviceId);
    return {
      device_id: params.deviceId,
      count: entries.length,
      logs: entries,
    };
  })

  .get("/:deviceId/download", ({ params }) => {
    const entries = logStore.get(params.deviceId);
    const body = entries.length
      ? entries.join("\n")
      : "(no logs received yet)";

    return new Response(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="airguard-${params.deviceId}-logs.txt"`,
      },
    });
  });
