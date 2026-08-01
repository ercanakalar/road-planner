export type TransportMode = 'walking' | 'driving' | 'transit';

export type WaypointOption = 'favorite' | 'delete';

export interface TransportSelectorProps {
  selected: TransportMode;
  onChange: (mode: TransportMode) => void;
  durations?: Partial<Record<TransportMode, number>>;
}
