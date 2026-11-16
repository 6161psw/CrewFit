import { plainToInstance, Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUrl, validateSync } from 'class-validator';

const empty = (v: unknown) => v === undefined || v === null || v === '';
const num = (d: number) => ({ value }: { value: unknown }) => (empty(value) ? d : Number(value));
const bool = (d: boolean) => ({ value }: { value: unknown }) => (empty(value) ? d : value === true || value === 'true');

export class Env {
  @IsIn(['development', 'production', 'test'])
  NODE_ENV: 'development' | 'production' | 'test' = 'development';

  @Transform(num(3000))
  @IsInt()
  PORT = 3000;

  @IsString()
  DATABASE_URL: string;

  @IsUrl({ require_tld: false })
  API_URL: string;

  @IsUrl({ require_tld: false })
  WEB_URL: string;

  @IsUrl({ require_tld: false })
  ADMIN_URL: string;

  @IsOptional()
  @IsString()
  CORS_ALLOWED_ORIGINS = '';

  @IsString()
  JWT_SECRET: string;

  @IsString()
  JWT_EXPIRES_IN = '1h';

  @Transform(num(30))
  @IsInt()
  REFRESH_TOKEN_EXPIRE_DAYS = 30;

  @IsString()
  GOOGLE_CLIENT_ID: string;

  @IsString()
  GOOGLE_CLIENT_SECRET: string;

  @IsUrl({ require_tld: false })
  GOOGLE_CALLBACK_URL: string;

  @IsOptional()
  @IsString()
  GOOGLE_MOBILE_CLIENT_IDS = '';

  @IsIn(['lax', 'strict', 'none'])
  COOKIE_SAMESITE: 'lax' | 'strict' | 'none' = 'lax';

  @Transform(bool(false))
  @IsBoolean()
  COOKIE_SECURE = false;

  @IsOptional()
  @IsString()
  SUPER_ADMIN_EMAILS = '';

  @Transform(bool(false))
  @IsBoolean()
  DEV_LOGIN_ENABLED = false;

  @IsString()
  UPLOAD_DIR = './uploads';

  @Transform(num(10))
  @IsInt()
  MAX_UPLOAD_MB = 10;

  @Transform(bool(true))
  @IsBoolean()
  SWAGGER_ENABLED = true;
}

export function validateEnv(raw: Record<string, unknown>): Env {
  const env = plainToInstance(Env, raw, { exposeDefaultValues: true });
  const errors = validateSync(env, { skipMissingProperties: false });
  if (errors.length) {
    throw new Error(
      'Invalid env: ' + errors.map((e) => `${e.property} (${Object.values(e.constraints ?? {}).join(', ')})`).join('; '),
    );
  }
  return env;
}

export const csv = (v: string) =>
  v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
