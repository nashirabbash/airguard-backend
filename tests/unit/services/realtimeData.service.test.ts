import { describe, it, expect, mock, beforeEach } from "bun:test";
import { createHash } from "node:crypto";

const fakeDevice = {
  deviceId: "device-1",
  deviceTokenHash: createHash("sha256").update("valid-token").digest("hex"),
  tempUnsafeLow: 0,
  tempUnsafeHigh: 50,
  tempWarningLow: 5,
  tempWarningHigh: 45,
  humidityUnsafeLow: 10,
  humidityUnsafeHigh: 90,
  humidityWarningLow: 20,
  humidityWarningHigh: 80,
  mq135BaselineRuntimeOnly: 300,
};

const fakeReading = {
  id: 1,
  deviceId: "device-1",
  timestamp: new Date("2026-05-10T12:00:00Z"),
  temperature: 22,
  humidity: 50,
  mq135Value: 100,
  roomStatus: "NORMAL",
};

let mockState = {
  findUniqueReturn: fakeDevice,
  findFirstReturn: fakeReading,
};

mock.module("../../../src/models/db", () => ({
  db: {
    deviceConfig: {
      findUnique: mock(({ where }) => {
        if (where.deviceId === "unknown-device") return null;
        return mockState.findUniqueReturn;
      }),
    },
    sensorReadings: {
      create: mock(() => fakeReading),
      findFirst: mock(() => mockState.findFirstReturn),
    },
  },
}));

const { RealtimeDataService } = await import("../../../src/services/realtimeData.service");

describe("RealtimeDataService", () => {
  let service: InstanceType<typeof RealtimeDataService>;

  beforeEach(() => {
    service = new RealtimeDataService();
  });

  describe("room status logic via ingestSensorReading", () => {
    it("returns NORMAL when all values within safe bounds", async () => {
      const message = {
        type: "sensor_reading" as const,
        device_id: "device-1",
        token: "valid-token",
        timestamp: "2026-05-10T12:00:00Z",
        temperature: 25,
        humidity: 50,
        mq135_value: 100,
      };
      const result = await service.ingestSensorReading(message);
      expect(result.ack.room_status).toBe("normal");
    });

    it("returns WARNING when temp >= tempWarningHigh", async () => {
      const message = {
        type: "sensor_reading" as const,
        device_id: "device-1",
        token: "valid-token",
        timestamp: "2026-05-10T12:00:00Z",
        temperature: 45,
        humidity: 50,
        mq135_value: 100,
      };
      const result = await service.ingestSensorReading(message);
      expect(result.ack.room_status).toBe("warning");
    });

    it("returns WARNING when temp <= tempWarningLow", async () => {
      const message = {
        type: "sensor_reading" as const,
        device_id: "device-1",
        token: "valid-token",
        timestamp: "2026-05-10T12:00:00Z",
        temperature: 5,
        humidity: 50,
        mq135_value: 100,
      };
      const result = await service.ingestSensorReading(message);
      expect(result.ack.room_status).toBe("warning");
    });

    it("returns WARNING when humidity >= humidityWarningHigh", async () => {
      const message = {
        type: "sensor_reading" as const,
        device_id: "device-1",
        token: "valid-token",
        timestamp: "2026-05-10T12:00:00Z",
        temperature: 25,
        humidity: 80,
        mq135_value: 100,
      };
      const result = await service.ingestSensorReading(message);
      expect(result.ack.room_status).toBe("warning");
    });

    it("returns WARNING when humidity <= humidityWarningLow", async () => {
      const message = {
        type: "sensor_reading" as const,
        device_id: "device-1",
        token: "valid-token",
        timestamp: "2026-05-10T12:00:00Z",
        temperature: 25,
        humidity: 20,
        mq135_value: 100,
      };
      const result = await service.ingestSensorReading(message);
      expect(result.ack.room_status).toBe("warning");
    });

    it("returns DANGER when temp >= tempUnsafeHigh", async () => {
      const message = {
        type: "sensor_reading" as const,
        device_id: "device-1",
        token: "valid-token",
        timestamp: "2026-05-10T12:00:00Z",
        temperature: 50,
        humidity: 50,
        mq135_value: 100,
      };
      const result = await service.ingestSensorReading(message);
      expect(result.ack.room_status).toBe("danger");
    });

    it("returns DANGER when temp <= tempUnsafeLow", async () => {
      const message = {
        type: "sensor_reading" as const,
        device_id: "device-1",
        token: "valid-token",
        timestamp: "2026-05-10T12:00:00Z",
        temperature: 0,
        humidity: 50,
        mq135_value: 100,
      };
      const result = await service.ingestSensorReading(message);
      expect(result.ack.room_status).toBe("danger");
    });

    it("returns DANGER when humidity >= humidityUnsafeHigh", async () => {
      const message = {
        type: "sensor_reading" as const,
        device_id: "device-1",
        token: "valid-token",
        timestamp: "2026-05-10T12:00:00Z",
        temperature: 25,
        humidity: 90,
        mq135_value: 100,
      };
      const result = await service.ingestSensorReading(message);
      expect(result.ack.room_status).toBe("danger");
    });

    it("returns DANGER when humidity <= humidityUnsafeLow", async () => {
      const message = {
        type: "sensor_reading" as const,
        device_id: "device-1",
        token: "valid-token",
        timestamp: "2026-05-10T12:00:00Z",
        temperature: 25,
        humidity: 10,
        mq135_value: 100,
      };
      const result = await service.ingestSensorReading(message);
      expect(result.ack.room_status).toBe("danger");
    });

    it("returns DANGER when mq135_value >= mq135BaselineRuntimeOnly", async () => {
      const message = {
        type: "sensor_reading" as const,
        device_id: "device-1",
        token: "valid-token",
        timestamp: "2026-05-10T12:00:00Z",
        temperature: 25,
        humidity: 50,
        mq135_value: 300,
      };
      const result = await service.ingestSensorReading(message);
      expect(result.ack.room_status).toBe("danger");
    });

    it("DANGER takes priority over WARNING", async () => {
      const message = {
        type: "sensor_reading" as const,
        device_id: "device-1",
        token: "valid-token",
        timestamp: "2026-05-10T12:00:00Z",
        temperature: 50,
        humidity: 80,
        mq135_value: 100,
      };
      const result = await service.ingestSensorReading(message);
      expect(result.ack.room_status).toBe("danger");
    });
  });

  describe("ingestSensorReading", () => {
    it("valid message returns ack.ok === true and broadcast.type === telemetry_reading", async () => {
      const message = {
        type: "sensor_reading" as const,
        device_id: "device-1",
        token: "valid-token",
        timestamp: "2026-05-10T12:00:00Z",
        temperature: 22,
        humidity: 50,
        mq135_value: 100,
      };

      const result = await service.ingestSensorReading(message);

      expect(result.ack.ok).toBe(true);
      expect(result.broadcast.type).toBe("telemetry_reading");
    });

    it("unknown device_id throws error", async () => {
      const message = {
        type: "sensor_reading" as const,
        device_id: "unknown-device",
        token: "valid-token",
        timestamp: "2026-05-10T12:00:00Z",
        temperature: 22,
        humidity: 50,
        mq135_value: 100,
      };

      await expect(service.ingestSensorReading(message)).rejects.toThrow();
    });

    it("invalid token throws error", async () => {
      const message = {
        type: "sensor_reading" as const,
        device_id: "device-1",
        token: "wrong-token",
        timestamp: "2026-05-10T12:00:00Z",
        temperature: 22,
        humidity: 50,
        mq135_value: 100,
      };

      await expect(service.ingestSensorReading(message)).rejects.toThrow();
    });

    it("room_status in response is lowercase", async () => {
      const message = {
        type: "sensor_reading" as const,
        device_id: "device-1",
        token: "valid-token",
        timestamp: "2026-05-10T12:00:00Z",
        temperature: 22,
        humidity: 50,
        mq135_value: 100,
      };

      const result = await service.ingestSensorReading(message);

      expect(result.ack.room_status).toBe("normal");
      expect(result.broadcast.data.room_status).toBe("normal");
    });
  });

  describe("getDashboardSnapshot", () => {
    it("reading exists returns object with current populated", async () => {
      const result = await service.getDashboardSnapshot();

      expect(result.type).toBe("snapshot");
      expect(result.current).not.toBeNull();
      expect(result.current?.device_id).toBe("device-1");
      expect(result.current?.room_status).toBe("normal");
    });

    it("no readings returns snapshot with current null", async () => {
      const originalReturn = mockState.findFirstReturn;
      mockState.findFirstReturn = null;

      const result = await service.getDashboardSnapshot();

      mockState.findFirstReturn = originalReturn;

      expect(result.type).toBe("snapshot");
      expect(result.current).toBeNull();
    });
  });
});
