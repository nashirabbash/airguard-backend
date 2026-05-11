import { DeviceConfigInput } from "../repositories/device.repositories";

// register device input type
type RegisterDeviceInput = {
  deviceId: string;
  userId: number;
} & DeviceConfigInput;

// update device input type
type UpdateDeviceInput = {
  deviceId: string;
} & DeviceConfigInput;

// type definition for the possible room status values based on sensor readings and defined thresholds in the device configuration
type RoomStatus = "NORMAL" | "WARNING" | "DANGER";

export { RegisterDeviceInput, UpdateDeviceInput, RoomStatus };
