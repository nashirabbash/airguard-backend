import { Elysia } from "elysia";
import { initializeLogger, Logger, type LoggerOptions } from "@rasla/logify";

type HeaderMap = Record<string, string | undefined>;

const defaultIpHeaders = ["x-forwarded-for", "x-real-ip", "x-client-ip"];

function getIp(headers: HeaderMap, ipHeaders = defaultIpHeaders) {
  for (const header of ipHeaders) {
    const value = headers[header.toLowerCase()];

    if (value) {
      return value.split(",")[0].trim();
    }
  }

  return "";
}

function parseRequestUrl(request: Request) {
  if (!request.url) {
    return null;
  }

  try {
    return new URL(request.url, "http://localhost");
  } catch {
    return null;
  }
}

export function safeLogger(options: LoggerOptions = {}) {
  const ipHeaders = options.ipHeaders || defaultIpHeaders;
  const httpLogger =
    options.useGlobal === true ? initializeLogger(options) : new Logger(options);

  return new Elysia()
    .derive({ as: "global" }, ({ headers }) => ({
      startTime: performance.now(),
      clientIp: getIp(headers as HeaderMap, ipHeaders),
      errorLogged: false,
    }))
    .onAfterResponse({ as: "global" }, (ctx) => {
      if (ctx.errorLogged) {
        return;
      }

      const url = parseRequestUrl(ctx.request);

      if (!url || options.skip?.includes(url.pathname)) {
        return;
      }

      const duration = Number(
        (performance.now() - (ctx.startTime || performance.now())).toFixed(2),
      );
      const statusCode = typeof ctx.set.status === "number" ? ctx.set.status : 200;
      const logMethod = statusCode >= 400 ? "warn" : "info";
      const headers = Object.fromEntries(ctx.request.headers.entries());
      const ip = ctx.clientIp || getIp(headers, ipHeaders);

      httpLogger[logMethod]({
        method: ctx.request.method,
        path: url.pathname,
        statusCode,
        duration,
        ip,
        message: `${ctx.request.method} ${url.pathname}`,
      });
    })
    .onError(({ error, request, startTime, set, clientIp, ...ctx }) => {
      ctx.errorLogged = true;

      const url = parseRequestUrl(request);

      if (!url || options.skip?.includes(url.pathname)) {
        return;
      }

      const duration =
        Number((performance.now() - (startTime || performance.now())).toFixed(2)) ||
        0.01;
      const errorMessage =
        typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : String(error);
      const headers = Object.fromEntries(request.headers.entries());
      const ip = clientIp || getIp(headers, ipHeaders);

      httpLogger.error({
        method: request.method,
        path: url.pathname,
        statusCode: typeof set.status === "number" ? set.status : 500,
        duration,
        ip,
        message: errorMessage,
      });
    });
}
