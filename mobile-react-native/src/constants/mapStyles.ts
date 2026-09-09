import type { MapStyleElement } from 'react-native-maps';

import type { ThemeColors } from 'theme/palettes';

/**
 * Builds the Google Maps style out of the app's own palette.
 *
 * The map is a backdrop, not a subject: everything that matters on it — the
 * route line, the four stop pins, the places found along the way — is drawn
 * on top in saturated palette colours, and the map has to stay out of their way
 * in both themes. So the basemap is built only from the neutrals (`background`,
 * `surface`, `surfaceAlt`, `border`, the three text tones), with exactly two
 * exceptions where a grey would read as wrong rather than as neutral: water
 * takes `water` and parkland takes `successSoft`. Water has a palette token of
 * its own precisely because it must not follow the brand — the app is green,
 * and a green sea reads as land. Both tints still sit well below the pins
 * drawn over them.
 *
 * Nothing here is a literal colour. Retheming the app retheme the map.
 */
export function buildMapStyle(colors: ThemeColors): MapStyleElement[] {
  return [
    // The land itself, and the default for anything not named below.
    { elementType: 'geometry', stylers: [{ color: colors.background }] },
    {
      elementType: 'labels.text.fill',
      stylers: [{ color: colors.textMuted }],
    },
    {
      // Haloing labels in the land colour is what keeps them legible over
      // parks and routes without a second text colour.
      elementType: 'labels.text.stroke',
      stylers: [{ color: colors.background }],
    },

    // Borders and place names.
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

    // Points of interest. Their pins are turned off entirely: this app draws
    // its own, and Google's would compete with them for the same glance.
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

    // Routes, one step off the land so the network reads without drawing the
    // eye. Motorways get the border colour to separate them from the rest.
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

    // Transit lines, kept at the land colour so they never look like a drawn
    // route. The transit route this app draws uses `transitRoute`, and the two
    // must not be confusable.
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

    // Water. The one large area that has to read as itself.
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
