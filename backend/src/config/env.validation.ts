import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

const JWT_DURATION = /^\d+$|^\d+(ms|s|m|h|d|w|y)$/;

const MIN_SECRET_LENGTH = 32;

const blankAsUnset = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  return value.trim() === '' ? undefined : value;
};

const asBoolean = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return value;
};

export class EnvironmentVariables {
  @IsEnum(NodeEnv, {
    message: `NODE_ENV must be one of: ${Object.values(NodeEnv).join(', ')}`,
  })
  @IsOptional()
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  @IsNotEmpty()
  @Matches(/^postgres(ql)?:\/\//, {
    message: 'DATABASE_URL must be a postgresql:// connection string',
  })
  DATABASE_URL!: string;

  @IsString()
  @MinLength(MIN_SECRET_LENGTH, {
    message: `ACCESS_KEY must be at least ${MIN_SECRET_LENGTH} characters. Generate one with: openssl rand -base64 48`,
  })
  ACCESS_KEY!: string;

  @IsString()
  @MinLength(MIN_SECRET_LENGTH, {
    message: `REFRESH_KEY must be at least ${MIN_SECRET_LENGTH} characters. Generate one with: openssl rand -base64 48`,
  })
  REFRESH_KEY!: string;

  @Matches(JWT_DURATION, {
    message:
      'ACCESS_EXPIRES_IN must be a duration such as "15m" or a number of seconds',
  })
  @IsOptional()
  ACCESS_EXPIRES_IN: string = '15m';

  @Matches(JWT_DURATION, {
    message:
      'REFRESH_EXPIRES_IN must be a duration such as "7d" or a number of seconds',
  })
  @IsOptional()
  REFRESH_EXPIRES_IN: string = '7d';

  @IsString()
  @MinLength(MIN_SECRET_LENGTH, {
    message: `ROAD_SHARE_KEY must be at least ${MIN_SECRET_LENGTH} characters. Generate one with: openssl rand -base64 48`,
  })
  ROAD_SHARE_KEY!: string;

  @Matches(JWT_DURATION, {
    message:
      'ROAD_SHARE_EXPIRE_IN must be a duration such as "7d" or a number of seconds',
  })
  @IsOptional()
  ROAD_SHARE_EXPIRE_IN: string = '7d';

  @IsUrl({ require_tld: false, require_protocol: true })
  FRONTEND_URL!: string;

  @IsString()
  @IsOptional()
  CORS_ORIGINS: string = '*';

  @IsString()
  @IsNotEmpty()
  MAIL_HOST!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  MAIL_PORT: number = 587;

  @IsString()
  @IsNotEmpty()
  MAIL_USERNAME!: string;

  @IsString()
  @IsNotEmpty()
  MAIL_PASSWORD!: string;

  @IsString()
  @IsNotEmpty()
  MAIL_FROM!: string;

  @Transform(asBoolean)
  @IsBoolean()
  @IsOptional()
  MAIL_TLS_REJECT_UNAUTHORIZED: boolean = true;

  @Transform(blankAsUnset)
  @IsString()
  @IsOptional()
  GOOGLE_CLIENT_ID?: string;

  @Transform(blankAsUnset)
  @IsString()
  @IsOptional()
  GOOGLE_CLIENT_SECRET?: string;

  @Transform(blankAsUnset)
  @IsUrl({ require_tld: false, require_protocol: true })
  @IsOptional()
  GOOGLE_REDIRECT_URL?: string;

  @Transform(blankAsUnset)
  @IsString()
  @IsOptional()
  GOOGLE_SCOPES_API?: string;

  @Transform(blankAsUnset)
  @IsUrl({ require_tld: false, require_protocol: true })
  @IsOptional()
  GOOGLE_OAUTH2_USERINFO_URL?: string;

  @Transform(blankAsUnset)
  @IsIn(['online', 'offline'])
  @IsOptional()
  GOOGLE_OAUTH2_ACCESS_TYPE?: string;

  @Transform(blankAsUnset)
  @IsIn(['none', 'consent', 'select_account'])
  @IsOptional()
  GOOGLE_OAUTH2_PROMPT?: string;
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
    exposeDefaultValues: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
    whitelist: false,
  });

  if (errors.length > 0) {
    const details = errors
      .map((error) => {
        const constraints = Object.values(error.constraints ?? {});
        return `  - ${error.property}: ${constraints.join('; ') || 'invalid'}`;
      })
      .sort()
      .join('\n');

    throw new Error(
      `Invalid environment configuration:\n${details}\n\n` +
        'See .env.example for the full list of variables.',
    );
  }

  return validated;
}
