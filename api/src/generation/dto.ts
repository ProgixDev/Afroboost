import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

const MEDIA = ['image', 'video'] as const;
const CHANNELS = ['facebook', 'instagram'] as const;
const TONES = ['warm', 'pro', 'casual', 'direct'] as const;

export class GenerateContentDto {
  @IsString()
  @MinLength(3)
  prompt!: string;

  /** Which kind of media to generate. 'video' uses the mock service. */
  @IsIn(MEDIA)
  @IsOptional()
  media: (typeof MEDIA)[number] = 'image';

  @IsIn(TONES)
  @IsOptional()
  tone?: (typeof TONES)[number];

  @IsString()
  @IsOptional()
  template?: string;

  @IsArray()
  @IsIn(CHANNELS, { each: true })
  @IsOptional()
  channels?: (typeof CHANNELS)[number][];

  /** Create a draft post linked to the generation result. Defaults true. */
  @IsBoolean()
  @IsOptional()
  createDraft?: boolean = true;
}
