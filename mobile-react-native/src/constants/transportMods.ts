import { Ionicons } from '@expo/vector-icons';
import { TransportMode } from 'types/transport-type';

export const transportModes: {
  key: TransportMode;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}[] = [
  {
    key: 'walking',
    icon: 'walk',
    label: 'mapUi.walking',
  },
  {
    key: 'driving',
    icon: 'car-sport',
    label: 'mapUi.driving',
  },
  {
    key: 'transit',
    icon: 'train',
    label: 'mapUi.transit',
  },
];
