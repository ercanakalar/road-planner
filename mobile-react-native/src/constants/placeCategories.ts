import { Ionicons } from '@expo/vector-icons';

export const placeCategories: {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}[] = [
  { key: 'restaurant', icon: 'restaurant', label: 'Eat' },
  { key: 'cafe', icon: 'cafe', label: 'Coffee' },
  { key: 'gas_station', icon: 'car', label: 'Fuel' },
  { key: 'lodging', icon: 'bed', label: 'Stay' },
  { key: 'supermarket', icon: 'cart', label: 'Groceries' },
  { key: 'pharmacy', icon: 'medkit', label: 'Pharmacy' },
  { key: 'atm', icon: 'card', label: 'ATM' },
  { key: 'parking', icon: 'car-outline', label: 'Parking' },
  { key: 'tourist_attraction', icon: 'camera', label: 'See' },
  { key: 'park', icon: 'leaf', label: 'Park' },
];

export const searchRadiusOptions: { meters: number; label: string }[] = [
  { meters: 500, label: '500 m' },
  { meters: 1000, label: '1 km' },
  { meters: 2000, label: '2 km' },
  { meters: 5000, label: '5 km' },
  { meters: 10000, label: '10 km' },
];

export const DEFAULT_SEARCH_RADIUS_METERS = 2000;

export const routeSearchSorts: {
  key: 'detour' | 'route' | 'rating';
  label: string;
}[] = [
  { key: 'detour', label: 'Closest' },
  { key: 'route', label: 'In order' },
  { key: 'rating', label: 'Top rated' },
];
