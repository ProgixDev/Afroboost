import {
  IsIn,
  IsInt,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

// Meta campaign objectives (Outcome-Driven Ad Experiences naming).
const OBJECTIVES = [
  'OUTCOME_TRAFFIC',
  'OUTCOME_ENGAGEMENT',
  'OUTCOME_LEADS',
  'OUTCOME_SALES',
  'OUTCOME_AWARENESS',
  'OUTCOME_APP_PROMOTION',
] as const;

const STATUS = ['ACTIVE', 'PAUSED'] as const;

export class SelectAdAccountDto {
  /** The Meta ad account id, e.g. "act_123456789". */
  @IsString()
  adAccountId!: string;
}

export class CreateCampaignDto {
  @IsString()
  name!: string;

  @IsIn(OBJECTIVES)
  objective!: (typeof OBJECTIVES)[number];

  /** Daily budget in cents. Optional when budget is set at the ad-set level. */
  @IsInt()
  @Min(100)
  @IsOptional()
  dailyBudget?: number;
}

export class CreateAdSetDto {
  @IsString()
  campaignId!: string; // our ad_campaigns.id

  @IsString()
  name!: string;

  @IsInt()
  @Min(100)
  dailyBudget!: number; // cents

  @IsString()
  @IsOptional()
  optimizationGoal?: string;

  @IsString()
  @IsOptional()
  billingEvent?: string;

  /** Raw Meta targeting spec (geo, age, interests, etc.). */
  @IsObject()
  @IsOptional()
  targeting?: Record<string, unknown>;

  @IsISO8601()
  @IsOptional()
  startTime?: string;

  @IsISO8601()
  @IsOptional()
  endTime?: string;
}

export class CreateAdDto {
  @IsString()
  adSetId!: string; // our ad_sets.id

  @IsString()
  name!: string;

  /** Promote an existing published page post (its Meta object id). */
  @IsString()
  @IsOptional()
  pagePostId?: string;

  /** Our posts.id, recorded for traceability when promoting a generated post. */
  @IsString()
  @IsOptional()
  postId?: string;
}

export class UpdateStatusDto {
  @IsIn(STATUS)
  status!: (typeof STATUS)[number];
}

export class InsightsQuery {
  @IsIn(['account', 'campaign', 'adset', 'ad'])
  @IsOptional()
  level?: 'account' | 'campaign' | 'adset' | 'ad';

  @IsISO8601()
  @IsOptional()
  since?: string;

  @IsISO8601()
  @IsOptional()
  until?: string;
}
