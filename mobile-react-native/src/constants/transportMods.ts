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
    label: 'Walking',
  },
  {
    key: 'driving',
    icon: 'car-sport',
    label: 'Driving',
  },
  {
    key: 'transit',
    icon: 'train',
    label: 'Transit',
  },
];
