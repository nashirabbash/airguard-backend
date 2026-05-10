import { createHash } from "node:crypto";
import { db } from "../models/db";
import { errorMessage } from "../models/errorMessage";
import {
  createSensorReadingRecord,
  findDeviceById,
  getMostRecentSensorReading,
} from "../repositories/realtimeData.repositories";

// type definition for the expected structure of incoming sensor reading messages from devices
type SensorReadingMessage = {
  type: "sensor_reading";
  device_id: string;
  token: string;
  timestamp: string;
  temperature: number;
  humidity: number;
  mq135_value: number;
};

// type definition for the possible room status values based on sensor readings and defined thresholds in the device configuration
type RoomStatus = "NORMAL" | "WARNING" | "DANGER";

// function to check if the sensor readings indicate a DANGER status based on the defined thresholds in the device configuration
function DANGER({
  temperature,
  humidity,
  mq135Value,
  config,
}: {
  temperature: number;
  humidity: number;
  mq135Value: number;
  config: any;
}) {
  return (
    temperature <= config.tempUnsafeLow ||
    temperature >= config.tempUnsafeHigh ||
    humidity <= config.humidityUnsafeLow ||
    humidity >= config.humidityUnsafeHigh ||
    mq135Value >= config.mq135BaselineRuntimeOnly
  );
}

// function to check if the sensor readings indicate a WARNING status based on the defined thresholds in the device configuration
function WARNING({
  temperature,
  humidity,
  config,
}: {
  temperature: number;
  humidity: number;
  config: any;
}) {
  return (
    temperature <= config.tempWarningLow ||
    temperature >= config.tempWarningHigh ||
    humidity <= config.humidityWarningLow ||
    humidity >= config.humidityWarningHigh
  );
}

// function to compute the overall room status based on the sensor readings and the defined thresholds in the device configuration, returning DANGER if any reading is in the danger zone, WARNING if any reading is in the warning zone, and NORMAL otherwise
function computeRoomStatus({
  temperature,
  humidity,
  mq135Value,
  config,
}: {
  temperature: number;
  humidity: number;
  mq135Value: number;
  config: any;
}): RoomStatus {
  if (DANGER({ temperature, humidity, mq135Value, config })) {
    return "DANGER";
  }

  if (WARNING({ temperature, humidity, config })) {
    return "WARNING";
  }

  return "NORMAL";
}

const ErrorMessage = errorMessage;

// function to check if the incoming message is a valid sensor reading message
function isSensorReading(message: any): message is SensorReadingMessage {
  if (typeof message !== "object" || message === null) {
    throw new Error(ErrorMessage.INVALID_MESSAGE);
  }

  return message.type === "sensor_reading";
}

// function to check if device found in the database, if not throw an error
function deviceNotFound(device: any) {
  if (!device) {
    throw new Error(ErrorMessage.DEVICE_NOT_FOUND);
  }
}

// type assertion function to ensure the device has the required configuration properties for processing sensor readings
function assertDeviceExists(device: any): asserts device is {
  deviceTokenHash: string;
  tempUnsafeLow: number;
  tempUnsafeHigh: number;
  humidityUnsafeLow: number;
  humidityUnsafeHigh: number;
  mq135BaselineRuntimeOnly: number;
  tempWarningLow: number;
  tempWarningHigh: number;
  humidityWarningLow: number;
  humidityWarningHigh: number;
} {
  deviceNotFound(device);
}

// function to create a hash of the token using SHA-256 algorithm for secure comparison with the stored device token hash in the database
function createHashOfToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

// function to validate token hash by comparing the hash of the incoming token with the stored device token hash in the database, if they do not match throw an error
function validateTokenHash(token: string, deviceTokenHash: string) {
  const tokenHash = createHashOfToken(token);

  if (tokenHash !== deviceTokenHash) {
    throw new Error(ErrorMessage.DEVICE_TOKEN_INVALID);
  }
}

class RealtimeDataService {
  // function to compute the room status based on the sensor readings and device configuration, returning DANGER if any reading is in the danger zone, WARNING if any reading is in the warning zone, and NORMAL otherwise
  private computeRoomStatus(params: {
    temperature: number;
    humidity: number;
    mq135Value: number;
    config: any;
  }): RoomStatus {
    return computeRoomStatus(params);
  }

  // function to handle ingestion of sensor reading messages, validate the message, find the associated device, validate the token, compute the room status, create a new sensor reading record in the database, and return an acknowledgment response along with the data to be broadcasted to connected clients
  async ingestSensorReading(message: SensorReadingMessage) {
    isSensorReading(message);
    const device = await findDeviceById(message.device_id);
    assertDeviceExists(device);
    validateTokenHash(message.token, device.deviceTokenHash);

    const roomStatus = this.computeRoomStatus({
      temperature: message.temperature,
      humidity: message.humidity,
      mq135Value: message.mq135_value,
      config: device,
    });

    const reading = await createSensorReadingRecord({
      deviceId: message.device_id,
      timestamp: message.timestamp,
      temperature: message.temperature,
      humidity: message.humidity,
      mq135Value: message.mq135_value,
      roomStatus,
    });

    return {
      ack: {
        type: "ingest_ack",
        ok: true,
        room_status: roomStatus.toLowerCase(),
        stored: true,
      },
      broadcast: {
        type: "telemetry_reading",
        data: {
          id: reading.id,
          device_id: reading.deviceId,
          timestamp: reading.timestamp.toISOString(),
          temperature: reading.temperature,
          humidity: reading.humidity,
          mq135_value: reading.mq135Value,
          room_status: reading.roomStatus.toLowerCase(),
        },
      },
    };
  }

  // function to get the most recent sensor reading and return it in a format suitable for dashboard display, including the room status based on the defined thresholds
  async getDashboardSnapshot() {
    const current = await getMostRecentSensorReading();

    return {
      type: "snapshot",
      current: current
        ? {
            device_id: current.deviceId,
            timestamp: current.timestamp.toISOString(),
            temperature: current.temperature,
            humidity: current.humidity,
            mq135_value: current.mq135Value,
            room_status: current.roomStatus.toLowerCase(),
          }
        : null,
    };
  }
}

export { RealtimeDataService, RoomStatus };
