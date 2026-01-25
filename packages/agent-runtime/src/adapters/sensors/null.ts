/**
 * Null Sensor Adapter
 *
 * Used on platforms without sensors (desktop).
 * All methods return null/empty - no sensors available.
 */

import type {
  SensorAdapter,
  SensorCapability,
  Location,
  MotionData,
} from './interface.js';

export class NullSensorAdapter implements SensorAdapter {
  capabilities(): SensorCapability[] {
    return [
      { type: 'camera', available: false },
      { type: 'location', available: false },
      { type: 'motion', available: false },
      { type: 'audio', available: false },
    ];
  }

  hasCamera(): boolean {
    return false;
  }

  hasLocation(): boolean {
    return false;
  }

  hasMotion(): boolean {
    return false;
  }

  async getLocation(): Promise<Location | null> {
    return null;
  }

  async captureImage(): Promise<Uint8Array | null> {
    return null;
  }

  onLocationChange(_callback: (location: Location) => void): () => void {
    // No-op, return unsubscribe function
    return () => {};
  }

  onMotion(_callback: (data: MotionData) => void): () => void {
    // No-op, return unsubscribe function
    return () => {};
  }
}
