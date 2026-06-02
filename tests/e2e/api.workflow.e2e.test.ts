import { beforeEach, describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import authRoute from "../../src/routes/auth.route";
import deviceRoute from "../../src/routes/device.route";
import { db } from "../../src/models/db";

const app = new Elysia().group("/api", (root) => root.use(authRoute).use(deviceRoute));

const devicePayload = {
  deviceId: "e2e-device-1",
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

describe("E2E: auth + device workflow", () => {
  beforeEach(async () => {
    await db.deviceConfig.deleteMany({});
    await db.users.deleteMany({});
  });

  it("registers user, fetches current user, registers and reads a device", async () => {
    const signup = await app.handle(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "e2e-user", password: "password123" }),
      }),
    );
    expect(signup.status).toBe(201);
    const signupBody = await signup.json();
    const token = signupBody.data.token as string;
    expect(typeof token).toBe("string");

    const me = await app.handle(
      new Request("http://localhost/api/auth/users/me", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
    expect(me.status).toBe(200);
    const meBody = await me.json();
    expect(meBody.data.username).toBe("e2e-user");

    const registerDevice = await app.handle(
      new Request("http://localhost/api/device/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(devicePayload),
      }),
    );
    expect(registerDevice.status).toBe(201);

    const devices = await app.handle(
      new Request(`http://localhost/api/device/user/${meBody.data.id}`, {
        method: "GET",
      }),
    );
    expect(devices.status).toBe(200);
    const devicesBody = await devices.json();
    expect(Array.isArray(devicesBody.data)).toBe(true);
    expect(devicesBody.data.length).toBeGreaterThan(0);
  });
});
