import * as Prisma from "@prisma/client";
import { execSync } from "child_process";
import { existsSync, unlinkSync } from "fs";
import { resolve } from "path";

const TEST_DB_PATH = resolve(import.meta.dir, "../../test.db");
const PRISMA_BIN = resolve(import.meta.dir, "../../node_modules/.bin/prisma");

let db: any = null;

export async function setupTestDb() {
  if (existsSync(TEST_DB_PATH)) {
    unlinkSync(TEST_DB_PATH);
  }

  process.env.DATABASE_URL = `file:${TEST_DB_PATH}`;

  execSync(`${PRISMA_BIN} migrate deploy`, {
    cwd: resolve(import.meta.dir, "../.."),
    stdio: "inherit",
  });

  const PrismaClient = (Prisma as any).PrismaClient;

  db = new PrismaClient({
    datasources: {
      db: {
        url: `file:${TEST_DB_PATH}`,
      },
    },
  });

  return db;
}

export async function teardownTestDb() {
  if (db) {
    await db.$disconnect();
    db = null;
  }

  if (existsSync(TEST_DB_PATH)) {
    unlinkSync(TEST_DB_PATH);
  }
}
