import { RoomStatus } from "../generated/prisma/enums";
import { db } from "../models/db";

// function to find a device configuration by its unique device ID from the database using Prisma ORM
function findDeviceById(deviceId: string) {
  return db.deviceConfig.findUnique({
    where: { deviceId },
  });
}

// function to retrieve the most recent sensor reading record from the database, ordered by timestamp in descending order using Prisma ORM
async function getMostRecentSensorReading() {
  return db.sensorReadings.findFirst({
    orderBy: { timestamp: "desc" },
  });
}

// function to create a new sensor reading record in the database with the provided data, including the computed room status, using Prisma ORM
async function createSensorReadingRecord(data: {
  deviceId: string;
  timestamp: string;
  temperature: number;
  humidity: number;
  mq135Value: number;
  roomStatus: RoomStatus;
}) {
  return db.sensorReadings.create({
    data: {
      deviceId: data.deviceId,
      timestamp: new Date(data.timestamp),
      temperature: data.temperature,
      humidity: data.humidity,
      mq135Value: data.mq135Value,
      roomStatus: data.roomStatus,
    },
  });
}

export {
  findDeviceById,
  getMostRecentSensorReading,
  createSensorReadingRecord,
};
