export class CreateAddress {
  country?: string;
  province?: string;
  district?: string;
  address: string;
}

export class CreateWaypoint {
  id?: string;
  latitude: number;
  longitude: number;
  order: number;
  type: 'start' | 'end' | 'waypoint';
  address?: CreateAddress;
  addressInfoId?: string;
}

export class CreateRoad {
  title: string;
  description: string;
  waypoints: CreateWaypoint[];
}

export class UpdateRoad {
  title: string;
  description: string;
  waypoints: CreateWaypoint[];
}

export class AddWaypointToRoad {
  latitude: number;
  longitude: number;
  order: number;
  address: {
    address: string;
    country: string;
    district: string;
    province: string;
  };
}
