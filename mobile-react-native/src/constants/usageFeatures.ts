import type { Ionicons } from '@expo/vector-icons';

type IconName = keyof typeof Ionicons.glyphMap;

// Every feature the server's statistics table can count, by the name it is
// stored under, with the words and icon the app shows for it. Mirrors
// USAGE_EVENTS on the server; a feature it does not know yet is shown by its
// stored name rather than hidden.
export const USAGE_FEATURES: Record<string, { label: string; icon: IconName }> =
  {
    account_signed_up: {
      label: 'statistics.featureSignedUp',
      icon: 'person-add-outline',
    },
    account_signed_in: {
      label: 'statistics.featureSignedIn',
      icon: 'log-in-outline',
    },
    route_created: {
      label: 'statistics.featureRouteCreated',
      icon: 'add-circle-outline',
    },
    route_published: {
      label: 'statistics.featureRoutePublished',
      icon: 'megaphone-outline',
    },
    route_copied: { label: 'statistics.featureRouteCopied', icon: 'copy-outline' },
    route_deleted: {
      label: 'statistics.featureRouteDeleted',
      icon: 'trash-outline',
    },
    route_share_link_created: {
      label: 'statistics.featureShareLinkCreated',
      icon: 'link-outline',
    },
    route_share_link_opened: {
      label: 'statistics.featureShareLinkOpened',
      icon: 'open-outline',
    },
    route_terrain: { label: 'statistics.featureTerrain', icon: 'trending-up' },
    stop_added: { label: 'statistics.featureStopAdded', icon: 'pin-outline' },
    favorite_toggled: {
      label: 'statistics.featureFavourite',
      icon: 'heart-outline',
    },
    author_follow_toggled: {
      label: 'statistics.featureFollow',
      icon: 'notifications-outline',
    },
    search_routes: {
      label: 'statistics.featureSearchRoutes',
      icon: 'search-outline',
    },
    search_people: {
      label: 'statistics.featureSearchPeople',
      icon: 'people-outline',
    },
    maps_directions: {
      label: 'statistics.featureDirections',
      icon: 'navigate-outline',
    },
    maps_place_selected: {
      label: 'statistics.featurePlaceSelected',
      icon: 'location-outline',
    },
    maps_along_route_search: {
      label: 'statistics.featureAlongRoute',
      icon: 'restaurant-outline',
    },
    travel_map_lookup: {
      label: 'statistics.featureTravelLookup',
      icon: 'earth-outline',
    },
    app_opened: {
      label: 'statistics.featureAppOpened',
      icon: 'phone-portrait-outline',
    },
    map_local_route_created: {
      label: 'statistics.featureLocalRoute',
      icon: 'git-branch-outline',
    },
    map_google_import: {
      label: 'statistics.featureGoogleImport',
      icon: 'download-outline',
    },
    map_opened_in_google_maps: {
      label: 'statistics.featureOpenedInGoogleMaps',
      icon: 'map-outline',
    },
    travel_map_area_marked: {
      label: 'statistics.featureAreaMarked',
      icon: 'color-fill-outline',
    },
  };

export const USAGE_FEATURE_FALLBACK_ICON: IconName = 'ellipse-outline';
