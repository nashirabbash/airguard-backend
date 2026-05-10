import Elysia from "elysia";
import { TelemetryService } from "../services/telemetry.service";
import { createMessageRoute } from "../models/messageRoute";
import { parse } from "zod";

const telemetryService = new TelemetryService();

type ReadingsQueryResult =
  | { error: string }
  | { deviceId: string; start: Date; end: Date };

// This function validates and parses the query parameters for the telemetry readings endpoint. It checks for the presence of the deviceId, validates the date formats, and ensures that the start date is before the end date. If any validation fails, it returns an error message; otherwise, it returns the parsed parameters.
function parseReadingsQuery(
  query: Record<string, string | undefined>,
): ReadingsQueryResult {
  const deviceId = query.deviceId;
  const start = new Date(query.start ?? "");
  const end = new Date(query.end ?? "");

  if (!deviceId) {
    return { error: "deviceId is required" };
  }

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { error: "Invalid date range" };
  }

  if (start >= end) {
    return { error: "Start date must be before end date" };
  }

  return { deviceId, start, end };
}

// This function is a simple wrapper around the telemetry service to fetch readings based on the provided parameters.
function fetchTelemetryReadings(deviceId: string, start: Date, end: Date) {
  return telemetryService.getReadings(deviceId, start, end);
}

// This function handles the export of telemetry readings to CSV format. It first checks if there was an error in parsing the query parameters. If there was an error, it throws an exception. Otherwise, it calls the telemetry service's exportToCSV method with the parsed parameters to generate the CSV data.
function exportToCSV(parsed: ReadingsQueryResult) {
  if ("error" in parsed) {
    throw new Error(parsed.error);
  }
  return telemetryService.exportToCSV(
    parsed.deviceId,
    parsed.start,
    parsed.end,
  );
}

export const telemetryRoute = new Elysia().group("/telemetry", (app) =>
  app
    .get("/current", "Hello Telemetry")

    // /api/telemetry/readings?deviceId=123&start=2024-01-01T00:00:00Z&end=2024-01-01T01:00:00Z
    .get("/readings", async ({ query, set }) => {
      const parsed = parseReadingsQuery(query);

      if ("error" in parsed) {
        set.status = 400;
        return createMessageRoute(false, 400, parsed.error);
      }

      const readings = await fetchTelemetryReadings(
        parsed.deviceId,
        parsed.start,
        parsed.end,
      );

      const data = {
        start: parsed.start.toISOString(),
        end: parsed.end.toISOString(),
        data: readings,
      };
      return createMessageRoute(
        true,
        200,
        "Telemetry readings fetched successfully",
        data,
      );
    })

    // /api/telemetry/readings/export?deviceId=123&start=2024-01-01T00:00:00Z&end=2024-01-01T01:00:00Z
    .get("/readings/export", async ({ query, set }) => {
      const parsed = parseReadingsQuery(query);

      if ("error" in parsed) {
        set.status = 400;
        return createMessageRoute(false, 400, parsed.error);
      }

      const csv = await exportToCSV(parsed);
      const date = new Date().toISOString().slice(0, 10);

      set.headers["Content-Type"] = "text/csv";
      set.headers["Content-Disposition"] =
        `attachment; filename="telemetry-${parsed.deviceId}-${date}.csv"`;

      return csv;
    }),
);
