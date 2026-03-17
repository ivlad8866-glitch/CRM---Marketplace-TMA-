import { createHash } from 'crypto';

/**
 * Generate session fingerprint from user agent and IP subnet.
 * IPv4: uses /24 subnet. IPv6: uses first 3 groups.
 */
export function computeFingerprint(userAgent?: string, ip?: string): string | undefined {
  if (!userAgent || !ip) return undefined;
  const subnet = ip.includes(':')
    ? ip.split(':').slice(0, 3).join(':')
    : ip.split('.').slice(0, 3).join('.');
  return createHash('sha256').update(userAgent + subnet).digest('hex');
}
