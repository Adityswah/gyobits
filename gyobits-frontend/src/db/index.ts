import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/stokara';

declare global {
  // eslint-disable-next-line no-var
  var __postgres_client: ReturnType<typeof postgres> | undefined;
}

// Fast connection with 2s timeout to prevent request freezing if external DB is slow/offline
export const client = globalThis.__postgres_client || postgres(connectionString, { 
  prepare: false,
  max: 5,
  idle_timeout: 15,
  connect_timeout: 2,
});

if (process.env.NODE_ENV !== 'production' || !globalThis.__postgres_client) {
  globalThis.__postgres_client = client;
}

export const db = drizzle(client, { schema });
