import { useRef, useState } from 'react';
import { decodePolyline } from 'utils/decodePolyline';
import { showNotification } from 'services/notificationService';
import { WaypointWithAddress, RouteCoordinate } from 'types/map-screen-type';
import appConfig from 'constants/appConfig';

const REACT_APP_MAP_API_KEY = appConfig.mapApiKey;

export function useRouteManager() {
  const [routeCoordinates, setRouteCoordinates] = useState<RouteCoordinate[]>([]);
  const lastRouteHashRef = useRef<string | null>(null);
  const routeCacheRef = useRef<Map<string, RouteCoordinate[]>>(new Map());

  const getWaypointHash = (wps: WaypointWithAddress[]) =>
    wps.map(wp => `${wp.latitude},${wp.longitude}`).join('|');

  const fetchRoute = async (waypoints: WaypointWithAddress[]) => {
    const hash = getWaypointHash(waypoints);

    if (lastRouteHashRef.current === hash) return;
    if (routeCacheRef.current.has(hash)) {
      setRouteCoordinates(routeCacheRef.current.get(hash)!);
      lastRouteHashRef.current = hash;
      return;
    }

    try {
      const wpString = waypoints.slice(1, -1)
        .map((p) => `${p.latitude},${p.longitude}`)
        .join('|');
      const origin = `${waypoints[0].latitude},${waypoints[0].longitude}`;
      const destination = `${waypoints.at(-1)?.latitude},${waypoints.at(-1)?.longitude}`;

      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&waypoints=optimize:true|${wpString}&key=${REACT_APP_MAP_API_KEY}`;

      const res = await fetch(url).then((res) => res.json());
      const points = res.routes[0]?.overview_polyline?.points;
      if (!points) throw new Error();
      const decoded = decodePolyline(points);

      routeCacheRef.current.set(hash, decoded);
      lastRouteHashRef.current = hash;
      setRouteCoordinates(decoded);
    } catch {
      showNotification({
        type: 'error',
        header: 'Error',
        message: 'Failed to fetch directions.',
      });
    }
  };

  return { routeCoordinates, fetchRoute };
}
