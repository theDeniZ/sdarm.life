import type { Config } from 'drizzle-kit';

export default {
  dialect: 'sqlite',
  schema: './packages/db/src/index.ts',
  out: './packages/db/migrations',
} satisfies Config;
