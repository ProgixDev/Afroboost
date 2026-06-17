import {
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

const TYPES = ['restaurant', 'bar', 'grocery', 'solo'] as const;
const TONES = ['warm', 'pro', 'casual', 'direct'] as const;
const LANGUAGES = ['fr', 'en', 'creole', 'lingala', 'soussou'] as const;

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsIn(TYPES)
  @IsOptional()
  type?: (typeof TYPES)[number];

  @IsString()
  @IsOptional()
  address?: string;

  @IsIn(TONES)
  @IsOptional()
  tone?: (typeof TONES)[number];

  @IsArray()
  @IsIn(LANGUAGES, { each: true })
  @IsOptional()
  languages?: (typeof LANGUAGES)[number][];

  /** { mon..sun: "9-17" } */
  @IsObject()
  @IsOptional()
  hours?: Record<string, string>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  services?: string[];
}
