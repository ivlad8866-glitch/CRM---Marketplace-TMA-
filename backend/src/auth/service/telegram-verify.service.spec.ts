import { createHmac } from 'crypto';
import { TelegramVerifyService } from './telegram-verify.service';

describe('TelegramVerifyService', () => {
  const BOT_TOKEN = 'test:bot_token_for_testing';
  let service: TelegramVerifyService;

  beforeEach(() => {
    service = new TelegramVerifyService(BOT_TOKEN);
  });

  function createValidInitData(overrides: Record<string, string> = {}): string {
    const data: Record<string, string> = {
      auth_date: String(Math.floor(Date.now() / 1000)),
      user: JSON.stringify({ id: 123456, first_name: 'Test', username: 'testuser' }),
      ...overrides,
    };

    const secret = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const checkString = Object.keys(data)
      .sort()
      .map((k) => `${k}=${data[k]}`)
      .join('\n');
    const hash = createHmac('sha256', secret).update(checkString).digest('hex');

    return new URLSearchParams({ ...data, hash }).toString();
  }

  it('should verify valid initData', () => {
    const initData = createValidInitData();
    const result = service.verify(initData, 300);
    expect(result.user.id).toBe(123456);
    expect(result.user.first_name).toBe('Test');
  });

  it('should reject tampered hash', () => {
    const initData = createValidInitData();
    const tampered = initData.replace(/hash=[^&]+/, 'hash=deadbeef');
    expect(() => service.verify(tampered, 300)).toThrow('INVALID_INIT_DATA');
  });

  it('should reject expired auth_date', () => {
    const expired = String(Math.floor(Date.now() / 1000) - 600);
    const initData = createValidInitData({ auth_date: expired });
    expect(() => service.verify(initData, 300)).toThrow('INIT_DATA_EXPIRED');
  });

  it('should reject future auth_date', () => {
    const future = String(Math.floor(Date.now() / 1000) + 600);
    const initData = createValidInitData({ auth_date: future });
    expect(() => service.verify(initData, 300)).toThrow('INVALID_INIT_DATA');
  });
});
