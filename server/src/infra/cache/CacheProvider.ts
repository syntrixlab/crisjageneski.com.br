export interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string | string[]): Promise<void>;
  wrap<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T>;
}
