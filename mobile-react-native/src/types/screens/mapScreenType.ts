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
import { RoutePlace } from 'services/mapsService';
import {
  FavoriteEntry,
  FavoriteSectionKey,
} from 'types/store/services/favoriteService-type';
import { TransportMode } from 'types/transport-type';
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
  /** What the list draws — empty while the section is collapsed. */
  data: FavoriteEntry[];
  /** How many the section holds, which a collapsed header still reports. */
  count: number;
}

export interface FavoriteItemProps {
  item: FavoriteEntry;
  isHighlighted?: boolean;
  onPress: (item: FavoriteEntry) => void;
  onEdit: (item: FavoriteEntry) => void;
  onRemove: (item: FavoriteEntry) => void;
  onCopyAddress: (item: FavoriteEntry) => void;
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
  onEdit: (road: WaypointWithAddressAndId) => void;
  onView: (roadId: string) => void;
  onTogglePublic: (road: WaypointWithAddressAndId) => void;
  onShare: (road: WaypointWithAddressAndId) => void;
  sharingRoadId?: string | null;
}

interface RouteSummary {
  duration: string;
  distance: string;
}

export interface MapSectionProps {
  waypoints: WaypointWithAddress[];
  routeCoordinates: RouteCoordinate[];
  draggingWaypointId?: string;
  summary?: RouteSummary;
  transportMode: TransportMode;
  handleMarkerDragEnd: (
    event: MarkerDragStartEndEvent,
    waypointId: string,
  ) => void;
  onMapLongPress: (event: LongPressEvent) => void;
  onMapPress: () => void;
  mapRef: React.RefObject<MapView | null>;
  foundPlaces?: RoutePlace[];
  onFoundPlacePress?: (place: RoutePlace) => void;
  /**
   * The stops being compared, in the order they were picked, so the map can
   * label them A and B to match the list.
   */
  selectedWaypointIds?: readonly string[];
}
