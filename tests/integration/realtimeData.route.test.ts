import { describe, it, expect, beforeAll, beforeEach } from "bun:test";
import { RealtimeDataService } from "../../src/services/realtimeData.service";
import { db } from "../../src/models/db";
import { createHash } from "node:crypto";

const service = new RealtimeDataService();

describe("RealtimeData Integration Tests", () => {
  beforeAll(async () => {
    // Clear dependencies
    await db.sensorReadings.deleteMany({});
    await db.deviceConfig.deleteMany({});
    await db.users.deleteMany({});

    // Create a user
    const user = await db.users.create({
      data: {
        username: "realtimeuser",
        password: "password123",
      },
    });

    // Create a device config
    await db.deviceConfig.create({
      data: {
        deviceId: "realtime-device-1",
        deviceTokenHash: createHash("sha256").update("valid-token").digest("hex"),
        userId: user.id,
        tempUnsafeHigh: 50,
        tempUnsafeLow: 0,
        tempWarningHigh: 40,
        tempWarningLow: 10,
        humidityUnsafeHigh: 90,
        humidityUnsafeLow: 10,
        humidityWarningHigh: 80,
        humidityWarningLow: 20,
        mq135BaselineRuntimeOnly: 300,
      },
    });
  });

  beforeEach(async () => {
    await db.sensorReadings.deleteMany({});
  });

  describe("Sensor Data Ingestion", () => {
    it("should ingest valid message and compute correct room status (NORMAL)", async () => {
      const message = {
        type: "sensor_reading" as const,
        device_id: "realtime-device-1",
        token: "valid-token",
        timestamp: new Date().toISOString(),
        temperature: 25,
        humidity: 50,
        mq135_value: 100,
      };

      const result = await service.ingestSensorReading(message);

      expect(result.ack.ok).toBe(true);
      expect(result.ack.room_status).toBe("normal");

      // Verify storage
      const reading = await db.sensorReadings.findFirst({
        where: { deviceId: "realtime-device-1" }
      });
      expect(reading).not.toBeNull();
      expect(reading?.temperature).toBe(25);
      expect(reading?.roomStatus).toBe("NORMAL");
    });

    it("should throw error for unknown device_id (simulating 404)", async () => {
      const message = {
        type: "sensor_reading" as const,
        device_id: "unknown-device",
        token: "valid-token",
        timestamp: new Date().toISOString(),
        temperature: 25,
        humidity: 50,
        mq135_value: 100,
      };

      await expect(service.ingestSensorReading(message)).rejects.toThrow("Device not found");
    });

    it("should throw error for invalid token (simulating 401)", async () => {
      const message = {
        type: "sensor_reading" as const,
        device_id: "realtime-device-1",
        token: "invalid-token",
        timestamp: new Date().toISOString(),
        temperature: 25,
        humidity: 50,
        mq135_value: 100,
      };

      await expect(service.ingestSensorReading(message)).rejects.toThrow("Device token is invalid");
    });

    it("should throw error for malformed message (simulating 400)", async () => {
      await expect(service.ingestSensorReading(null as any)).rejects.toThrow("Invalid message");
    });
  });

  describe("Dashboard Snapshot", () => {
    it("should return the most recent reading", async () => {
      // Ingest a reading first
      const message = {
        type: "sensor_reading" as const,
        device_id: "realtime-device-1",
        token: "valid-token",
        timestamp: new Date().toISOString(),
        temperature: 35,
        humidity: 60,
        mq135_value: 150,
      };

      await service.ingestSensorReading(message);

      const snapshot = await service.getDashboardSnapshot();

      expect(snapshot.type).toBe("snapshot");
      expect(snapshot.current).not.toBeNull();
      expect(snapshot.current?.device_id).toBe("realtime-device-1");
      expect(snapshot.current?.temperature).toBe(35);
    });

    it("should return null current if no readings exist", async () => {
      // DB is cleared by beforeEach
      const snapshot = await service.getDashboardSnapshot();
      
      expect(snapshot.type).toBe("snapshot");
      expect(snapshot.current).toBeNull();
    });
  });
});
