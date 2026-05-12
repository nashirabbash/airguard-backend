import { describe, it, expect, beforeEach, beforeAll } from "bun:test";
import { Elysia } from "elysia";
import deviceRoute from "../../src/routes/device.route";
import authRoute from "../../src/routes/auth.route";
import { db } from "../../src/models/db";

const app = new Elysia().use(authRoute).use(deviceRoute);

describe("Device Routes Integration Tests", () => {
  let token = "";
  
  beforeAll(async () => {
    // Clear dependencies first
    await db.deviceConfig.deleteMany({});
    // Then clear users
    await db.users.deleteMany({});
    
    // Setup a user to get a token
    const signupRes = await app.handle(
      new Request("http://localhost/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "deviceuser", password: "password123" }),
      })
    );
    const resData = await signupRes.json();
    token = resData.data.token;
  });

  beforeEach(async () => {
    await db.deviceConfig.deleteMany({});
  });

  const validDevicePayload = {
    deviceId: "test-device-1",
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

  describe("POST /device/register", () => {
    it("should register a new device successfully", async () => {
      const response = await app.handle(
        new Request("http://localhost/device/register", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(validDevicePayload),
        })
      );

      const resBody = await response.json();
      expect(response.status).toBe(201);
      expect(resBody.success).toBe(true);
      expect(resBody.data.deviceId).toBe("test-device-1");
    });

    it("should return 409 for duplicate deviceId", async () => {
      await app.handle(
        new Request("http://localhost/device/register", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(validDevicePayload),
        })
      );

      const response = await app.handle(
        new Request("http://localhost/device/register", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(validDevicePayload),
        })
      );

      expect(response.status).toBe(409);
    });

    it("should return 401 when no auth is provided", async () => {
      const response = await app.handle(
        new Request("http://localhost/device/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validDevicePayload),
        })
      );

      expect(response.status).toBe(401);
    });
  });

  describe("PUT /device/:deviceId", () => {
    const updatePayload = {
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

    it("should update device config successfully", async () => {
      // Register device first
      await app.handle(
        new Request("http://localhost/device/register", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(validDevicePayload),
        })
      );

      const response = await app.handle(
        new Request("http://localhost/device/test-device-1", {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(updatePayload),
        })
      );

      const resBody = await response.json();
      expect(response.status).toBe(200);
      expect(resBody.success).toBe(true);
      expect(resBody.data.tempUnsafeHigh).toBe(60);
    });

    it("should return 404 for unknown deviceId", async () => {
      const response = await app.handle(
        new Request("http://localhost/device/unknown-device", {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(updatePayload),
        })
      );

      expect(response.status).toBe(404); 
    });

    it("should return 401 when no auth is provided", async () => {
      const response = await app.handle(
        new Request("http://localhost/device/test-device-1", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
        })
      );

      expect(response.status).toBe(401);
    });
  });

  describe("GET /device/user/:userId", () => {
    it("should return devices for a user", async () => {
      const response = await app.handle(
        new Request("http://localhost/device/user/1", {
          method: "GET"
        })
      );
      expect(response.status).toBe(200);
    });

    it("should return 400 on error (e.g. invalid userId type)", async () => {
      const response = await app.handle(
        new Request("http://localhost/device/user/invalid-id", {
          method: "GET"
        })
      );
      expect(response.status).toBe(400);
    });
  });

  describe("DELETE /device/delete", () => {
    it("should delete a device successfully", async () => {
      await app.handle(
        new Request("http://localhost/device/register", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(validDevicePayload),
        })
      );

      const response = await app.handle(
        new Request("http://localhost/device/delete?deviceId=test-device-1", {
          method: "DELETE"
        })
      );
      expect(response.status).toBe(200);
    });

    it("should return 404 when deleting non-existent device", async () => {
      const response = await app.handle(
        new Request("http://localhost/device/delete?deviceId=does-not-exist", {
          method: "DELETE"
        })
      );
      expect(response.status).toBe(404);
    });
  });
});
