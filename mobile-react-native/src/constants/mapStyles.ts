import type { MapStyleElement } from 'react-native-maps';

import type { ThemeColors } from 'theme/palettes';

export function buildMapStyle(colors: ThemeColors): MapStyleElement[] {
  return [
    { elementType: 'geometry', stylers: [{ color: colors.background }] },
    {
      elementType: 'labels.text.fill',
      stylers: [{ color: colors.textMuted }],
    },
    {
      elementType: 'labels.text.stroke',
      stylers: [{ color: colors.background }],
    },

    {
      featureType: 'administrative',
      elementType: 'geometry',
      stylers: [{ color: colors.border }],
    },
    {
      featureType: 'administrative.country',
      elementType: 'labels.text.fill',
      stylers: [{ color: colors.text }],
    },
    {
      featureType: 'administrative.locality',
      elementType: 'labels.text.fill',
      stylers: [{ color: colors.text }],
    },
    {
      featureType: 'administrative.neighborhood',
      elementType: 'labels.text.fill',
      stylers: [{ color: colors.textMuted }],
    },

    {
      featureType: 'poi',
      elementType: 'labels.icon',
      stylers: [{ visibility: 'off' }],
    },
    {
      featureType: 'poi',
      elementType: 'geometry',
      stylers: [{ color: colors.surfaceAlt }],
    },
    {
      featureType: 'poi',
      elementType: 'labels.text.fill',
      stylers: [{ color: colors.textSubtle }],
    },
    {
      featureType: 'poi.park',
      elementType: 'geometry',
      stylers: [{ color: colors.successSoft }],
    },
    {
      featureType: 'poi.park',
      elementType: 'labels.text.fill',
      stylers: [{ color: colors.textSubtle }],
    },

    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: colors.surface }],
    },
    {
      featureType: 'road',
      elementType: 'geometry.stroke',
      stylers: [{ color: colors.border }],
    },
    {
      featureType: 'road',
      elementType: 'labels.text.fill',
      stylers: [{ color: colors.textSubtle }],
    },
    {
      featureType: 'road',
      elementType: 'labels.icon',
      stylers: [{ visibility: 'off' }],
    },
    {
      featureType: 'route.highway',
      elementType: 'geometry',
      stylers: [{ color: colors.surfaceAlt }],
    },
    {
      featureType: 'route.highway',
      elementType: 'geometry.stroke',
      stylers: [{ color: colors.borderStrong }],
    },
    {
      featureType: 'route.highway',
      elementType: 'labels.text.fill',
      stylers: [{ color: colors.textMuted }],
    },

    {
      featureType: 'transit',
      elementType: 'geometry',
      stylers: [{ color: colors.surfaceAlt }],
    },
    {
      featureType: 'transit',
      elementType: 'labels.icon',
      stylers: [{ visibility: 'off' }],
    },
    {
      featureType: 'transit',
      elementType: 'labels.text.fill',
      stylers: [{ color: colors.textSubtle }],
    },

    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: colors.water }],
    },
    {
      featureType: 'water',
      elementType: 'labels.text.fill',
      stylers: [{ color: colors.textSubtle }],
    },
    {
      featureType: 'water',
      elementType: 'labels.text.stroke',
      stylers: [{ color: colors.water }],
    },
  ];
}
