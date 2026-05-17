import Elysia from "elysia";
import { RealtimeDataService } from "../services/realtimeData.service";
import { logStore } from "../models/logStore";

const realtimeDataService = new RealtimeDataService();

const dashboardSockets = new Set<any>();

export const realtimeDataRoute = new Elysia({ prefix: "/ws" })
  .ws("/dashboard", {
    async open(ws) {
      dashboardSockets.add(ws);

      const snapshot = await realtimeDataService.getDashboardSnapshot();
      ws.send(JSON.stringify(snapshot));
    },

    close(ws) {
      dashboardSockets.delete(ws);
    },
  })

  .ws("/ingest", {
    async message(ws, rawMessage) {
      try {
        const message =
          typeof rawMessage === "string" ? JSON.parse(rawMessage) : rawMessage;

        if (message.type === "log_dump") {
          const entries: string[] = typeof message.logs === "string"
            ? message.logs.split("\n").filter(Boolean)
            : [];
          logStore.set(message.device_id, entries);
          ws.send(JSON.stringify({ type: "log_dump_ack", ok: true, count: entries.length }));
          return;
        }

        const result = await realtimeDataService.ingestSensorReading(message);

        ws.send(JSON.stringify(result.ack));

        for (const dashboard of dashboardSockets) {
          dashboard.send(JSON.stringify(result.broadcast));
        }

        if ((result as any).statusChangedBroadcast) {
          for (const dashboard of dashboardSockets) {
            dashboard.send(
              JSON.stringify((result as any).statusChangedBroadcast),
            );
          }
        }
      } catch (error) {
        ws.send(
          JSON.stringify({
            type: "error",
            error: {
              code: "INVALID_MESSAGE",
              message:
                error instanceof Error ? error.message : "Invalid message",
              details: {},
            },
          }),
        );
      }
    },
  });

export default realtimeDataRoute;
