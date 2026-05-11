import { createHash } from "node:crypto";
import { errorMessage } from "../models/errorMessage";
import {
  createDevice,
  deleteDevice,
  DeviceConfigInput,
  existingDevice,
  getDeviceByUserId,
  updateDevice,
} from "../repositories/device.repositories";
import { RegisterDeviceInput, UpdateDeviceInput } from "../helper/utils";

// function create device token hash
function createDeviceTokenHash(deviceId: string) {
  return createHash("sha256").update(deviceId).digest("hex");
}

// function check existing device and throw error if exists
async function checkExistingDevice(deviceId: string) {
  const device = await existingDevice(deviceId);
  if (device) {
    throw new Error(errorMessage.DEVICE_ALREADY_REGISTERED);
  }
}

class DeviceService {
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

export { DeviceService, createDeviceTokenHash };
