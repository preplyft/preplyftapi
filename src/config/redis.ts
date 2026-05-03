// import Redis from 'ioredis';

// const REDIS_HOST: string = process.env.REDIS_HOST as string; 

// const redis = new Redis(, {
//   lazyConnect: true,
//   maxRetriesPerRequest: 3,
// });

// redis.on('connect', () => console.log('✅ Redis connected'));
// redis.on('error', (err) => console.error('❌ Redis error:', err));

// export default redis;

import Redis from "ioredis";

let redis: Redis;

const connectRedis = ()=> {
  if (redis) return redis;

  const host: string = process.env.REDIS_HOST as string;
  const password: string = process.env.REDIS_PASSWORD as string;
  const port: number = parseInt(process.env.REDIS_PORT as string);
  const username: string = process.env.REDIS_USERNAME as string;
  if (!host) throw new Error("REDIS_URL is not defined in environment variables");

  redis = new Redis({
    port: port,
    host: host,
    username: username,
    password: password,
  });

  redis.on("connect", () => console.log("✅ Redis connected"));
  redis.on("error", (err) => console.error("❌ Redis error:", err));
  redis.on("reconnecting", () => console.warn("⚠️  Redis reconnecting..."));

  return redis;
};

export { redis, connectRedis };
