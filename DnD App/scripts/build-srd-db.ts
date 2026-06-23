/**
 * Builds the bundled `data/srd.db` SQLite file from the raw 5e-bits JSON
 * (data/raw/src/2014/en/). Materialises fast-filter columns + a `data` JSON
 * blob per row. Search is LIKE-based at query time (the dataset is only a few
 * hundred rows per category, so this is instant and avoids any FTS dependency).
 *
 * Uses sql.js (WASM) — same engine the Electron client reads with, and requires
 * no native compilation (matches the BibleApp build-db pattern).
 *
 * Run: npm run build-db   (after npm run fetch-srd)
 */
import initSqlJs from 'sql.js';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const EN_DIR = join(ROOT, 'data', 'raw', 'src', '2014', 'en');
const OUT = join(ROOT, 'data', 'srd.db');

function load<T = any>(file: string): T[] {
  const path = join(EN_DIR, file);
  if (!existsSync(path)) {
    throw new Error(`Missing SRD file: ${path}. Run "npm run fetch-srd" first.`);
  }
  return JSON.parse(readFileSync(path, 'utf-8'));
}

const b = (v: unknown): number => (v ? 1 : 0);

async function main() {
  if (!existsSync(EN_DIR)) {
    throw new Error(`SRD source not found at ${EN_DIR}. Run "npm run fetch-srd" first.`);
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database();

  db.run(`
    CREATE TABLE spells (
      idx TEXT PRIMARY KEY, name TEXT NOT NULL, level INTEGER, school TEXT,
      classes TEXT, concentration INTEGER, ritual INTEGER,
      casting_time TEXT, range TEXT, components TEXT, material TEXT,
      duration TEXT, desc TEXT, higher_level TEXT, damage_type TEXT
    );
    CREATE TABLE monsters (
      idx TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT, subtype TEXT, size TEXT,
      cr REAL, hp INTEGER, ac INTEGER, alignment TEXT, data TEXT
    );
    CREATE TABLE classes (
      idx TEXT PRIMARY KEY, name TEXT NOT NULL, hit_die INTEGER, data TEXT
    );
    CREATE TABLE races (
      idx TEXT PRIMARY KEY, name TEXT NOT NULL, size TEXT, speed INTEGER, data TEXT
    );
    CREATE INDEX idx_spells_level ON spells(level);
    CREATE INDEX idx_spells_school ON spells(school);
    CREATE INDEX idx_monsters_cr ON monsters(cr);
    CREATE INDEX idx_monsters_type ON monsters(type);
  `);

  // ---------- Spells ----------
  const spells = load('5e-SRD-Spells.json');
  const insSpell = db.prepare(`INSERT INTO spells
    (idx, name, level, school, classes, concentration, ritual, casting_time, range, components, material, duration, desc, higher_level, damage_type)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  for (const s of spells) {
    const desc = Array.isArray(s.desc) ? s.desc.join('\n\n') : (s.desc ?? '');
    insSpell.run([
      s.index, s.name, s.level ?? 0, s.school?.name ?? null,
      JSON.stringify((s.classes ?? []).map((c: any) => c.name)),
      b(s.concentration), b(s.ritual),
      s.casting_time ?? null, s.range ?? null,
      JSON.stringify(s.components ?? []), s.material ?? null,
      s.duration ?? null, desc,
      Array.isArray(s.higher_level) ? s.higher_level.join('\n\n') : (s.higher_level ?? null),
      s.damage?.damage_type?.name ?? null,
    ]);
  }
  insSpell.free();

  // ---------- Monsters ----------
  const monsters = load('5e-SRD-Monsters.json');
  const insMonster = db.prepare(`INSERT INTO monsters
    (idx, name, type, subtype, size, cr, hp, ac, alignment, data)
    VALUES (?,?,?,?,?,?,?,?,?,?)`);
  for (const m of monsters) {
    const acEntry = Array.isArray(m.armor_class) ? m.armor_class[0] : m.armor_class;
    insMonster.run([
      m.index, m.name, m.type ?? null, m.subtype ?? null, m.size ?? null,
      typeof m.challenge_rating === 'number' ? m.challenge_rating : null,
      m.hit_points ?? null, acEntry?.value ?? null, m.alignment ?? null,
      JSON.stringify(m),
    ]);
  }
  insMonster.free();

  // ---------- Classes ----------
  const classes = load('5e-SRD-Classes.json');
  const insClass = db.prepare(`INSERT INTO classes (idx, name, hit_die, data) VALUES (?,?,?,?)`);
  for (const c of classes) insClass.run([c.index, c.name, c.hit_die ?? null, JSON.stringify(c)]);
  insClass.free();

  // ---------- Races ----------
  const races = load('5e-SRD-Races.json');
  const insRace = db.prepare(`INSERT INTO races (idx, name, size, speed, data) VALUES (?,?,?,?,?)`);
  for (const r of races) {
    const speed = typeof r.speed === 'object' ? parseInt(r.speed?.walk ?? '0') : (r.speed ?? null);
    insRace.run([r.index, r.name, r.size ?? null, speed, JSON.stringify(r)]);
  }
  insRace.free();

  // Export to file.
  mkdirSync(dirname(OUT), { recursive: true });
  const data = db.export();
  writeFileSync(OUT, Buffer.from(data));

  console.log(`Built ${OUT}`);
  for (const t of ['spells', 'monsters', 'classes', 'races']) {
    const n = db.exec(`SELECT count(*) FROM ${t}`)[0].values[0][0];
    console.log(`  ${t.padEnd(9)} ${n}`);
  }
  db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
