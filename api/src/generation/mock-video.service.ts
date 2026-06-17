import { Injectable, Logger } from '@nestjs/common';

/**
 * MOCK video generator. Real AI/video automation is deferred (see plan), so
 * this returns a deterministic placeholder asset after a short delay. It
 * implements the same shape a real generator will, so swapping it later is a
 * one-line change in GenerationProcessor.
 */
@Injectable()
export class MockVideoService {
  private readonly logger = new Logger(MockVideoService.name);

  async generate(prompt: string): Promise<{ url: string; mock: true }> {
    this.logger.log(`[mock] video generation for prompt: ${prompt.slice(0, 60)}`);
    await new Promise((r) => setTimeout(r, 1200));
    // Stable placeholder so the frontend has something to render.
    const seed = encodeURIComponent(prompt.slice(0, 24) || 'afroboost');
    return {
      url: `https://placehold.co/720x1280/1F8A55/FFFFFF/mp4?text=${seed}`,
      mock: true,
    };
  }
}
