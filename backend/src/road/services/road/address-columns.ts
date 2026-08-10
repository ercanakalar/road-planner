import { AddressInputDto } from 'src/road/dto/road.dto';

export function addressColumns(address: AddressInputDto | undefined): {
  country: string | null;
  province: string | null;
  district: string | null;
  address: string;
} {
  return {
    country: address?.country ?? null,
    province: address?.province ?? null,
    district: address?.district ?? null,
    address: address?.address ?? '',
  };
}
