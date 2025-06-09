import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { MapState } from 'types/map';
import { Waypoint } from 'types/map-screen-type';

const initialState: MapState = {
  wayPoints: [
    {
      id: 1,
      latitude: 39.9373193,
      longitude: 32.8775523,
      address: ' Demirlibahçe, Plevne Cd. No:8, 06340 Mamak/Ankara, Türkiy',
      order: 1,
    },
    {
      id: 2,
      latitude: 39.9283269,
      longitude: 32.8654476,
      address:
        'Fidanlık, Kurtuluş, Celal Bayar Blv., 06420 Çankaya/Ankara, Türkiye',
      order: 2,
    },
    {
      id: 3,
      latitude: 39.9409097,
      longitude: 32.8377803,
      address:
        'Emniyet, Ankara Büyükşehir Belediyesi, Hipodrom Cd. No:06560, 06560 Yenimahalle/Ankara, Türkiye',
      order: 3,
    },
    {
      id: 4,
      latitude: 39.9582303,
      longitude: 32.8172487,
      address: 'Işınlar, İvedik Cd. 46/5, 06170 Yenimahalle/Ankara, Türkiye',
      order: 4,
    },
    {
      id: 5,
      latitude: 39.9620885,
      longitude: 32.8110612,
      address: 'Gayret, İvedik Cd. No: 50, 06170 Yenimahalle/Ankara, Türkiye',
      order: 5,
    },
    {
      id: 6,
      latitude: 39.9569244,
      longitude: 32.7950965,
      address:
        '25 Mart, Ahmet Ayık Park, Çınardibi Cd. 4 B, 06200 Yenimahalle/Ankara, Türkiye',
      order: 6,
    },
    {
      id: 7,
      latitude: 39.945225,
      longitude: 32.7375667,
      address:
        'Bahçekapı, Eşref Bitlis Kışlası, Fatih Sultan Mehmet Blv, 06797 Etimesgut/Ankara, Türkiye',
      order: 7,
    },
    {
      id: 8,
      latitude: 39.9795356,
      longitude: 32.65884,
      address:
        'Yeni Batı, İstanbul Yolu Metro İstasyonu, 06370 Yenimahalle/Ankara, Türkiye',
      order: 8,
    },
    {
      id: 9,
      latitude: 40.0689064,
      longitude: 32.5902646,
      address:
        'Saray OSB, Hazerfan Ahmet Çelebi Bulvarı 3H9Q+7W No:23, 06980 Kahramankazan/Ankara, Türkiye End Address',
      order: 9,
    },
  ],
  isLoading: false,
  state: 'initial',
  user: null,
  error: null,
  errors: null,
};

export const mapSlice = createSlice({
  name: 'map',
  initialState,
  reducers: {
    addWaypoint: (state: MapState, action: PayloadAction<Waypoint>) => {
      state.wayPoints.push(action.payload);
    },
    reOrder: (state: MapState, action: PayloadAction<Waypoint[]>) => {
      state.wayPoints = action.payload;
    },
    updateLocation: (
      state: MapState,
      action: PayloadAction<{ id: number; latitude: number; longitude: number }>
    ) => {
      console.log('Updating location for waypoint:', action.payload);

      const { id, latitude, longitude } = action.payload;
      const waypoint = state.wayPoints.find((wp) => wp.id === id);
      console.log(waypoint, 'waypoint found');

      if (waypoint) {
        waypoint.latitude = latitude;
        waypoint.longitude = longitude;
      }
    },
    setSelectedWaypointId: (
      state: MapState,
      action: PayloadAction<number | undefined>
    ) => {
      state.selectedWaypointId = action.payload;
    },
    deleteWaypoint: (state: MapState, action: PayloadAction<Waypoint>) => {
      const idToDelete = action.payload.id;
      state.wayPoints = state.wayPoints.filter((wp) => wp.id !== idToDelete);
      if (state.selectedWaypointId === idToDelete) {
        state.selectedWaypointId = undefined;
      }
    },
  },
  extraReducers: (builder) => {},
});

export const {
  addWaypoint,
  reOrder,
  updateLocation,
  setSelectedWaypointId,
  deleteWaypoint,
} = mapSlice.actions;

export default mapSlice.reducer;
