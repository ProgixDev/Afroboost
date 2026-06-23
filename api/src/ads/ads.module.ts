import { Module } from '@nestjs/common';
import { MetaModule } from '../meta/meta.module';
import { AdsService } from './ads.service';
import { AdsController } from './ads.controller';

/** Meta Ads (Marketing API) campaign manager. */
@Module({
  imports: [MetaModule],
  controllers: [AdsController],
  providers: [AdsService],
  exports: [AdsService],
})
export class AdsModule {}
