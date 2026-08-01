import { NativeStackScreenProps } from '@react-navigation/native-stack';
import MapView, {
  LongPressEvent,
  MarkerDragStartEndEvent,
} from 'react-native-maps';
import type { MaterialIcons } from '@expo/vector-icons';

import {
  RouteCoordinate,
  WaypointWithAddress,
  WaypointWithAddressAndId,
} from 'types/map-screen-type';
import {
  FavoriteEntry,
  FavoriteSectionKey,
} from 'types/store/services/favoriteService-type';
import { RootStackParamList } from './screens';

export type WaypointRoute = NativeStackScreenProps<
  RootStackParamList,
  'ShowWaypointById'
>['route'];

export type MaterialIconName = keyof typeof MaterialIcons.glyphMap;

export interface FavoriteSectionDescriptor {
  key: FavoriteSectionKey;
  title: string;
  icon: MaterialIconName;
  data: FavoriteEntry[];
}

export interface FavoriteItemProps {
  item: FavoriteEntry;
  onPress: (item: FavoriteEntry) => void;
  onRemove: (item: FavoriteEntry) => void;
}

export interface FavoriteSectionHeaderProps {
  section: FavoriteSectionDescriptor;
  isExpanded: boolean;
  onToggle: (key: FavoriteSectionKey) => void;
}

export interface RoutesListProps {
  data: WaypointWithAddressAndId[];
  isRefreshing: boolean;
  onRefresh: () => void;
  onToggleFavorite: (road: WaypointWithAddressAndId) => void;
  onDelete: (road: WaypointWithAddressAndId) => void;
  onView: (roadId: string) => void;
}

export interface RouteSummary {
  duration: string;
  distance: string;
}

export interface MapSectionProps {
  waypoints: WaypointWithAddress[];
  routeCoordinates: RouteCoordinate[];
  draggingWaypointId?: string;
  summary?: RouteSummary;
  handleMarkerDragEnd: (
    event: MarkerDragStartEndEvent,
    waypointId: string,
  ) => void;
  onMapLongPress: (event: LongPressEvent) => void;
  onMapPress: () => void;
  mapRef: React.RefObject<MapView | null>;
}
