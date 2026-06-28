import Redis from 'ioredis';
import { logger } from '@remote-support/shared-utils';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

let redisClient: any;
let isMock = false;

// Mock Redis client for local setups without Redis running
class MockRedis {
  private store: Record<string, string> = {};

  async get(key: string): Promise<string | null> {
    return this.store[key] || null;
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<string> {
    this.store[key] = value;
    return 'OK';
  }

  async del(key: string): Promise<number> {
    if (key in this.store) {
      delete this.store[key];
      return 1;
    }
    return 0;
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    if (!this.store[key]) this.store[key] = '{}';
    const obj = JSON.parse(this.store[key]);
    obj[field] = value;
    this.store[key] = JSON.stringify(obj);
    return 1;
  }

  async hget(key: string, field: string): Promise<string | null> {
    if (!this.store[key]) return null;
    const obj = JSON.parse(this.store[key]);
    return obj[field] || null;
  }

  async hdel(key: string, field: string): Promise<number> {
    if (!this.store[key]) return 0;
    const obj = JSON.parse(this.store[key]);
    if (field in obj) {
      delete obj[field];
      this.store[key] = JSON.stringify(obj);
      return 1;
    }
    return 0;
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    if (!this.store[key]) return {};
    return JSON.parse(this.store[key]);
  }
}

try {
  redisClient = new Redis({
    host: redisHost,
    port: redisPort,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });

  redisClient.on('connect', () => {
    logger.info(`Redis connected successfully on ${redisHost}:${redisPort}`);
  });

  redisClient.on('error', (err: any) => {
    if (!isMock) {
      logger.warn(`Redis connection failed. Falling back to in-memory mock client. Details: ${err.message}`);
      redisClient = new MockRedis();
      isMock = true;
    }
  });

  redisClient.connect().catch((err: any) => {
    if (!isMock) {
      logger.warn(`Redis connection failed on startup. Falling back to in-memory mock client.`);
      redisClient = new MockRedis();
      isMock = true;
    }
  });
} catch (e) {
  logger.warn('Failed to initialize Redis. Falling back to in-memory mock client.');
  redisClient = new MockRedis();
  isMock = true;
}

export { redisClient };
export default redisClient;
