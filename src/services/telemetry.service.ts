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
  getReadings(deviceId: string, start: Date, end: Date) {
    return findManySensorReadings(deviceId, start, end);
  }
  // method to export sensor readings to CSV format
  exportToCSV(deviceId: string, start: Date, end: Date) {
    return this.getReadings(deviceId, start, end).then((readings) =>
      buildCsv(readings)
    );
  }
  
  // Helpers for testing logic
  getDeviceFilter(deviceId: string) { return { deviceId }; }
  getDateFilter(start: Date, end: Date) { return { start, end }; }
  isValidDate(d: Date) { return !isNaN(d.getTime()); }
  formatDate(d: Date) { return d.toISOString(); }
}
