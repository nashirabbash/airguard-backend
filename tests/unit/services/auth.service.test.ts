import { describe, it, expect, mock, beforeEach } from "bun:test";

const fakeUser = {
  id: 1,
  username: "testuser",
  password: "password123",
  lastLogin: new Date(),
  createdAt: new Date(),
};

let mockState = {
  findUniqueReturn: fakeUser as any,
  createReturn: fakeUser as any,
};

mock.module("../../../src/models/db", () => ({
  db: {
    users: {
      findUnique: mock(() => mockState.findUniqueReturn),
      create: mock(() => mockState.createReturn),
      update: mock(() => {}),
    },
  },
}));

// Provide a mock for Bun.password.hash to avoid slow test execution if needed
// or we can rely on verifyPassword's direct string comparison.
const originalBunPasswordHash = Bun.password.hash;
Bun.password.hash = mock(async () => "hashedpassword") as any;

const { AuthService } = await import("../../../src/services/auth.service");

describe("AuthService", () => {
  let service: InstanceType<typeof AuthService>;

  beforeEach(() => {
    service = new AuthService();
    (AuthService as any).activeTokens.clear();
    mockState.findUniqueReturn = { ...fakeUser };
    mockState.createReturn = { ...fakeUser };
  });

  describe("signUp", () => {
    it("should sign up a new user successfully", async () => {
      mockState.findUniqueReturn = null; // No existing user
      const res = await service.signUp("newuser", "password123");
      expect(res.token).toBeDefined();
    });

    it("should throw error if user already exists", async () => {
      mockState.findUniqueReturn = fakeUser; // User exists
      await expect(service.signUp("testuser", "password123")).rejects.toThrow();
    });
  });

  describe("signIn", () => {
    it("should sign in successfully with valid credentials", async () => {
      mockState.findUniqueReturn = { ...fakeUser, password: "password123" };
      const res = await service.signIn("testuser", "password123");
      expect(res.token).toBeDefined();
      expect(res.user.username).toBe("testuser");
    });

    it("should throw error with invalid credentials", async () => {
      mockState.findUniqueReturn = { ...fakeUser, password: "password123" };
      await expect(service.signIn("testuser", "wrongpassword")).rejects.toThrow();
    });
    
    it("should throw error if user not found", async () => {
      mockState.findUniqueReturn = null;
      await expect(service.signIn("testuser", "password123")).rejects.toThrow();
    });
  });

  describe("signOut", () => {
    it("should sign out successfully with valid token (Bearer prefix)", async () => {
      (AuthService as any).activeTokens.set("valid-token", 1);
      const res = await service.signOut("Bearer valid-token");
      expect(res.success).toBe(true);
      expect((AuthService as any).activeTokens.has("valid-token")).toBe(false);
    });

    it("should sign out successfully with valid token (No prefix)", async () => {
      (AuthService as any).activeTokens.set("valid-token", 1);
      const res = await service.signOut("valid-token");
      expect(res.success).toBe(true);
      expect((AuthService as any).activeTokens.has("valid-token")).toBe(false);
    });

    it("should throw error with unknown token", async () => {
      await expect(service.signOut("unknown-token")).rejects.toThrow();
    });
  });

  describe("me", () => {
    it("should return user data with valid token (Bearer prefix)", async () => {
      (AuthService as any).activeTokens.set("valid-token", 1);
      const res = await service.me("Bearer valid-token");
      expect(res?.username).toBe("testuser");
    });

    it("should return user data with valid token (No prefix)", async () => {
      (AuthService as any).activeTokens.set("valid-token", 1);
      const res = await service.me("valid-token");
      expect(res?.username).toBe("testuser");
    });

    it("should throw error with unknown token", async () => {
      await expect(service.me("unknown-token")).rejects.toThrow();
    });

    it("should throw error if user data not found in DB", async () => {
      (AuthService as any).activeTokens.set("valid-token", 1);
      mockState.findUniqueReturn = null; // Simulate missing user in DB
      await expect(service.me("Bearer valid-token")).rejects.toThrow();
      expect((AuthService as any).activeTokens.has("valid-token")).toBe(false); // Token should be removed
    });
  });
});
