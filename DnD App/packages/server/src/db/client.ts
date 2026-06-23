/**
 * Drizzle DB client. Dev uses a local libSQL/SQLite file (zero infra, prebuilt
 * binaries — no native compiler required). The DATABASE_URL env var selects the
 * backend; libSQL also speaks to a remote Turso/libsql server, and the same
 * Drizzle SQLite schema ports to Postgres when production multiplayer is added.
 * Phase 1: local file only.
 */
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema.js';

const raw = process.env.DATABASE_URL ?? 'sqlite://./data/game.db';
// Normalise the legacy sqlite:// form to libSQL's file: URL scheme.
const url = raw.startsWith('sqlite://')
  ? `file:${raw.replace(/^sqlite:\/\//, '')}`
  : raw;

if (url.startsWith('file:')) {
  mkdirSync(dirname(url.replace(/^file:/, '')), { recursive: true });
}

const client = createClient({ url });
export const db = drizzle(client, { schema });
export { schema };
