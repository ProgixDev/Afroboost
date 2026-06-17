import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
// Runtime value comes from 'stripe' (CJS). The rich resource type namespace
// lives in the core declaration; import it type-only (erased at build) so we
// get Stripe.Event/Invoice/etc. under `module: commonjs` resolution.
import type { Stripe as S } from 'stripe/cjs/stripe.core.js';

type Plan = 'decouverte' | 'performance' | 'premium';

/** Thin wrapper around the Stripe SDK with lazy init + plan→price mapping. */
@Injectable()
export class StripeService {
  private client?: S;

  constructor(private readonly config: ConfigService) {}

  get api(): S {
    if (!this.client) {
      const key = this.config.get<string>('STRIPE_SECRET_KEY');
      if (!key) throw new ServiceUnavailableException('STRIPE_SECRET_KEY is not configured');
      this.client = new Stripe(key);
    }
    return this.client;
  }

  priceIdFor(plan: Plan): string {
    const map: Record<Plan, string | undefined> = {
      decouverte: this.config.get('STRIPE_PRICE_DECOUVERTE'),
      performance: this.config.get('STRIPE_PRICE_PERFORMANCE'),
      premium: this.config.get('STRIPE_PRICE_PREMIUM'),
    };
    const id = map[plan];
    if (!id) throw new ServiceUnavailableException(`No Stripe price for plan ${plan}`);
    return id;
  }

  async ensureCustomer(
    tenantId: string,
    email: string,
    name: string,
    existingId?: string | null,
  ): Promise<string> {
    if (existingId) return existingId;
    const customer = await this.api.customers.create({
      email,
      name,
      metadata: { tenantId },
    });
    return customer.id;
  }

  createCheckoutSession(params: {
    customerId: string;
    priceId: string;
    tenantId: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    return this.api.checkout.sessions.create({
      mode: 'subscription',
      customer: params.customerId,
      line_items: [{ price: params.priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      subscription_data: { metadata: { tenantId: params.tenantId } },
      metadata: { tenantId: params.tenantId },
    });
  }

  createBillingPortal(customerId: string, returnUrl: string) {
    return this.api.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  constructEvent(payload: Buffer, signature: string): S.Event {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret) throw new ServiceUnavailableException('STRIPE_WEBHOOK_SECRET is not configured');
    return this.api.webhooks.constructEvent(payload, signature, secret);
  }
}
