import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { StripeWebhookController } from './webhook.controller';

@Module({
  controllers: [BillingController, StripeWebhookController],
  providers: [StripeService, BillingService],
  exports: [BillingService],
})
export class BillingModule {}
