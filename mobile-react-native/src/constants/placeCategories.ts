import { Ionicons } from '@expo/vector-icons';

export const placeCategories: {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}[] = [
  { key: 'restaurant', icon: 'restaurant', label: 'sorting.eat' },
  { key: 'cafe', icon: 'cafe', label: 'sorting.coffee' },
  { key: 'gas_station', icon: 'car', label: 'sorting.fuel' },
  { key: 'lodging', icon: 'bed', label: 'sorting.stay' },
  { key: 'supermarket', icon: 'cart', label: 'sorting.groceries' },
  { key: 'pharmacy', icon: 'medkit', label: 'sorting.pharmacy' },
  { key: 'atm', icon: 'card', label: 'sorting.atm' },
  { key: 'parking', icon: 'car-outline', label: 'sorting.parking' },
  { key: 'tourist_attraction', icon: 'camera', label: 'sorting.see' },
  { key: 'park', icon: 'leaf', label: 'sorting.park' },
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
  { key: 'detour', label: 'sorting.closest' },
  { key: 'route', label: 'sorting.inOrder' },
  { key: 'rating', label: 'sorting.topRated' },
];
