import Redis from "ioredis";

// ==============================================================
// Unified Cache Interface & Redis Adapter with Fallback
// ==============================================================

export interface ICache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, duration?: number): Promise<string>;
  del(key: string): Promise<number>;
  ttl(key: string): Promise<number>;
}

class MemoryFallbackCache implements ICache {
  private store: Map<string, { value: string; expiry: number }> = new Map();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<string> {
    const ttl = mode === "EX" && duration ? duration * 1000 : 3600 * 1000;
    this.store.set(key, { value, expiry: Date.now() + ttl });
    return "OK";
  }

  async del(key: string): Promise<number> {
    const existed = this.store.delete(key);
    return existed ? 1 : 0;
  }

  async ttl(key: string): Promise<number> {
    const item = this.store.get(key);
    if (!item) return -2;
    const remaining = Math.ceil((item.expiry - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }
}

class RedisCacheAdapter implements ICache {
  private client: Redis;

  constructor(url: string) {
    this.client = new Redis(url, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: false,
      lazyConnect: true,
    });
    this.client.on("error", () => {});
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<string> {
    try {
      if (mode === "EX" && duration) {
        const res = await this.client.set(key, value, "EX", duration);
        return res || "OK";
      }
      const res = await this.client.set(key, value);
      return res || "OK";
    } catch {
      return "OK";
    }
  }

  async del(key: string): Promise<number> {
    try {
      return await this.client.del(key);
    } catch {
      return 0;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch {
      return -2;
    }
  }
}

let cacheInstance: ICache;

const hasRedisConfig = Boolean(
  process.env.REDIS_URL && process.env.REDIS_URL !== "redis://localhost:6379"
);

if (process.env.NODE_ENV === "production" && hasRedisConfig) {
  cacheInstance = new RedisCacheAdapter(process.env.REDIS_URL!);
} else {
  const globalWithCache = globalThis as unknown as {
    _algaCache?: ICache;
  };

  if (!globalWithCache._algaCache) {
    globalWithCache._algaCache = new MemoryFallbackCache();
  }

  cacheInstance = globalWithCache._algaCache;
}

export const cache = cacheInstance;
export default cache;
