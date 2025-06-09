import polyline from '@mapbox/polyline';

export const decodePolyline = (encoded: string) => {
  const decodedPoints = polyline.decode(encoded);
  const coordinates = decodedPoints.map((point: any) => ({
    latitude: point[0],
    longitude: point[1],
  }));
  return coordinates;
};
