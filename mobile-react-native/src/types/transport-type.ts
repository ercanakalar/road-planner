export type TransportMode = 'walking' | 'driving' | 'transit';

export type WaypointOption = 'favorite' | 'copy' | 'delete';

export interface TransportSelectorProps {
  selected: TransportMode;
  onChange: (mode: TransportMode) => void;
  durations?: Partial<Record<TransportMode, number>>;
}
