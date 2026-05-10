-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastLogin" DATETIME
);

-- CreateTable
CREATE TABLE "sensorReadings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "deviceId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "temperature" REAL NOT NULL,
    "humidity" REAL NOT NULL,
    "mq135Value" REAL NOT NULL,
    "roomStatus" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "deviceConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "deviceId" TEXT NOT NULL,
    "deviceTokenHash" TEXT NOT NULL,
    "tempUnsafeHigh" REAL NOT NULL,
    "tempUnsafeLow" REAL NOT NULL,
    "tempWarningLow" REAL NOT NULL,
    "tempWarningHigh" REAL NOT NULL,
    "humidityUnsafeHigh" REAL NOT NULL,
    "humidityUnsafeLow" REAL NOT NULL,
    "humidityWarningLow" REAL NOT NULL,
    "humidityWarningHigh" REAL NOT NULL,
    "mq135BaselineRuntimeOnly" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "deviceConfig_deviceId_key" ON "deviceConfig"("deviceId");
