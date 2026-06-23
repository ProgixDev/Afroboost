import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  RawBodyRequest,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyReply, FastifyRequest } from 'fastify';
import { OwnerAuthGuard } from '../common/guards/owner-auth.guard';
import { CurrentTenant } from '../common/decorators/current-owner.decorator';
import { MetaService } from './meta.service';
import { MetaMessagingService } from './meta-messaging.service';

/** Meta OAuth connect/callback + webhook. Routes under /api/integrations/meta. */
@Controller('integrations/meta')
export class MetaController {
  constructor(
    private readonly meta: MetaService,
    private readonly messaging: MetaMessagingService,
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

  /**
   * Webhook event receiver: inbound Messenger + Instagram Direct messages.
   * Verifies the X-Hub-Signature-256 header against the raw body before parsing.
   * Always returns 200 quickly so Meta does not retry/disable the subscription.
   */
  @Post('webhook')
  async receive(
    @Req() req: RawBodyRequest<FastifyRequest>,
    @Headers('x-hub-signature-256') signature: string,
  ) {
    if (!this.messaging.verifySignature(req.rawBody, signature)) {
      throw new BadRequestException('Invalid signature');
    }
    await this.messaging.handleWebhook(req.body);
    return { received: true };
  }
}
