import { Elysia } from "elysia";
import { z } from "zod";
import { AuthService } from "../services/auth.service";
import { errorMessage } from "../models/errorMessage";
import { createMessageRoute } from "../models/messageRoute";

const authService = new AuthService();
const authRoute = new Elysia().group("/auth", (app) =>
  app
    .post(
      "/login",
      async ({ body: { username, password }, set }) => {
        try {
          const data = await authService.signIn(username, password);

          return createMessageRoute(true, 200, "Login successful", data);
        } catch (error) {
          set.status = 401;

          return createMessageRoute(
            false,
            set.status,
            error instanceof Error ? error.message : errorMessage.UNAUTHORIZED,
          );
        }
      },
      {
        body: z.object({
          username: z.string(),
          password: z.string(),
        }),
      },
    )
    .post("/logout", async (ctx) => {
      try {
        const data = await authService.signOut(ctx.headers.authorization);

        return createMessageRoute(true, 200, "Logout successful", data);
      } catch (error) {
        ctx.set.status = 401;

        return createMessageRoute(
          false,
          ctx.set.status,
          error instanceof Error ? error.message : errorMessage.UNAUTHORIZED,
        );
      }
    })
    .post(
      "/signup",
      async ({ body: { username, password }, set }) => {
        try {
          const data = await authService.signUp(username, password);
          set.status = 201;

          return createMessageRoute(
            true,
            201,
            "User registered successfully",
            data,
          );
        } catch (error) {
          set.status =
            error instanceof Error &&
            error.message === errorMessage.USER_ALREADY_EXISTS
              ? 409
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
          username: z.string(),
          password: z.string(),
        }),
      },
    )
    .get("/users/:id", async (ctx) => {
      try {
        const data = await authService.me(ctx.headers.authorization);

        return createMessageRoute(
          true,
          200,
          "User retrieved successfully",
          data,
        );
      } catch (error) {
        ctx.set.status = 401;

        return createMessageRoute(
          false,
          ctx.set.status,
          error instanceof Error ? error.message : errorMessage.UNAUTHORIZED,
        );
      }
    }),
);
export default authRoute;
