/**
 * Snapshot of the map's current camera state.
 * Used for controlled viewport mode in MapComponent.
 */
export interface MapViewport {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
}
