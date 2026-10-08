import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/stokara';

declare global {
  // eslint-disable-next-line no-var
  var __postgres_client: ReturnType<typeof postgres> | undefined;
}

// Reuse connection across serverless warm lambdas to eliminate cold-start handshake latency
export const client = globalThis.__postgres_client || postgres(connectionString, { 
  prepare: false,
  max: 5,
  idle_timeout: 20,
  connect_timeout: 10,
});

if (process.env.NODE_ENV !== 'production' || !globalThis.__postgres_client) {
  globalThis.__postgres_client = client;
}

export const db = drizzle(client, { schema });
