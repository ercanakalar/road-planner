import {
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class AssignPermitDto {
  @IsUUID('4')
  userId!: string;

  @IsUUID('4')
  permitId!: string;
}

export class UpdatePermitDto {
  @IsString()
  @MaxLength(500)
  @IsOptional()
  description?: string;

  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  @IsOptional()
  permissionIds?: string[];
}
