import {
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class AssignPermitDto {
  @IsUUID('4', { message: 'userId must be a UUID' })
  userId!: string;

  @IsUUID('4', { message: 'permitId must be a UUID' })
  permitId!: string;
}

export class UpdatePermitDto {
  @IsString()
  @MaxLength(500)
  @IsOptional()
  description?: string;

  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true, message: 'each permissionId must be a UUID' })
  @IsOptional()
  permissionIds?: string[];
}
