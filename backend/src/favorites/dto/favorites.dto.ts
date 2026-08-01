import { IsUUID } from 'class-validator';

export class ToggleFavoriteWaypointDto {
  @IsUUID('4', { message: 'waypointId must be a UUID' })
  waypointId!: string;
}

export class ToggleFavoriteRoadDto {
  @IsUUID('4', { message: 'roadId must be a UUID' })
  roadId!: string;
}
