import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "trace",
  base: {
    pid: process.pid,
    service: "airguard-backend",
    env: process.env.NODE_ENV ?? "development",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    err: pino.stdSerializers.err,
  },
  formatters: {
    level(label) {
      return { level: label };
    },
  },
});
