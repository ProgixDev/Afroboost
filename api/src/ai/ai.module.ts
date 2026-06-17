import { Global, Module } from '@nestjs/common';
import { OpenAiService } from './openai.service';

/** Shared OpenAI access for generation, review drafting, weekly reports. */
@Global()
@Module({
  providers: [OpenAiService],
  exports: [OpenAiService],
})
export class AiModule {}
