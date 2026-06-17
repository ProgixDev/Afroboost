import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface CaptionInput {
  prompt: string;
  tone?: string;
  businessName?: string;
  language?: string;
}

/** OpenAI-backed text + image generation (Phase 3). */
@Injectable()
export class OpenAiService {
  private client?: OpenAI;

  constructor(private readonly config: ConfigService) {}

  private get api(): OpenAI {
    if (!this.client) {
      const apiKey = this.config.get<string>('OPENAI_API_KEY');
      if (!apiKey) {
        throw new ServiceUnavailableException('OPENAI_API_KEY is not configured');
      }
      this.client = new OpenAI({ apiKey });
    }
    return this.client;
  }

  async generateCaption(input: CaptionInput): Promise<string> {
    const model = this.config.get<string>('OPENAI_TEXT_MODEL', 'gpt-4o-mini');
    const lang = input.language ?? 'fr';
    const tone = input.tone ?? 'warm';
    const system =
      `You are a social media copywriter for "${input.businessName ?? 'a local business'}". ` +
      `Write a single engaging caption in language "${lang}" with a ${tone} tone. ` +
      `Keep it under 280 characters, add 2-4 relevant hashtags, no preamble.`;

    const res = await this.api.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: input.prompt },
      ],
      max_tokens: 200,
    });
    return res.choices[0]?.message?.content?.trim() ?? '';
  }

  /** Generic text completion (used by weekly reports). */
  async complete(system: string, user: string): Promise<string> {
    const model = this.config.get<string>('OPENAI_TEXT_MODEL', 'gpt-4o-mini');
    const res = await this.api.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens: 500,
    });
    return res.choices[0]?.message?.content?.trim() ?? '';
  }

  async generateImage(
    prompt: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    const model = this.config.get<string>('OPENAI_IMAGE_MODEL', 'gpt-image-1');
    const res = await this.api.images.generate({
      model,
      prompt,
      size: '1024x1024',
      n: 1,
    });
    const b64 = res.data?.[0]?.b64_json;
    if (!b64) throw new ServiceUnavailableException('No image returned');
    return { buffer: Buffer.from(b64, 'base64'), contentType: 'image/png' };
  }
}
