import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyReply } from 'fastify';
import { OwnerAuthGuard } from '../common/guards/owner-auth.guard';
import { CurrentTenant } from '../common/decorators/current-owner.decorator';
import { GoogleOAuthService } from './google-oauth.service';

/** Google OAuth connect/callback. Routes under /api/integrations/google. */
@Controller('integrations/google')
export class GoogleController {
  constructor(
    private readonly google: GoogleOAuthService,
    private readonly config: ConfigService,
  ) {}

  /** service = 'google' (Business reviews) | 'gmail' (email). */
  @UseGuards(OwnerAuthGuard)
  @Get('connect')
  connect(
    @CurrentTenant() tenantId: string,
    @Query('service') service: 'google' | 'gmail' = 'google',
  ) {
    if (service !== 'google' && service !== 'gmail') {
      throw new BadRequestException('Invalid service');
    }
    return { url: this.google.getAuthUrl(tenantId, service) };
  }

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() reply: FastifyReply,
  ) {
    if (!code || !state) throw new BadRequestException('Missing code/state');
    await this.google.handleCallback(code, state);
    const appUrl = this.config.get<string>('APP_URL', 'https://app.afroboost.ca');
    return reply.redirect(`${appUrl}/settings/accounts?connected=google`);
  }
}
