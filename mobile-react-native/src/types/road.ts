import { WaypointWithAddressAndId } from './map-screen-type';

type RoadLocation = {
  lat: number;
  lng: number;
};

type DistanceOrDuration = {
  text: string;
  value: number;
};

export type RouteLeg = {
  distance: DistanceOrDuration;
  duration: DistanceOrDuration;
  end_address: string;
  end_location: RoadLocation;
  start_address: string;
  start_location: RoadLocation;
  traffic_speed_entry: any[];
  via_waypoint: any[];
};

export type RoadState = {
  roads: WaypointWithAddressAndId[];
  isLoading: boolean;
  state: string;
  user: any;
  error: any;
  errors: any;
  selectedWaypointId?: number;
};
