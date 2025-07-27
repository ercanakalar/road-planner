import appConfig from 'constants/appConfig';

const REACT_APP_MAP_API_KEY = appConfig.mapApiKey;

export async function getAddressFromLatLng({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${latitude},${longitude}&destination=${latitude},${longitude}&waypoints=${latitude},${longitude}&key=${REACT_APP_MAP_API_KEY}`;

  const response = await fetch(url);
  const json = await response.json();
  const address = json.routes?.[0]?.legs?.[0]?.end_address || 'New Location';
  const parts = address.split(',');

  return {
    country: parts.at(-1)?.trim(),
    province: parts.at(-2)?.split(' ')?.at(-1)?.split('/')?.at(-1)?.trim(),
    district: parts.at(-2)?.split(' ')?.at(-1)?.split('/')?.at(-2)?.trim(),
    address,
  };
}
