import { findManySensorReadings } from "../repositories/telemetry.repositories";

// helper function to build CSV content from sensor readings
function buildCsv(readings: Array<any>) {
  const csvHeader = "timestamp,temperature,humidity,mq135_value,room_status\n";
  const csvRows = readings
    .map(
      (r) =>
        `${r.timestamp.toISOString()},${r.temperature.toFixed(
          2,
        )},${r.humidity.toFixed(2)},${r.mq135Value.toFixed(2)},${r.roomStatus}`,
    )
    .join("\n");

  return `${csvHeader}${csvRows}`;
}

// service class to handle telemetry-related operations
export class TelemetryService {
  // method to get sensor readings for a device within a time range
  async getReadings(deviceId: string, start: Date, end: Date) {
    const data = await findManySensorReadings(deviceId, start, end);
    return data;
  }
  // method to export sensor readings to CSV format
  async exportToCSV(deviceId: string, start: Date, end: Date) {
    const readings = await this.getReadings(deviceId, start, end);
    return buildCsv(readings);
  }
}
