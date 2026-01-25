/**
 * Sensor Adapter Interface
 *
 * PORTABILITY: This interface abstracts sensors.
 * Core code uses this interface, platform-specific code implements it.
 *
 * Implementations:
 * - Node.js: NullSensorAdapter (no sensors available)
 * - Android: Real sensors (camera, GPS, motion, etc.)
 */

export interface Location {
  latitude: number;
  longitude: number;
  accuracy: number; // meters
  timestamp: number;
}

export interface MotionData {
  /** Acceleration in m/s² */
  acceleration: { x: number; y: number; z: number };
  /** Rotation rate in rad/s */
  rotation: { alpha: number; beta: number; gamma: number };
  timestamp: number;
}

export interface SensorCapability {
  type: 'camera' | 'location' | 'motion' | 'audio';
  available: boolean;
}

export interface SensorAdapter {
  /**
   * Get available sensor capabilities
   */
  capabilities(): SensorCapability[];

  /**
   * Check if camera is available
   */
  hasCamera(): boolean;

  /**
   * Check if location is available
   */
  hasLocation(): boolean;

  /**
   * Check if motion sensors are available
   */
  hasMotion(): boolean;

  /**
   * Get current location
   * @returns Location or null if unavailable
   */
  getLocation(): Promise<Location | null>;

  /**
   * Capture an image
   * @returns Image as Uint8Array or null if unavailable
   */
  captureImage(): Promise<Uint8Array | null>;

  /**
   * Subscribe to location changes
   * @returns Unsubscribe function
   */
  onLocationChange(callback: (location: Location) => void): () => void;

  /**
   * Subscribe to motion data
   * @returns Unsubscribe function
   */
  onMotion(callback: (data: MotionData) => void): () => void;
}
