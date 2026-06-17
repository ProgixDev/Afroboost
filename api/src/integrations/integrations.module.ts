import { Global, Module } from '@nestjs/common';
import { ConnectedAccountsService } from './connected-accounts.service';

/** Shared OAuth connection store, used by Meta / Google / email modules. */
@Global()
@Module({
  providers: [ConnectedAccountsService],
  exports: [ConnectedAccountsService],
})
export class IntegrationsModule {}
