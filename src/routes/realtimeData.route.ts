import Elysia from "elysia";
import { RealtimeDataService } from "../services/realtimeData.service";

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
