import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Stripe as S } from 'stripe/cjs/stripe.core.js';
import { SupabaseService } from '../supabase/supabase.service';
import { StripeService } from './stripe.service';

type Plan = 'decouverte' | 'performance' | 'premium';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly stripe: StripeService,
    private readonly config: ConfigService,
  ) {}

  // ── Owner-facing ────────────────────────────────────────────────────────

  async checkout(tenantId: string, plan: Plan): Promise<{ url: string }> {
    const db = this.supabase.admin;
    const { data: owner } = await db
      .from('owners')
      .select('email, name')
      .eq('tenant_id', tenantId)
      .maybeSingle();
    const { data: tenant } = await db
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single();

    const { data: sub } = await db
      .from('subscriptions')
      .select('id, stripe_customer_id')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    const customerId = await this.stripe.ensureCustomer(
      tenantId,
      owner?.email ?? 'owner@example.com',
      tenant?.name ?? 'AfroBoost tenant',
      sub?.stripe_customer_id,
    );

    // Persist the customer mapping so webhooks can resolve the tenant.
    await db
      .from('subscriptions')
      .upsert(
        { id: sub?.id, tenant_id: tenantId, plan, stripe_customer_id: customerId },
        { onConflict: 'id' },
      );

    const appUrl = this.config.get<string>('APP_URL', 'https://app.afroboost.ca');
    const session = await this.stripe.createCheckoutSession({
      customerId,
      priceId: this.stripe.priceIdFor(plan),
      tenantId,
      successUrl: this.config.get('BILLING_SUCCESS_URL', `${appUrl}/billing/success`),
      cancelUrl: this.config.get('BILLING_CANCEL_URL', `${appUrl}/billing/cancel`),
    });
    if (!session.url) throw new BadRequestException('Stripe did not return a URL');
    return { url: session.url };
  }

  async portal(tenantId: string): Promise<{ url: string }> {
    const { data: sub } = await this.supabase.admin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (!sub?.stripe_customer_id) {
      throw new BadRequestException('No Stripe customer for this tenant');
    }
    const appUrl = this.config.get<string>('APP_URL', 'https://app.afroboost.ca');
    const session = await this.stripe.createBillingPortal(
      sub.stripe_customer_id,
      this.config.get('BILLING_PORTAL_RETURN_URL', `${appUrl}/settings/subscription`),
    );
    return { url: session.url };
  }

  async summary(tenantId: string) {
    const db = this.supabase.admin;
    const [{ data: subscription }, { data: invoices }] = await Promise.all([
      db.from('subscriptions').select('*').eq('tenant_id', tenantId).maybeSingle(),
      db
        .from('invoices')
        .select('id, number, amount, status, plan, issued_at, paid_at')
        .eq('tenant_id', tenantId)
        .order('issued_at', { ascending: false }),
    ]);
    return { subscription, invoices: invoices ?? [] };
  }

  // ── Webhook ─────────────────────────────────────────────────────────────

  async handleEvent(event: S.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.onCheckoutCompleted(event.data.object);
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this.onSubscriptionChange(event.data.object);
        break;
      case 'invoice.paid':
        await this.onInvoice(event.data.object, 'paid');
        break;
      case 'invoice.payment_failed':
        await this.onInvoice(event.data.object, 'failed');
        break;
      default:
        this.logger.debug(`Unhandled Stripe event: ${event.type}`);
    }
  }

  private async onCheckoutCompleted(session: S.Checkout.Session) {
    const tenantId = session.metadata?.tenantId;
    if (!tenantId) return;
    await this.supabase.admin
      .from('subscriptions')
      .update({
        status: 'active',
        stripe_subscription_id:
          typeof session.subscription === 'string' ? session.subscription : null,
        started_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId);
    await this.supabase.admin
      .from('tenants')
      .update({ status: 'active' })
      .eq('id', tenantId);
  }

  private async onSubscriptionChange(sub: S.Subscription) {
    const tenantId = await this.resolveTenant(sub.customer, sub.metadata?.tenantId);
    if (!tenantId) return;
    const status = sub.status === 'active' || sub.status === 'trialing'
      ? sub.status
      : sub.status === 'past_due'
        ? 'past_due'
        : 'canceled';
    await this.supabase.admin
      .from('subscriptions')
      .update({
        status,
        stripe_subscription_id: sub.id,
        canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
      })
      .eq('tenant_id', tenantId);
    await this.supabase.admin.from('tenants').update({ status }).eq('id', tenantId);
  }

  private async onInvoice(invoice: S.Invoice, kind: 'paid' | 'failed') {
    const tenantId = await this.resolveTenant(invoice.customer);
    if (!tenantId) return;
    const { data: sub } = await this.supabase.admin
      .from('subscriptions')
      .select('plan')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    await this.supabase.admin.from('invoices').upsert(
      {
        tenant_id: tenantId,
        number: invoice.number ?? invoice.id,
        amount: (invoice.amount_paid || invoice.amount_due || 0) / 100,
        status: kind === 'paid' ? 'paid' : 'failed',
        plan: (sub?.plan as Plan) ?? 'decouverte',
        issued_at: new Date((invoice.created ?? 0) * 1000).toISOString(),
        paid_at: kind === 'paid' ? new Date().toISOString() : null,
        stripe_invoice_id: invoice.id,
      },
      { onConflict: 'stripe_invoice_id' },
    );

    if (kind === 'failed') {
      await this.supabase.admin
        .from('tenants')
        .update({ status: 'past_due' })
        .eq('id', tenantId);
    }
  }

  /** Resolve our tenant from a Stripe customer (via our mapping, then metadata). */
  private async resolveTenant(
    customer: string | S.Customer | S.DeletedCustomer | null,
    metadataTenantId?: string,
  ): Promise<string | null> {
    if (metadataTenantId) return metadataTenantId;
    const customerId = typeof customer === 'string' ? customer : customer?.id;
    if (!customerId) return null;
    const { data } = await this.supabase.admin
      .from('subscriptions')
      .select('tenant_id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();
    return data?.tenant_id ?? null;
  }
}
