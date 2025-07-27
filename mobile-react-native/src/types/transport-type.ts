export type TransportMode = 'walking' | 'driving' | 'transit';
export type WaypointOption =
  | 'edit'
  | 'departure'
  | 'share'
  | 'favorite'
  | 'delete';

export interface TransportSelectorProps {
  selected: TransportMode;
  onChange: (mode: TransportMode) => void;
  durations?: {
    driving?: string;
    walking?: string;
    transit?: string;
  };
}
