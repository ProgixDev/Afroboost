import { IsArray, IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

const SOURCES = ['phone', 'social', 'walkIn', 'referral', 'import'] as const;

export class CreateCustomerDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsIn(SOURCES)
  @IsOptional()
  source?: (typeof SOURCES)[number];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateCustomerDto extends CreateCustomerDto {
  @IsString()
  @IsOptional()
  declare name: string;
}
