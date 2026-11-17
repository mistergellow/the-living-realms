import { Redis } from 'ioredis';

export { Redis };

export function createRedis(url: string, name: string): Redis {
  return new Redis(url, {
    connectionName: name,
    maxRetriesPerRequest: 3,
    enableAutoPipelining: true,
  });
}
