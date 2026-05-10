import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaBunSqlite } from "prisma-adapter-bun-sqlite";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const configuredDatabasePath = process.env.DATABASE_URL?.startsWith("file:")
  ? process.env.DATABASE_URL.replace(/^file:/, "")
  : "dev.db";
const databasePath = isAbsolute(configuredDatabasePath)
  ? configuredDatabasePath
  : resolve(projectRoot, configuredDatabasePath);

const adapter = new PrismaBunSqlite({
  url: `file:${databasePath}`,
});

export const db = new PrismaClient({ adapter });
