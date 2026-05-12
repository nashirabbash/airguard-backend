import Elysia from "elysia";
import { z } from "zod";
import { errorMessage } from "../models/errorMessage";
import { AuthService } from "../services/auth.service";
import { DeviceService } from "../services/device.service";
import { createMessageRoute } from "../models/messageRoute";

const authService = new AuthService();
const deviceService = new DeviceService();
const deviceRoute = new Elysia().group("/device", (app) =>
  app
    .post(
      "/register",
      async ({ body, headers, set }) => {
        try {
          const user = await authService.me(headers.authorization);

          const data = await deviceService.registerDevice({
            ...body,
            userId: user.id,
          });
          set.status = 201;

          return createMessageRoute(
            true,
            201,
            "Device registered successfully",
            data,
          );
        } catch (error) {
          set.status =
            error instanceof Error &&
            error.message === errorMessage.DEVICE_ALREADY_REGISTERED
              ? 409
              : error instanceof Error &&
                  error.message === errorMessage.UNAUTHORIZED
                ? 401
                : 400;

          return createMessageRoute(
            false,
            set.status,
            error instanceof Error ? error.message : "An error occurred",
          );
        }
      },
      {
        body: z.object({
          deviceId: z.string(),
          tempUnsafeHigh: z.number(),
          tempUnsafeLow: z.number(),
          tempWarningHigh: z.number(),
          tempWarningLow: z.number(),
          humidityUnsafeHigh: z.number(),
          humidityUnsafeLow: z.number(),
          humidityWarningHigh: z.number(),
          humidityWarningLow: z.number(),
          mq135BaselineRuntimeOnly: z.number(),
        }),
      },
    )
    .put(
      "/:deviceId",
      async ({ params, body, headers, set }) => {
        try {
          const user = await authService.me(headers.authorization);

          const data = await deviceService.updateDevice({
            ...body,
            deviceId: params.deviceId,
          });
          set.status = 200;

          return createMessageRoute(
            true,
            200,
            "Device updated successfully",
            data,
          );
        } catch (error) {
          set.status =
            error instanceof Error && error.message === errorMessage.UNAUTHORIZED
              ? 401
              : error instanceof Error &&
                  error.message === errorMessage.DEVICE_NOT_FOUND
                ? 404
                : 400;

          return createMessageRoute(
            false,
            set.status,
            error instanceof Error ? error.message : "An error occurred",
          );
        }
      },
      {
        body: z.object({
          tempUnsafeHigh: z.number(),
          tempUnsafeLow: z.number(),
          tempWarningHigh: z.number(),
          tempWarningLow: z.number(),
          humidityUnsafeHigh: z.number(),
          humidityUnsafeLow: z.number(),
          humidityWarningHigh: z.number(),
          humidityWarningLow: z.number(),
          mq135BaselineRuntimeOnly: z.number(),
        }),
      },
    )
    .get("/user/:userId", async ({ params, set }) => {
      try {
        const userId = Number(params.userId);
        if (isNaN(userId)) {
          throw new Error("Invalid user ID");
        }
        const data = await deviceService.getDeviceByUserId(userId);
        set.status = 200;

        return createMessageRoute(
          true,
          200,
          "Devices retrieved successfully",
          data,
        );
      } catch (error) {
        set.status = 400;

        return createMessageRoute(
          false,
          set.status,
          error instanceof Error ? error.message : "An error occurred",
        );
      }
    })
    .delete("/delete", async ({ query, set }) => {
      try {
        await deviceService.deleteDevice(query.deviceId);
        set.status = 200;

        return createMessageRoute(true, 200, "Device deleted successfully");
      } catch (error) {
        set.status =
          error instanceof Error &&
          error.message === errorMessage.DEVICE_NOT_FOUND
            ? 404
            : 400;

        return createMessageRoute(
          false,
          set.status,
          error instanceof Error ? error.message : "An error occurred",
        );
      }
    }),
);
export default deviceRoute;
