export type TransportMode = 'walking' | 'driving' | 'transit';

export type StopOption = 'favorite' | 'copy' | 'delete';

export interface TransportSelectorProps {
  selected: TransportMode;
  onChange: (mode: TransportMode) => void;
  durations?: Partial<Record<TransportMode, number>>;
}
