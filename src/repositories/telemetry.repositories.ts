import { db } from "../models/db";

// function to find sensor readings for a device within a time range
function findManySensorReadings(deviceId: string, start: Date, end: Date) {
  return db.sensorReadings.findMany({
    where: {
      deviceId,
      timestamp: {
        gte: start,
        lte: end,
      },
    },
    orderBy: {
      timestamp: "asc",
    },
  });
}

export { findManySensorReadings };
