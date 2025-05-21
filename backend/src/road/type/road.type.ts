export class CreateAddress {
  country?: string;
  province?: string;
  district?: string;
  address: string;
}

export class CreateWaypoint {
  id?: string;
  lat: number;
  lng: number;
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
