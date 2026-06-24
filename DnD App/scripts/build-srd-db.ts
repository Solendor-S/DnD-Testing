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
const ORIGINS_DIR = join(ROOT, 'data', 'origins');
const OUT = join(ROOT, 'data', 'srd.db');

function load<T = any>(file: string): T[] {
  const path = join(EN_DIR, file);
  if (!existsSync(path)) {
    throw new Error(`Missing SRD file: ${path}. Run "npm run fetch-srd" first.`);
  }
  return JSON.parse(readFileSync(path, 'utf-8'));
}

/** Load scraped origin JSON (races/subraces/backgrounds). Optional — skip if not scraped yet. */
function loadOrigins(file: string): any[] {
  const path = join(ORIGINS_DIR, file);
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf-8')) : [];
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
      duration TEXT, desc TEXT, higher_level TEXT, damage_type TEXT, roll_data TEXT
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
    CREATE TABLE weapons (
      idx TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT, range TEXT,
      damage_dice TEXT, damage_type TEXT, versatile_dice TEXT,
      properties TEXT, normal_range INTEGER, long_range INTEGER
    );
    CREATE TABLE armor (
      idx TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT,
      base INTEGER, dex_bonus INTEGER, max_bonus INTEGER,
      str_minimum INTEGER, stealth_disadvantage INTEGER
    );
    CREATE TABLE origins (
      idx TEXT NOT NULL, name TEXT NOT NULL, kind TEXT NOT NULL,
      parent TEXT, description TEXT, grant_data TEXT,
      PRIMARY KEY (kind, idx)
    );
    CREATE INDEX idx_spells_level ON spells(level);
    CREATE INDEX idx_spells_school ON spells(school);
    CREATE INDEX idx_monsters_cr ON monsters(cr);
    CREATE INDEX idx_monsters_type ON monsters(type);
  `);

  // ---------- Spells ----------
  const spells = load('5e-SRD-Spells.json');
  const insSpell = db.prepare(`INSERT INTO spells
    (idx, name, level, school, classes, concentration, ritual, casting_time, range, components, material, duration, desc, higher_level, damage_type, roll_data)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  for (const s of spells) {
    const desc = Array.isArray(s.desc) ? s.desc.join('\n\n') : (s.desc ?? '');
    // Rollable subset: what the dice engine needs to cast the spell.
    const rollData = {
      attackType: s.attack_type ?? null,
      dc: s.dc ? { ability: s.dc.dc_type?.index ?? '', success: s.dc.dc_success ?? '' } : null,
      damageBySlot: s.damage?.damage_at_slot_level ?? null,
      damageByCharLevel: s.damage?.damage_at_character_level ?? null,
      healBySlot: s.heal_at_slot_level ?? null,
    };
    insSpell.run([
      s.index, s.name, s.level ?? 0, s.school?.name ?? null,
      JSON.stringify((s.classes ?? []).map((c: any) => c.name)),
      b(s.concentration), b(s.ritual),
      s.casting_time ?? null, s.range ?? null,
      JSON.stringify(s.components ?? []), s.material ?? null,
      s.duration ?? null, desc,
      Array.isArray(s.higher_level) ? s.higher_level.join('\n\n') : (s.higher_level ?? null),
      s.damage?.damage_type?.name ?? null,
      JSON.stringify(rollData),
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

  // ---------- Weapons (subset of equipment, for character attacks) ----------
  const equipment = load('5e-SRD-Equipment.json');
  const weapons = equipment.filter((e: any) => e.equipment_category?.index === 'weapon');
  const insWeapon = db.prepare(`INSERT INTO weapons
    (idx, name, category, range, damage_dice, damage_type, versatile_dice, properties, normal_range, long_range)
    VALUES (?,?,?,?,?,?,?,?,?,?)`);
  for (const w of weapons) {
    insWeapon.run([
      w.index, w.name, w.weapon_category ?? null, w.weapon_range ?? null,
      w.damage?.damage_dice ?? null, w.damage?.damage_type?.name ?? null,
      w.two_handed_damage?.damage_dice ?? null,
      JSON.stringify((w.properties ?? []).map((p: any) => p.index)),
      w.range?.normal ?? null, w.range?.long ?? null,
    ]);
  }
  insWeapon.free();

  // ---------- Armour (subset of equipment, for AC calculation) ----------
  const armor = equipment.filter((e: any) => e.equipment_category?.index === 'armor');
  const insArmor = db.prepare(`INSERT INTO armor
    (idx, name, category, base, dex_bonus, max_bonus, str_minimum, stealth_disadvantage)
    VALUES (?,?,?,?,?,?,?,?)`);
  for (const a of armor) {
    insArmor.run([
      a.index, a.name, a.armor_category ?? null,
      a.armor_class?.base ?? null, a.armor_class?.dex_bonus ? 1 : 0,
      a.armor_class?.max_bonus ?? null,
      a.str_minimum ?? 0, a.stealth_disadvantage ? 1 : 0,
    ]);
  }
  insArmor.free();

  // ---------- Origins (races + subraces + backgrounds, scraped from wikidot) ----------
  const origins = [
    ...loadOrigins('races.json'), ...loadOrigins('subraces.json'),
    ...loadOrigins('backgrounds.json'), ...loadOrigins('subclasses.json'),
  ];
  const insOrigin = db.prepare(`INSERT OR REPLACE INTO origins
    (idx, name, kind, parent, description, grant_data) VALUES (?,?,?,?,?,?)`);
  for (const o of origins) {
    insOrigin.run([o.index, o.name, o.kind, o.parent ?? null, o.description ?? '', JSON.stringify(o.grant)]);
  }
  insOrigin.free();

  // Export to file.
  mkdirSync(dirname(OUT), { recursive: true });
  const data = db.export();
  writeFileSync(OUT, Buffer.from(data));

  console.log(`Built ${OUT}`);
  for (const t of ['spells', 'monsters', 'classes', 'races', 'weapons', 'armor', 'origins']) {
    const n = db.exec(`SELECT count(*) FROM ${t}`)[0].values[0][0];
    console.log(`  ${t.padEnd(9)} ${n}`);
  }
  db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
