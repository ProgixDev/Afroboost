import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { OwnerAuthGuard } from '../common/guards/owner-auth.guard';
import { CurrentTenant } from '../common/decorators/current-owner.decorator';
import { GoogleOAuthService } from './google-oauth.service';

/** Google OAuth connect/callback. Routes under /api/integrations/google. */
@Controller('integrations/google')
export class GoogleController {
  constructor(private readonly google: GoogleOAuthService) {}

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
    const provider = state.split(':')[1] === 'gmail' ? 'gmail' : 'google';
    let status: 'success' | 'error';
    try {
      await this.google.handleCallback(code, state);
      status = 'success';
    } catch {
      status = 'error';
    }
    // Always redirect back to the app (deep link), forcing a real 302 so the
    // in-app browser follows it and closes. (Same pattern as the Meta callback.)
    return reply
      .status(302)
      .header('location', this.google.connectRedirect(provider, status))
      .send();
  }
}
