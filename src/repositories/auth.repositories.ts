import { db } from "../models/db";

// function to hash password using bcrypt
function encryptPassword(password: string) {
  return Bun.password.hash(password, "bcrypt");
}

// function to find user by username
async function findUser(username: string) {
  return await db.users.findUnique({
    where: { username },
  });
}

// function to create a new user with hashed password
async function createUser(username: string, password: string) {
  return await db.users.create({
    data: {
      username,
      password: await encryptPassword(password),
      createdAt: new Date(),
    },
  });
}

// function to update the last login time of a user
async function updateLastLogin(userId: number) {
  await db.users.update({
    where: { id: userId },
    data: { lastLogin: new Date() },
  });
}

// function to get user data by user ID
async function getUserData(userId: number) {
  return await db.users.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      lastLogin: true,
    },
  });
}

export { findUser, createUser, updateLastLogin, getUserData };
