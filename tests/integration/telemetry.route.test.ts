import { describe, it, expect, beforeAll } from "bun:test";
import { Elysia } from "elysia";
import { telemetryRoute } from "../../src/routes/telemetry.route";
import { db } from "../../src/models/db";

const app = new Elysia().use(telemetryRoute);

describe("Telemetry Routes Integration Tests", () => {
  beforeAll(async () => {
    // Clear dependencies first
    await db.sensorReadings.deleteMany({});
    
    // Seed test data
    await db.sensorReadings.createMany({
      data: [
        {
          deviceId: "telemetry-device-1",
          timestamp: new Date("2026-05-10T12:00:00Z"),
          temperature: 25.5,
          humidity: 50.2,
          mq135Value: 100.1,
          roomStatus: "NORMAL",
        },
        {
          deviceId: "telemetry-device-1",
          timestamp: new Date("2026-05-10T12:30:00Z"),
          temperature: 30,
          humidity: 60,
          mq135Value: 200,
          roomStatus: "WARNING",
        },
      ],
    });
  });

  describe("GET /telemetry/readings", () => {
    it("should return readings for a valid date range", async () => {
      const response = await app.handle(
        new Request("http://localhost/telemetry/readings?deviceId=telemetry-device-1&start=2026-05-10T11:00:00Z&end=2026-05-10T13:00:00Z")
      );

      const resBody = await response.json();
      expect(response.status).toBe(200);
      expect(resBody.success).toBe(true);
      expect(resBody.data.data.length).toBe(2);
      expect(resBody.data.data[0].temperature).toBe(25.5);
    });

    it("should return empty results if no readings match", async () => {
      const response = await app.handle(
        new Request("http://localhost/telemetry/readings?deviceId=telemetry-device-1&start=2025-05-10T11:00:00Z&end=2025-05-10T13:00:00Z")
      );

      const resBody = await response.json();
      expect(response.status).toBe(200);
      expect(resBody.success).toBe(true);
      expect(resBody.data.data.length).toBe(0);
    });

    it("should return 400 for invalid params (missing deviceId)", async () => {
      const response = await app.handle(
        new Request("http://localhost/telemetry/readings?start=2026-05-10T11:00:00Z&end=2026-05-10T13:00:00Z")
      );

      const resBody = await response.json();
      expect(response.status).toBe(400);
      expect(resBody.success).toBe(false);
      expect(resBody.message).toBe("deviceId is required");
    });

    it("should return 400 when start >= end", async () => {
      const response = await app.handle(
        new Request("http://localhost/telemetry/readings?deviceId=telemetry-device-1&start=2026-05-10T13:00:00Z&end=2026-05-10T11:00:00Z")
      );

      const resBody = await response.json();
      expect(response.status).toBe(400);
      expect(resBody.message).toBe("Start date must be before end date");
    });
  });

  describe("GET /telemetry/readings/export", () => {
    it("should export CSV format for valid range", async () => {
      const response = await app.handle(
        new Request("http://localhost/telemetry/readings/export?deviceId=telemetry-device-1&start=2026-05-10T11:00:00Z&end=2026-05-10T13:00:00Z")
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")?.includes("text/csv")).toBe(true); 

      const text = await response.text();
      const lines = text.split("\n");
      expect(lines[0]).toBe("timestamp,temperature,humidity,mq135_value,room_status");
      expect(lines[1]).toContain("2026-05-10T12:00:00.000Z,25.50,50.20,100.10,NORMAL");
      expect(lines[2]).toContain("2026-05-10T12:30:00.000Z,30.00,60.00,200.00,WARNING");
    });

    it("should export only CSV header if no data matches", async () => {
      const response = await app.handle(
        new Request("http://localhost/telemetry/readings/export?deviceId=telemetry-device-1&start=2025-05-10T11:00:00Z&end=2025-05-10T13:00:00Z")
      );

      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).toBe("timestamp,temperature,humidity,mq135_value,room_status\n");
    });

    it("should return 400 for invalid date", async () => {
      const response = await app.handle(
        new Request("http://localhost/telemetry/readings/export?deviceId=telemetry-device-1&start=invalid-date&end=2026-05-10T13:00:00Z")
      );

      const resBody = await response.json();
      expect(response.status).toBe(400);
      expect(resBody.message).toBe("Invalid date range");
    });
  });
});
