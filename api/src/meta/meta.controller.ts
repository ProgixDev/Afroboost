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

  /**
   * Owner starts the connect flow; returns the Facebook OAuth dialog URL.
   * `platform` (default mobile) decides where the user is sent back afterwards:
   * the app deep link (mobile) or the web console.
   */
  @UseGuards(OwnerAuthGuard)
  @Get('connect')
  connect(
    @CurrentTenant() tenantId: string,
    @Query('platform') platform?: string,
  ) {
    const target = platform === 'web' ? 'web' : 'mobile';
    return { url: this.meta.getAuthUrl(tenantId, target) };
  }

  /**
   * OAuth redirect target. `state` carries the tenant id + originating platform.
   * Always redirects back to the client (success or error) rather than throwing,
   * so the in-app browser closes and returns the user to the app cleanly.
   */
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() reply: FastifyReply,
  ) {
    if (!code || !state) throw new BadRequestException('Missing code/state');
    const { tenantId, platform } = this.meta.parseState(state);
    let target: string;
    try {
      await this.meta.handleCallback(code, tenantId);
      target = this.meta.connectRedirect(platform, 'success');
    } catch {
      target = this.meta.connectRedirect(platform, 'error');
    }
    // Force a real 302 with the Location header. (reply.redirect() under Nest's
    // @Res() can leave the status at 200, which a browser won't follow.)
    return reply.status(302).header('location', target).send();
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
