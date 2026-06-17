import {
  BadRequestException,
  Controller,
  Headers,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { StripeService } from './stripe.service';
import { BillingService } from './billing.service';

/**
 * Stripe webhook receiver. Requires the raw request body (enabled globally via
 * `rawBody: true`) to verify the signature. Mounted at /api/billing/webhook —
 * register this exact URL in the Stripe dashboard.
 */
@Controller('billing/webhook')
export class StripeWebhookController {
  constructor(
    private readonly stripe: StripeService,
    private readonly billing: BillingService,
  ) {}

  @Post()
  async handle(
    @Req() req: RawBodyRequest<FastifyRequest>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!req.rawBody) throw new BadRequestException('Missing raw body');
    if (!signature) throw new BadRequestException('Missing stripe-signature');

    let event;
    try {
      event = this.stripe.constructEvent(req.rawBody, signature);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'bad signature';
      throw new BadRequestException(`Webhook signature failed: ${msg}`);
    }

    await this.billing.handleEvent(event);
    return { received: true };
  }
}
