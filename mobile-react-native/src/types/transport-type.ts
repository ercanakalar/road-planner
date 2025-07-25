export type TransportMode =
  | 'car'
  | 'public'
  | 'walk'
  | 'driving'
  | 'walking'
  | 'transit';
export type WaypointOption = 'edit' | 'departure' | 'share' | 'favorite';

export interface TransportSelectorProps {
  selected: TransportMode;
  onChange: (mode: TransportMode) => void;
}
