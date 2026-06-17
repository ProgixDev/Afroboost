import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyReply } from 'fastify';
import { OwnerAuthGuard } from '../common/guards/owner-auth.guard';
import { CurrentTenant } from '../common/decorators/current-owner.decorator';
import { MetaService } from './meta.service';

/** Meta OAuth connect/callback + webhook. Routes under /api/integrations/meta. */
@Controller('integrations/meta')
export class MetaController {
  constructor(
    private readonly meta: MetaService,
    private readonly config: ConfigService,
  ) {}

  /** Owner starts the connect flow; returns the Facebook OAuth dialog URL. */
  @UseGuards(OwnerAuthGuard)
  @Get('connect')
  connect(@CurrentTenant() tenantId: string) {
    return { url: this.meta.getAuthUrl(tenantId) };
  }

  /** OAuth redirect target (state carries the tenantId). */
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() reply: FastifyReply,
  ) {
    if (!code || !state) throw new BadRequestException('Missing code/state');
    await this.meta.handleCallback(code, state);
    const appUrl = this.config.get<string>('APP_URL', 'https://app.afroboost.ca');
    return reply.redirect(`${appUrl}/settings/accounts?connected=meta`);
  }

  /** Webhook verification handshake. */
  @Get('webhook')
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    const expected = this.config.get<string>('META_WEBHOOK_VERIFY_TOKEN');
    if (mode === 'subscribe' && token && token === expected) {
      return challenge;
    }
    throw new BadRequestException('Verification failed');
  }

  /** Webhook event receiver (page/IG change notifications). */
  @Post('webhook')
  receive() {
    // TODO(phase-6): handle comment/mention notifications for the inbox.
    return { received: true };
  }
}
