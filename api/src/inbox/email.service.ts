import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { GoogleOAuthService } from '../google/google-oauth.service';

const GMAIL = 'https://gmail.googleapis.com/gmail/v1/users/me';

/**
 * Email sending. Gmail is implemented via the Gmail API; Outlook (Microsoft
 * Graph) is stubbed pending the Microsoft OAuth wiring (Phase 6 follow-up).
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly google: GoogleOAuthService) {}

  async sendGmail(tenantId: string, to: string, subject: string, body: string) {
    const token = await this.google.getAccessToken(tenantId, 'gmail');
    const mime =
      `To: ${to}\r\n` +
      `Subject: ${subject}\r\n` +
      `Content-Type: text/plain; charset="UTF-8"\r\n\r\n` +
      body;
    const raw = Buffer.from(mime)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await fetch(`${GMAIL}/messages/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    });
    if (!res.ok) {
      this.logger.error(`Gmail send failed: ${res.status} ${await res.text()}`);
      throw new ServiceUnavailableException('Failed to send email');
    }
    return (await res.json()) as { id: string };
  }

  // TODO(phase-6): implement Outlook send via Microsoft Graph /me/sendMail.
  async sendOutlook(): Promise<never> {
    throw new ServiceUnavailableException('Outlook email is not yet wired');
  }
}
