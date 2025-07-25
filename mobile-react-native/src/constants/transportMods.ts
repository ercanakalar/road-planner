import { Ionicons } from '@expo/vector-icons';
import { TransportMode } from 'types/transport-type';

export const transportModes: {
  key: TransportMode;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}[] = [
  { key: 'car', icon: 'car', label: 'Car' },
  { key: 'public', icon: 'subway', label: 'Public Transport' },
  { key: 'walk', icon: 'walk', label: 'Walking' },
];
