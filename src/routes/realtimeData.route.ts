import Elysia from "elysia";
import { RealtimeDataService } from "../services/realtimeData.service";
import { logStore } from "../models/logStore";
import { logger } from "../plugins/logger";

const realtimeDataService = new RealtimeDataService();
const dashboardSockets = new Set<any>();
const wsLogger = logger.child({ context: "websocket" });

export const realtimeDataRoute = new Elysia({ prefix: "/ws" })
  .ws("/dashboard", {
    async open(ws) {
      dashboardSockets.add(ws);

      wsLogger.info({
        event: "ws:open",
        path: "/ws/dashboard",
        socketId: ws.id,
        connectedClients: dashboardSockets.size,
      });

      try {
        const snapshot = await realtimeDataService.getDashboardSnapshot();
        ws.send(JSON.stringify(snapshot));

        wsLogger.debug({
          event: "ws:snapshot:sent",
          socketId: ws.id,
          hasData: snapshot.current !== null,
        });
      } catch (err) {
        wsLogger.error({
          event: "ws:snapshot:error",
          socketId: ws.id,
          err:
            err instanceof Error
              ? { message: err.message, stack: err.stack, name: err.name }
              : { message: String(err) },
        });
      }
    },

    close(ws) {
      dashboardSockets.delete(ws);

      wsLogger.info({
        event: "ws:close",
        path: "/ws/dashboard",
        socketId: ws.id,
        connectedClients: dashboardSockets.size,
      });
    },
  })

  .ws("/ingest", {
    async message(ws, rawMessage) {
      try {
        const message =
          typeof rawMessage === "string" ? JSON.parse(rawMessage) : rawMessage;

        if (message.type === "log_dump") {
          const entries: string[] =
            typeof message.logs === "string"
              ? message.logs.split("\n").filter(Boolean)
              : [];
          logStore.set(message.device_id, entries);

          wsLogger.info({
            event: "ws:log_dump",
            socketId: ws.id,
            deviceId: message.device_id,
            entryCount: entries.length,
          });

          ws.send(
            JSON.stringify({
              type: "log_dump_ack",
              ok: true,
              count: entries.length,
            }),
          );
          return;
        }

        wsLogger.debug({
          event: "ws:ingest:received",
          socketId: ws.id,
          deviceId: message.device_id,
          messageType: message.type,
          timestamp: message.timestamp,
        });

        const result = await realtimeDataService.ingestSensorReading(message);

        wsLogger.info({
          event: "ws:ingest:processed",
          socketId: ws.id,
          deviceId: message.device_id,
          roomStatus: result.broadcast.data.room_status,
          temperature: result.broadcast.data.temperature,
          humidity: result.broadcast.data.humidity,
          mq135Value: result.broadcast.data.mq135_value,
          readingId: result.broadcast.data.id,
          broadcastTargets: dashboardSockets.size,
        });

        ws.send(JSON.stringify(result.ack));

        for (const dashboard of dashboardSockets) {
          dashboard.send(JSON.stringify(result.broadcast));
        }

        if ((result as any).statusChangedBroadcast) {
          wsLogger.warn({
            event: "ws:status:changed",
            socketId: ws.id,
            deviceId: message.device_id,
            roomStatus: result.broadcast.data.room_status,
          });

          for (const dashboard of dashboardSockets) {
            dashboard.send(
              JSON.stringify((result as any).statusChangedBroadcast),
            );
          }
        }
      } catch (err) {
        wsLogger.error({
          event: "ws:ingest:error",
          socketId: ws.id,
          err:
            err instanceof Error
              ? { message: err.message, stack: err.stack, name: err.name }
              : { message: String(err) },
        });

        ws.send(
          JSON.stringify({
            type: "error",
            error: {
              code: "INVALID_MESSAGE",
              message:
                err instanceof Error ? err.message : "Invalid message",
              details: {},
            },
          }),
        );
      }
    },
  });

export default realtimeDataRoute;
