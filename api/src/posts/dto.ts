import {
  IsArray,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
} from 'class-validator';

const CHANNELS = ['facebook', 'instagram'] as const;
const STATUS = ['draft', 'queued', 'scheduled', 'published', 'failed'] as const;

export class CreatePostDto {
  @IsString()
  caption!: string;

  @IsString()
  @IsOptional()
  mediaUrl?: string;

  @IsArray()
  @IsIn(CHANNELS, { each: true })
  @IsOptional()
  channels?: (typeof CHANNELS)[number][];

  @IsString()
  @IsOptional()
  template?: string;
}

export class UpdatePostDto {
  @IsString()
  @IsOptional()
  caption?: string;

  @IsString()
  @IsOptional()
  mediaUrl?: string;

  @IsArray()
  @IsIn(CHANNELS, { each: true })
  @IsOptional()
  channels?: (typeof CHANNELS)[number][];

  @IsIn(STATUS)
  @IsOptional()
  status?: (typeof STATUS)[number];
}

export class SchedulePostDto {
  @IsISO8601()
  scheduledAt!: string;
}

export class ListPostsQuery {
  @IsIn(STATUS)
  @IsOptional()
  status?: (typeof STATUS)[number];
}
