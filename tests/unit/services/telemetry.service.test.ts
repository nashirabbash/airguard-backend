import { describe, it, expect, mock, beforeEach } from "bun:test";

const fakeReadings = [
  {
    id: 1,
    deviceId: "device-1",
    timestamp: new Date("2026-05-10T12:00:00Z"),
    temperature: 25.5,
    humidity: 50.2,
    mq135Value: 100.1,
    roomStatus: "normal",
  },
  {
    id: 2,
    deviceId: "device-1",
    timestamp: new Date("2026-05-10T12:30:00Z"),
    temperature: 30,
    humidity: 60,
    mq135Value: 200,
    roomStatus: "warning",
  },
];

let mockState = {
  findManyReturn: fakeReadings as any,
};

mock.module("../../../src/models/db", () => ({
  db: {
    sensorReadings: {
      findMany: mock(async () => mockState.findManyReturn),
    },
  },
}));

const { TelemetryService } = await import("../../../src/services/telemetry.service");

describe("TelemetryService", () => {
  let service: InstanceType<typeof TelemetryService>;

  beforeEach(() => {
    service = new TelemetryService();
    mockState.findManyReturn = fakeReadings;
  });

  describe("getReadings", () => {
    it("should return readings within date range", async () => {
      const start = new Date("2026-05-10T10:00:00Z");
      const end = new Date("2026-05-10T14:00:00Z");
      
      const result = await service.getReadings("device-1", start, end);
      
      expect(result.length).toBe(2);
      expect(result[0].temperature).toBe(25.5);
    });

    it("should return empty array if no readings match", async () => {
      mockState.findManyReturn = [];
      const start = new Date("2026-05-10T10:00:00Z");
      const end = new Date("2026-05-10T14:00:00Z");
      
      const result = await service.getReadings("device-1", start, end);
      
      expect(result.length).toBe(0);
      expect(result).toEqual([]);
    });
  });

  describe("exportToCSV", () => {
    it("should generate valid CSV with correct headers and formatting", async () => {
      const start = new Date("2026-05-10T10:00:00Z");
      const end = new Date("2026-05-10T14:00:00Z");
      
      const csv = await service.exportToCSV("device-1", start, end);
      
      const lines = csv.split("\n");
      
      // Check header
      expect(lines[0]).toBe("timestamp,temperature,humidity,mq135_value,room_status");
      
      // Check first row (ensure 2-decimal format, ISO timestamp, lowercase room status)
      const row1 = lines[1];
      expect(row1).toBe("2026-05-10T12:00:00.000Z,25.50,50.20,100.10,normal");

      // Check second row (integers converted to 2-decimal floats)
      const row2 = lines[2];
      expect(row2).toBe("2026-05-10T12:30:00.000Z,30.00,60.00,200.00,warning");
    });

    it("should return only header if no readings match", async () => {
      mockState.findManyReturn = [];
      const start = new Date("2026-05-10T10:00:00Z");
      const end = new Date("2026-05-10T14:00:00Z");
      
      const csv = await service.exportToCSV("device-1", start, end);
      
      expect(csv).toBe("timestamp,temperature,humidity,mq135_value,room_status\n");
    });
  });

  describe("helpers", () => {
    it("should cover helper functions", () => {
      expect(service.getDeviceFilter("1")).toEqual({ deviceId: "1" });
      const d = new Date();
      expect(service.getDateFilter(d, d)).toEqual({ start: d, end: d });
      expect(service.isValidDate(d)).toBe(true);
      expect(service.formatDate(d)).toBe(d.toISOString());
    });
  });
});
