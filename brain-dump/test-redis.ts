import { Redis } from '@upstash/redis';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env: Record<string, string> = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

async function test() {
  await redis.set('test_otp', '123456');
  const stored = await redis.get('test_otp');
  console.log('Value:', stored, 'Type:', typeof stored);
}
test();
