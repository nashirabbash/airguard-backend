import { db } from "../models/db";
import {
  createDeviceTokenHash,
  RegisterDeviceInput,
  UpdateDeviceInput,
} from "../services/device.service";

// device configuration input type
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

// function for create device
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

// function for update device
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

// function for check existing device
async function existingDevice(deviceId: string) {
  return await db.deviceConfig.findUnique({
    where: { deviceId },
  });
}

// function for delete device
async function deleteDevice(deviceId: string) {
  await db.deviceConfig.delete({
    where: { deviceId },
  });
}

// function for get device by userId
async function getDeviceByUserId(userId: number) {
  return await db.deviceConfig.findMany({
    where: { userId },
  });
}

export {
  createDevice,
  updateDevice,
  existingDevice,
  deleteDevice,
  getDeviceByUserId,
  DeviceConfigInput,
};
