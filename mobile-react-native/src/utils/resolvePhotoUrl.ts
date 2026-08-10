import { API_ORIGIN } from 'constants/apiUrl';

export const resolvePhotoUrl = (photo?: string | null): string | null => {
  const value = photo?.trim();
  if (!value) return null;
  if (/^(https?:|data:|file:)/i.test(value)) return value;

  return `${API_ORIGIN}/${value.replace(/^\/+/, '')}`;
};

export default resolvePhotoUrl;
