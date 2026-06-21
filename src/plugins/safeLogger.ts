import { Elysia } from "elysia";
import { logger } from "./logger";

type HeaderMap = Record<string, string | undefined>;

const defaultIpHeaders = ["x-forwarded-for", "x-real-ip", "x-client-ip"];

function getIp(headers: HeaderMap, ipHeaders = defaultIpHeaders) {
  for (const header of ipHeaders) {
    const value = headers[header.toLowerCase()];
    if (value) return value.split(",")[0].trim();
  }
  return undefined;
}

function parseRequestUrl(request: Request) {
  if (!request.url) return null;
  try {
    return new URL(request.url, "http://localhost");
  } catch {
    return null;
  }
}

const SKIP_PATHS = ["/swagger", "/swagger/json", "/api/health"];

const httpLogger = logger.child({ context: "http" });

export function safeLogger() {
  return new Elysia()
    .derive({ as: "global" }, ({ headers }) => ({
      startTime: performance.now(),
      clientIp: getIp(headers as HeaderMap),
      requestId: crypto.randomUUID(),
      errorLogged: false as boolean,
    }))

    .onAfterResponse({ as: "global" }, (ctx) => {
      if (ctx.errorLogged) return;

      const url = parseRequestUrl(ctx.request);
      if (!url || SKIP_PATHS.some((p) => url.pathname.startsWith(p))) return;

      const duration = Number(
        (performance.now() - (ctx.startTime ?? performance.now())).toFixed(2),
      );
      const statusCode =
        typeof ctx.set.status === "number" ? ctx.set.status : 200;
      const ip =
        ctx.clientIp ??
        getIp(Object.fromEntries(ctx.request.headers.entries()));

      const logMethod: "info" | "warn" =
        statusCode >= 400 ? "warn" : "info";

      httpLogger[logMethod]({
        event: "http:response",
        requestId: ctx.requestId,
        method: ctx.request.method,
        path: url.pathname,
        statusCode,
        durationMs: duration,
        ip,
        userAgent: ctx.request.headers.get("user-agent") ?? undefined,
      });
    })

    .onError(({ error, request, startTime, set, clientIp, requestId }) => {
      const url = parseRequestUrl(request);
      if (!url || SKIP_PATHS.some((p) => url.pathname.startsWith(p))) return;

      const duration = Number(
        (performance.now() - (startTime ?? performance.now())).toFixed(2),
      );
      const ip =
        clientIp ?? getIp(Object.fromEntries(request.headers.entries()));

      httpLogger.error({
        event: "http:error",
        requestId,
        method: request.method,
        path: url.pathname,
        statusCode: typeof set.status === "number" ? set.status : 500,
        durationMs: duration,
        ip,
        userAgent: request.headers.get("user-agent") ?? undefined,
        err:
          error instanceof Error
            ? { message: error.message, stack: error.stack, name: error.name }
            : { message: String(error) },
      });
    });
}
