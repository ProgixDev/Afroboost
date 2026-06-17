import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Phone verification via Prelude (https://prelude.so). Used for owner phone
 * OTP at signup. If PRELUDE_API_KEY is unset, the service runs in dev mode
 * and accepts the code "000000" so the flow is testable without an account.
 */
@Injectable()
export class PreludeService {
  private readonly logger = new Logger(PreludeService.name);
  private readonly base = 'https://api.prelude.dev/v2';

  constructor(private readonly config: ConfigService) {}

  private get apiKey(): string | undefined {
    return this.config.get<string>('PRELUDE_API_KEY');
  }

  /** Send an OTP to a phone number (E.164). */
  async startVerification(phone: string): Promise<{ devMode: boolean }> {
    if (!this.apiKey) {
      this.logger.warn(`Prelude dev mode — OTP for ${phone} is "000000"`);
      return { devMode: true };
    }
    const res = await fetch(`${this.base}/verification`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ target: { type: 'phone_number', value: phone } }),
    });
    if (!res.ok) {
      this.logger.error(`Prelude start failed: ${res.status} ${await res.text()}`);
      throw new ServiceUnavailableException('Could not send verification code');
    }
    return { devMode: false };
  }

  /** Check an OTP. Returns true if valid. */
  async checkVerification(phone: string, code: string): Promise<boolean> {
    if (!this.apiKey) {
      return code === '000000';
    }
    const res = await fetch(`${this.base}/verification/check`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        target: { type: 'phone_number', value: phone },
        code,
      }),
    });
    if (!res.ok) {
      this.logger.error(`Prelude check failed: ${res.status} ${await res.text()}`);
      throw new ServiceUnavailableException('Could not verify code');
    }
    const data = (await res.json()) as { status?: string };
    return data.status === 'success';
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }
}
