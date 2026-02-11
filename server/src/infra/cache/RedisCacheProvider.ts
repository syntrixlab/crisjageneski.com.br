import Redis from 'ioredis';
import { CacheProvider } from './CacheProvider';

export class RedisCacheProvider implements CacheProvider {
  private client: Redis;
  private prefix: string;
  private fallbackOnFailure: boolean;

  constructor(url: string, prefix: string, fallbackOnFailure = true) {
    this.client = new Redis(url, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true
    });
    this.prefix = prefix;
    this.fallbackOnFailure = fallbackOnFailure;

    this.client.on('error', (err) => {
      if (this.fallbackOnFailure) {
        // eslint-disable-next-line no-console
        console.warn('[cache] Redis error, using no-op fallback', err.message);
      } else {
        // eslint-disable-next-line no-console
        console.error('[cache] Redis error', err);
      }
    });
  }

  private key(key: string) {
    return `${this.prefix}:${key}`;
  }

  private handleError(err: unknown) {
    if (!this.fallbackOnFailure) {
      throw err;
    }
    // eslint-disable-next-line no-console
    console.warn('[cache] Redis unavailable, skipping cache', err);
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.client.get(this.key(key));
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      this.handleError(err);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    try {
      await this.client.set(this.key(key), JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.handleError(err);
    }
  }

  async del(key: string | string[]): Promise<void> {
    try {
      const keys = Array.isArray(key) ? key.map((k) => this.key(k)) : [this.key(key)];
      if (keys.length) {
        await this.client.del(keys);
      }
    } catch (err) {
      this.handleError(err);
    }
  }

  async wrap<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached) return cached;

    const value = await fn();
    await this.set(key, value, ttlSeconds);
    return value;
  }
}
