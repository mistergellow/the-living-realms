import { Redis } from 'ioredis';

export { Redis };

export function createRedis(url: string, name: string): Redis {
  return new Redis(url, {
    connectionName: name,
    maxRetriesPerRequest: 3,
    enableAutoPipelining: true,
    // Resolve both IPv4 and IPv6. Some hosts (e.g. Railway private networking)
    // expose internal services over IPv6; ioredis defaults to IPv4 only.
    family: 0,
  });
}
