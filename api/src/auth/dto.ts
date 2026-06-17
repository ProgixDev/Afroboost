import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';

const BUSINESS_TYPES = ['restaurant', 'bar', 'grocery', 'solo'] as const;

/** Provision a tenant + owner after a Supabase sign-up. */
export class RegisterOwnerDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  businessName!: string;

  @IsIn(BUSINESS_TYPES)
  @IsOptional()
  type?: (typeof BUSINESS_TYPES)[number];

  @IsString()
  @IsOptional()
  phone?: string;
}

export class PhoneStartDto {
  @IsString()
  @Length(8, 20)
  phone!: string;
}

export class PhoneVerifyDto {
  @IsString()
  @Length(8, 20)
  phone!: string;

  @IsString()
  @Length(4, 8)
  code!: string;
}

export class AdminLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}
