import { describe, it, expect, mock, beforeEach } from "bun:test";
import { createHash } from "node:crypto";

const fakeDeviceConfig = {
  deviceId: "device-1",
  userId: 1,
  deviceTokenHash: createHash("sha256").update("device-1").digest("hex"),
  tempUnsafeHigh: 50,
  tempUnsafeLow: 0,
  tempWarningHigh: 40,
  tempWarningLow: 10,
  humidityUnsafeHigh: 90,
  humidityUnsafeLow: 10,
  humidityWarningHigh: 80,
  humidityWarningLow: 20,
  mq135BaselineRuntimeOnly: 300,
};

let mockState = {
  findUniqueReturn: null as any,
  createReturn: fakeDeviceConfig,
  updateReturn: fakeDeviceConfig,
};

mock.module("../../../src/models/db", () => ({
  db: {
    deviceConfig: {
      findUnique: mock(() => mockState.findUniqueReturn),
      create: mock((params: any) => {
        return { ...mockState.createReturn, ...params.data };
      }),
      update: mock((params: any) => {
        return { ...mockState.updateReturn, ...params.data };
      }),
      delete: mock(() => {}),
      findMany: mock(() => []),
    },
  },
}));

const { DeviceService, createDeviceTokenHash } = await import("../../../src/services/device.service");

describe("DeviceService", () => {
  let service: InstanceType<typeof DeviceService>;

  beforeEach(() => {
    service = new DeviceService();
    mockState.findUniqueReturn = null;
  });

  describe("registerDevice", () => {
    it("should register a new device and generate correct SHA-256 token hash", async () => {
      mockState.findUniqueReturn = null; // No existing device

      const input = {
        deviceId: "device-new",
        userId: 1,
        tempUnsafeHigh: 50,
        tempUnsafeLow: 0,
        tempWarningHigh: 40,
        tempWarningLow: 10,
        humidityUnsafeHigh: 90,
        humidityUnsafeLow: 10,
        humidityWarningHigh: 80,
        humidityWarningLow: 20,
        mq135BaselineRuntimeOnly: 300,
      };

      const result = await service.registerDevice(input);
      
      const expectedHash = createHash("sha256").update("device-new").digest("hex");
      
      expect(result.deviceId).toBe("device-new");
      expect(result.deviceTokenHash).toBe(expectedHash);
    });

    it("should throw error if device already exists", async () => {
      mockState.findUniqueReturn = fakeDeviceConfig; // Device exists

      const input = {
        deviceId: "device-1",
        userId: 1,
        tempUnsafeHigh: 50,
        tempUnsafeLow: 0,
        tempWarningHigh: 40,
        tempWarningLow: 10,
        humidityUnsafeHigh: 90,
        humidityUnsafeLow: 10,
        humidityWarningHigh: 80,
        humidityWarningLow: 20,
        mq135BaselineRuntimeOnly: 300,
      };

      await expect(service.registerDevice(input)).rejects.toThrow();
    });
  });

  describe("updateDevice", () => {
    it("should update device config correctly", async () => {
      mockState.findUniqueReturn = fakeDeviceConfig;

      const updateInput = {
        deviceId: "device-1",
        tempUnsafeHigh: 60,
        tempUnsafeLow: -5,
        tempWarningHigh: 45,
        tempWarningLow: 5,
        humidityUnsafeHigh: 95,
        humidityUnsafeLow: 5,
        humidityWarningHigh: 85,
        humidityWarningLow: 15,
        mq135BaselineRuntimeOnly: 400,
      };

      const result = await service.updateDevice(updateInput);

      expect(result.tempUnsafeHigh).toBe(60);
      expect(result.mq135BaselineRuntimeOnly).toBe(400);
    });
  });

  describe("createDeviceTokenHash", () => {
    it("should generate correct SHA-256 hash", () => {
      const deviceId = "test-device-id";
      const expectedHash = createHash("sha256").update(deviceId).digest("hex");
      expect(createDeviceTokenHash(deviceId)).toBe(expectedHash);
    });
  });

  describe("deleteDevice", () => {
    it("should delete device successfully", async () => {
      mockState.findUniqueReturn = fakeDeviceConfig;

      await expect(service.deleteDevice("device-1")).resolves.toBeUndefined();
    });
  });

  describe("getDeviceByUserId", () => {
    it("should return devices for a given user", async () => {
      const result = await service.getDeviceByUserId(1);
      expect(result).toBeDefined();
    });
  });
});
