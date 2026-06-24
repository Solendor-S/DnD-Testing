/**
 * Writable local store for user-created data (characters for now), kept in a
 * `user.db` SQLite file in userData. Uses sql.js with the BibleApp write-back
 * pattern: mutate the in-memory DB, then export() and writeFileSync.
 *
 * Separate from the read-only bundled srd.db.
 */
import { app } from 'electron';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import initSqlJs, { Database } from 'sql.js';
import type { Character, CharacterSummary } from '@dnd/shared';
import { normalizeCharacter } from '@dnd/shared';

let db: Database | null = null;

function dbPath(): string {
  return join(app.getPath('userData'), 'user.db');
}

async function open(): Promise<Database> {
  if (db) return db;
  const SQL = await initSqlJs({
    locateFile: (file: string) =>
      app.isPackaged ? join(process.resourcesPath, file) : require.resolve(`sql.js/dist/${file}`),
  });
  const path = dbPath();
  db = existsSync(path) ? new SQL.Database(readFileSync(path)) : new SQL.Database();
  db.run('CREATE TABLE IF NOT EXISTS characters (id TEXT PRIMARY KEY, name TEXT, data TEXT)');
  return db;
}

function persist(): void {
  if (db) writeFileSync(dbPath(), Buffer.from(db.export()));
}

function query(sql: string, params: Record<string, unknown> | unknown[] = []): any[] {
  if (!db) throw new Error('user.db not open');
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params as any);
    const out: any[] = [];
    while (stmt.step()) out.push(stmt.getAsObject());
    return out;
  } finally {
    stmt.free();
  }
}

export async function listCharacters(): Promise<CharacterSummary[]> {
  await open();
  return query('SELECT data FROM characters').map((r) => {
    const c = normalizeCharacter(JSON.parse(r.data));
    return { id: c.id, name: c.name, classIndex: c.classIndex, raceIndex: c.raceIndex, level: c.level };
  });
}

export async function getCharacter(id: string): Promise<Character | null> {
  await open();
  const rows = query('SELECT data FROM characters WHERE id = :i', { ':i': id });
  return rows.length ? normalizeCharacter(JSON.parse(rows[0].data)) : null;
}

export async function saveCharacter(c: Character): Promise<Character> {
  const d = await open();
  d.run('INSERT OR REPLACE INTO characters (id, name, data) VALUES (?, ?, ?)', [c.id, c.name, JSON.stringify(c)]);
  persist();
  return c;
}

export async function deleteCharacter(id: string): Promise<void> {
  const d = await open();
  d.run('DELETE FROM characters WHERE id = ?', [id]);
  persist();
}
