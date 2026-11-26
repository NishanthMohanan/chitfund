import { Injectable } from '@nestjs/common';

const WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS = 20;

/** In-memory limiter for sign-in attempts per client IP (single local process). */
@Injectable()
export class LoginRateLimiter {
  private readonly attempts = new Map<string, number[]>();

  /** Records an attempt and returns false when the IP is over the limit. */
  allow(key: string, now = Date.now()): boolean {
    const recent = (this.attempts.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
    recent.push(now);
    this.attempts.set(key, recent);
    return recent.length <= MAX_ATTEMPTS;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}
