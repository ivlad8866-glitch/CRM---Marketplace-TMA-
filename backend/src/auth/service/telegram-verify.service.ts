import { createHmac, timingSafeEqual } from 'crypto';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  is_bot?: boolean;
}

export interface VerifyResult {
  user: TelegramUser;
  authDate: number;
  hash: string;
  startParam?: string;
}

export class TelegramVerifyService {
  private readonly secretKey: Buffer;

  constructor(botToken: string) {
    this.secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  }

  verify(initData: string, ttlSeconds: number): VerifyResult {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) throw new Error('INVALID_INIT_DATA');

    // Build data check string
    const entries: string[] = [];
    params.forEach((value, key) => {
      if (key !== 'hash') entries.push(`${key}=${value}`);
    });
    entries.sort();
    const dataCheckString = entries.join('\n');

    // Compute and compare hash
    const computed = createHmac('sha256', this.secretKey).update(dataCheckString).digest('hex');

    const computedBuf = Buffer.from(computed, 'hex');
    const receivedBuf = Buffer.from(hash, 'hex');
    if (computedBuf.length !== receivedBuf.length || !timingSafeEqual(computedBuf, receivedBuf)) {
      throw new Error('INVALID_INIT_DATA');
    }

    // Check auth_date
    const authDate = Number(params.get('auth_date'));
    const now = Math.floor(Date.now() / 1000);
    if (authDate > now + 60) throw new Error('INVALID_INIT_DATA'); // future (with 60s tolerance)
    if (now - authDate > ttlSeconds) throw new Error('INIT_DATA_EXPIRED');

    // Parse user
    const userStr = params.get('user');
    if (!userStr) throw new Error('INVALID_INIT_DATA');
    const user: TelegramUser = JSON.parse(userStr);

    return {
      user,
      authDate,
      hash,
      startParam: params.get('start_param') || undefined,
    };
  }
}
