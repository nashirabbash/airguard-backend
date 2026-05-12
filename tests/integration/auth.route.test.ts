import { describe, it, expect, beforeEach } from "bun:test";
import authRoute from "../../src/routes/auth.route";
import { db } from "../../src/models/db";

const app = authRoute;

describe("Auth Routes Integration Tests", () => {
  beforeEach(async () => {
    // Clear dependencies first
    await db.deviceConfig.deleteMany({});
    // Then clear users
    await db.users.deleteMany({});
  });

  describe("POST /auth/signup", () => {
    it("should sign up a new user successfully", async () => {
      const response = await app.handle(
        new Request("http://localhost/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "newuser", password: "password123" }),
        })
      );

      const resBody = await response.json();

      expect(response.status).toBe(201);
      expect(resBody.success).toBe(true);
      expect(resBody.data.token).toBeDefined();
    });

    it("should return 409 if user already exists", async () => {
      await app.handle(
        new Request("http://localhost/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "existinguser", password: "password123" }),
        })
      );

      const response = await app.handle(
        new Request("http://localhost/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "existinguser", password: "password123" }),
        })
      );

      expect(response.status).toBe(409);
    });

    it("should return 422 or 400 for missing fields", async () => {
      const response = await app.handle(
        new Request("http://localhost/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "onlyusername" }),
        })
      );

      // Elysia's Zod validation typically returns 422 for unprocessable entity
      expect(response.status === 422 || response.status === 400).toBe(true);
    });
  });

  describe("POST /auth/login", () => {
    it("should login successfully with valid credentials", async () => {
      await app.handle(
        new Request("http://localhost/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "loginuser", password: "password123" }),
        })
      );

      const response = await app.handle(
        new Request("http://localhost/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "loginuser", password: "password123" }),
        })
      );

      const resBody = await response.json();

      expect(response.status).toBe(200);
      expect(resBody.success).toBe(true);
      expect(resBody.data.token).toBeDefined();
    });

    it("should return 401 with invalid credentials", async () => {
      const response = await app.handle(
        new Request("http://localhost/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "nonexistent", password: "wrongpassword" }),
        })
      );

      expect(response.status).toBe(401);
    });
  });

  describe("POST /auth/logout", () => {
    it("should logout successfully with valid token", async () => {
      const signupRes = await app.handle(
        new Request("http://localhost/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "logoutuser", password: "password123" }),
        })
      );
      const resData = await signupRes.json();
      const token = resData.data.token;

      const response = await app.handle(
        new Request("http://localhost/auth/logout", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
        })
      );

      expect(response.status).toBe(200);
    });

    it("should return 401 with unknown token", async () => {
      const response = await app.handle(
        new Request("http://localhost/auth/logout", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": "Bearer invalidtoken123"
          },
        })
      );

      expect(response.status).toBe(401);
    });
  });

  describe("GET /auth/users/:id", () => {
    it("should get current user with valid token", async () => {
      const signupRes = await app.handle(
        new Request("http://localhost/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "meuser", password: "password123" }),
        })
      );
      const resData = await signupRes.json();
      const token = resData.data.token;

      const response = await app.handle(
        new Request("http://localhost/auth/users/me", {
          method: "GET",
          headers: { 
            "Authorization": `Bearer ${token}`
          },
        })
      );

      expect(response.status).toBe(200);
      const meData = await response.json();
      expect(meData.data.username).toBe("meuser");
    });

    it("should return 401 with invalid token", async () => {
      const response = await app.handle(
        new Request("http://localhost/auth/users/me", {
          method: "GET",
          headers: { 
            "Authorization": `Bearer invalidtoken`
          },
        })
      );

      expect(response.status).toBe(401);
    });
  });
});
