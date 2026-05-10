import { db } from "../models/db";
import { createHash } from "node:crypto";
import { errorMessage } from "../models/errorMessage";

// register device input type
export type RegisterDeviceInput = {
  deviceId: string;
  userId: number;
} & DeviceConfigInput;

// update device input type
export type UpdateDeviceInput = {
  deviceId: string;
} & DeviceConfigInput;

// device config input type
type DeviceConfigInput = {
  tempUnsafeHigh: number;
  tempUnsafeLow: number;
  tempWarningHigh: number;
  tempWarningLow: number;
  humidityUnsafeHigh: number;
  humidityUnsafeLow: number;
  humidityWarningHigh: number;
  humidityWarningLow: number;
  mq135BaselineRuntimeOnly: number;
};

// function check existing device
async function existingDevice(deviceId: string) {
  return await db.deviceConfig.findUnique({
    where: { deviceId },
  });
}

// function create device token hash
function createDeviceTokenHash(deviceId: string) {
  return createHash("sha256").update(deviceId).digest("hex");
}

// function create device
async function createDevice(params: RegisterDeviceInput) {
  return await db.deviceConfig.create({
    data: {
      deviceId: params.deviceId,
      deviceTokenHash: createDeviceTokenHash(params.deviceId),
      userId: params.userId,
      tempUnsafeHigh: params.tempUnsafeHigh,
      tempUnsafeLow: params.tempUnsafeLow,
      tempWarningHigh: params.tempWarningHigh,
      tempWarningLow: params.tempWarningLow,
      humidityUnsafeHigh: params.humidityUnsafeHigh,
      humidityUnsafeLow: params.humidityUnsafeLow,
      humidityWarningHigh: params.humidityWarningHigh,
      humidityWarningLow: params.humidityWarningLow,
      mq135BaselineRuntimeOnly: params.mq135BaselineRuntimeOnly,
    },
  });
}

// function update device
async function updateDevice(params: UpdateDeviceInput) {
  return await db.deviceConfig.update({
    where: { deviceId: params.deviceId },
    data: {
      tempUnsafeHigh: params.tempUnsafeHigh,
      tempUnsafeLow: params.tempUnsafeLow,
      tempWarningHigh: params.tempWarningHigh,
      tempWarningLow: params.tempWarningLow,
      humidityUnsafeHigh: params.humidityUnsafeHigh,
      humidityUnsafeLow: params.humidityUnsafeLow,
      humidityWarningHigh: params.humidityWarningHigh,
      humidityWarningLow: params.humidityWarningLow,
      mq135BaselineRuntimeOnly: params.mq135BaselineRuntimeOnly,
    },
  });
}

// function delete device
async function deleteDevice(deviceId: string) {
  await db.deviceConfig.delete({
    where: { deviceId },
  });
}

// function get device by userId
async function getDeviceByUserId(userId: number) {
  return await db.deviceConfig.findMany({
    where: { userId },
  });
}

// function check existing device and throw error if exists
async function checkExistingDevice(deviceId: string) {
  const device = await existingDevice(deviceId);
  if (device) {
    throw new Error(errorMessage.DEVICE_ALREADY_REGISTERED);
  }
}

export class DeviceService {
  // register device
  async registerDevice({
    deviceId,
    userId,
    tempUnsafeHigh,
    tempUnsafeLow,
    tempWarningHigh,
    tempWarningLow,
    humidityUnsafeHigh,
    humidityUnsafeLow,
    humidityWarningHigh,
    humidityWarningLow,
    mq135BaselineRuntimeOnly,
  }: RegisterDeviceInput) {
    await checkExistingDevice(deviceId);
    const device = await createDevice({
      deviceId,
      userId,
      tempUnsafeHigh,
      tempUnsafeLow,
      tempWarningHigh,
      tempWarningLow,
      humidityUnsafeHigh,
      humidityUnsafeLow,
      humidityWarningHigh,
      humidityWarningLow,
      mq135BaselineRuntimeOnly,
    });

    return device;
  }

  // update device
  async updateDevice({
    deviceId,
    tempUnsafeHigh,
    tempUnsafeLow,
    tempWarningHigh,
    tempWarningLow,
    humidityUnsafeHigh,
    humidityUnsafeLow,
    humidityWarningHigh,
    humidityWarningLow,
    mq135BaselineRuntimeOnly,
  }: UpdateDeviceInput) {
    const updatedDevice = await updateDevice({
      deviceId,
      tempUnsafeHigh,
      tempUnsafeLow,
      tempWarningHigh,
      tempWarningLow,
      humidityUnsafeHigh,
      humidityUnsafeLow,
      humidityWarningHigh,
      humidityWarningLow,
      mq135BaselineRuntimeOnly,
    });
    return updatedDevice;
  }

  // delete device
  async deleteDevice(deviceId: string) {
    await deleteDevice(deviceId);
  }

  // get device by userId
  async getDeviceByUserId(userId: number) {
    const device = await getDeviceByUserId(userId);
    return device;
  }
}
