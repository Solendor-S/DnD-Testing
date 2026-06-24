import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { readFileSync } from 'fs';
import initSqlJs, { Database } from 'sql.js';
import type {
  SpellQuery,
  MonsterQuery,
  SpellSummary,
  SpellDetail,
  MonsterSummary,
  MonsterDetail,
  ClassSummary,
  ClassDetail,
  RaceSummary,
  RaceDetail,
  WeaponDef,
  ArmorDef,
  Character,
  CharacterSummary,
  OriginDef,
  OriginKind,
  BenefitChoice,
} from '@dnd/shared';

import { listCharacters, getCharacter, saveCharacter, deleteCharacter } from './userDb';

// These are injected by the Electron Forge Vite plugin.
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

let db: Database | null = null;

// The bundled, read-only SRD database (static rules reference).
function getSrdDbPath(): string {
  if (app.isPackaged) return join(process.resourcesPath, 'srd.db');
  // dev: packages/client/.vite/build/main.js -> repo data/srd.db
  return join(__dirname, '../../../../data/srd.db');
}

async function openDb(): Promise<Database> {
  if (db) return db;
  const SQL = await initSqlJs({
    locateFile: (file: string) => {
      if (app.isPackaged) return join(process.resourcesPath, file);
      // Resolve from node_modules regardless of npm-workspace hoisting.
      return require.resolve(`sql.js/dist/${file}`);
    },
  });
  const buffer = readFileSync(getSrdDbPath());
  db = new SQL.Database(buffer);
  return db;
}

/** Run a query and return an array of row objects keyed by column name. */
function all(sql: string, params: Record<string, unknown> | unknown[] = []): any[] {
  if (!db) throw new Error('DB not open');
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params as any);
    const rows: any[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    return rows;
  } finally {
    stmt.free();
  }
}

function likeTerm(query: string): string {
  // Simple contains-match; dataset is small so LIKE is instant.
  return `%${query.trim().replace(/[%_]/g, '')}%`;
}

/** Fetch one row's raw JSON `data` blob by index, parsed, or null if absent. */
function getBlob(table: string, index: string): any | null {
  const rows = all(`SELECT data FROM ${table} WHERE idx = :i`, { ':i': index });
  return rows.length ? JSON.parse(rows[0].data) : null;
}

/** The 5e SRD stores references as either a bare string or { name, index, url }. */
function extractNames(arr: any[] | undefined): string[] {
  return (arr ?? []).map((x) => x?.name ?? x);
}

// ---------------- SRD query handlers ----------------

function registerIpc(): void {
  ipcMain.handle('srd:querySpells', async (_e, q: SpellQuery): Promise<SpellSummary[]> => {
    await openDb();
    const where: string[] = [];
    const params: Record<string, unknown> = {};
    if (q.query && q.query.trim()) {
      where.push('(s.name LIKE :q OR s.desc LIKE :q)');
      params[':q'] = likeTerm(q.query);
    }
    if (q.level !== null && q.level !== undefined) { where.push('s.level = :level'); params[':level'] = q.level; }
    if (q.school) { where.push('s.school = :school'); params[':school'] = q.school; }
    if (q.className) { where.push("s.classes LIKE :cls"); params[':cls'] = `%"${q.className}"%`; }
    if (q.concentration !== null && q.concentration !== undefined) { where.push('s.concentration = :conc'); params[':conc'] = q.concentration ? 1 : 0; }
    if (q.ritual !== null && q.ritual !== undefined) { where.push('s.ritual = :rit'); params[':rit'] = q.ritual ? 1 : 0; }
    const sql = `SELECT s.idx, s.name, s.level, s.school, s.concentration, s.ritual
      FROM spells s ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY s.level, s.name LIMIT 500`;
    return all(sql, params).map((r) => ({
      index: r.idx,
      name: r.name,
      level: r.level,
      school: r.school,
      concentration: !!r.concentration,
      ritual: !!r.ritual,
    }));
  });

  ipcMain.handle('srd:getSpell', async (_e, index: string): Promise<SpellDetail | null> => {
    await openDb();
    const rows = all(
      `SELECT idx, name, level, school, classes, concentration, ritual, casting_time,
              range, components, material, duration, desc, higher_level, damage_type, roll_data
       FROM spells WHERE idx = :i`,
      { ':i': index }
    );
    if (!rows.length) return null;
    const r = rows[0];
    const roll = r.roll_data ? JSON.parse(r.roll_data) : {};
    return {
      index: r.idx,
      name: r.name,
      level: r.level,
      school: r.school,
      classes: JSON.parse(r.classes || '[]'),
      concentration: !!r.concentration,
      ritual: !!r.ritual,
      castingTime: r.casting_time,
      range: r.range,
      components: JSON.parse(r.components || '[]'),
      material: r.material,
      duration: r.duration,
      desc: r.desc,
      higherLevel: r.higher_level,
      damageType: r.damage_type,
      attackType: roll.attackType ?? null,
      dc: roll.dc ?? null,
      damageBySlot: roll.damageBySlot ?? null,
      damageByCharLevel: roll.damageByCharLevel ?? null,
      healBySlot: roll.healBySlot ?? null,
    };
  });

  ipcMain.handle('srd:queryMonsters', async (_e, q: MonsterQuery): Promise<MonsterSummary[]> => {
    await openDb();
    const where: string[] = [];
    const params: Record<string, unknown> = {};
    if (q.query && q.query.trim()) {
      where.push('m.name LIKE :q');
      params[':q'] = likeTerm(q.query);
    }
    if (q.type) { where.push('m.type = :type'); params[':type'] = q.type; }
    if (q.size) { where.push('m.size = :size'); params[':size'] = q.size; }
    if (q.crMin !== null && q.crMin !== undefined) { where.push('m.cr >= :crmin'); params[':crmin'] = q.crMin; }
    if (q.crMax !== null && q.crMax !== undefined) { where.push('m.cr <= :crmax'); params[':crmax'] = q.crMax; }
    const sql = `SELECT m.idx, m.name, m.type, m.subtype, m.size, m.cr, m.hp, m.ac, m.alignment
      FROM monsters m ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY m.cr, m.name LIMIT 500`;
    return all(sql, params).map((r) => ({
      index: r.idx, name: r.name, type: r.type, size: r.size,
      cr: r.cr, hp: r.hp, ac: r.ac, alignment: r.alignment,
    }));
  });

  ipcMain.handle('srd:getMonster', async (_e, index: string): Promise<MonsterDetail | null> => {
    await openDb();
    const m = getBlob('monsters', index);
    if (!m) return null;
    const ac = Array.isArray(m.armor_class) ? m.armor_class[0]?.value : m.armor_class;
    return {
      index: m.index, name: m.name, type: m.type, subtype: m.subtype ?? null, size: m.size,
      cr: m.challenge_rating, hp: m.hit_points, ac, alignment: m.alignment,
      speed: m.speed ?? {},
      abilityScores: { str: m.strength, dex: m.dexterity, con: m.constitution, int: m.intelligence, wis: m.wisdom, cha: m.charisma },
      proficiencyBonus: m.proficiency_bonus, xp: m.xp,
      senses: m.senses ?? {}, languages: m.languages ?? '',
      damageVulnerabilities: m.damage_vulnerabilities ?? [],
      damageResistances: m.damage_resistances ?? [],
      damageImmunities: m.damage_immunities ?? [],
      conditionImmunities: extractNames(m.condition_immunities),
      specialAbilities: m.special_abilities ?? [],
      actions: m.actions ?? [],
      legendaryActions: m.legendary_actions ?? [],
    };
  });

  ipcMain.handle('srd:getClasses', async (): Promise<ClassSummary[]> => {
    await openDb();
    return all('SELECT idx, name, hit_die FROM classes ORDER BY name').map((r) => ({
      index: r.idx, name: r.name, hitDie: r.hit_die,
    }));
  });

  ipcMain.handle('srd:getClass', async (_e, index: string): Promise<ClassDetail | null> => {
    await openDb();
    const c = getBlob('classes', index);
    if (!c) return null;
    return {
      index: c.index, name: c.name, hitDie: c.hit_die,
      savingThrows: extractNames(c.saving_throws),
      proficiencies: extractNames(c.proficiencies),
      subclasses: extractNames(c.subclasses),
      startingEquipment: (c.starting_equipment ?? []).map((e: any) => ({
        name: e.equipment?.name ?? '',
        quantity: e.quantity ?? 1,
      })),
    };
  });

  ipcMain.handle('srd:getRaces', async (): Promise<RaceSummary[]> => {
    await openDb();
    return all('SELECT idx, name, size, speed FROM races ORDER BY name').map((r) => ({
      index: r.idx, name: r.name, size: r.size, speed: r.speed,
    }));
  });

  ipcMain.handle('srd:getRace', async (_e, index: string): Promise<RaceDetail | null> => {
    await openDb();
    const r = getBlob('races', index);
    if (!r) return null;
    return {
      index: r.index, name: r.name, size: r.size,
      speed: typeof r.speed === 'object' ? parseInt(r.speed.walk) : r.speed,
      abilityBonuses: (r.ability_bonuses ?? []).map((b: any) => ({ ability: b.ability_score?.name ?? '', bonus: b.bonus })),
      alignment: r.alignment ?? '', age: r.age ?? '',
      sizeDescription: r.size_description ?? '', languageDesc: r.language_desc ?? '',
      languages: extractNames(r.languages),
      traits: extractNames(r.traits),
      subraces: extractNames(r.subraces),
    };
  });

  ipcMain.handle('srd:getWeapons', async (): Promise<WeaponDef[]> => {
    await openDb();
    return all('SELECT * FROM weapons ORDER BY category, name').map((r) => ({
      index: r.idx, name: r.name, category: r.category, range: r.range,
      damageDice: r.damage_dice, damageType: r.damage_type,
      versatileDice: r.versatile_dice ?? null,
      properties: JSON.parse(r.properties || '[]'),
      normalRange: r.normal_range ?? null, longRange: r.long_range ?? null,
    }));
  });

  ipcMain.handle('srd:getArmor', async (): Promise<ArmorDef[]> => {
    await openDb();
    return all('SELECT * FROM armor ORDER BY category, base').map((r) => ({
      index: r.idx, name: r.name, category: r.category,
      base: r.base, dexBonus: !!r.dex_bonus, maxBonus: r.max_bonus ?? null,
      strMinimum: r.str_minimum, stealthDisadvantage: !!r.stealth_disadvantage,
    }));
  });

  // ---------------- Origins (races/subraces/backgrounds) ----------------
  const toOrigin = (r: any): OriginDef => ({
    index: r.idx, name: r.name, kind: r.kind, parent: r.parent ?? null,
    description: r.description ?? '', grant: JSON.parse(r.grant_data || '{}'),
  });

  ipcMain.handle('srd:getOrigins', async (_e, kind: OriginKind): Promise<OriginDef[]> => {
    await openDb();
    return all('SELECT * FROM origins WHERE kind = :k ORDER BY name', { ':k': kind }).map(toOrigin);
  });

  ipcMain.handle('srd:getOrigin', async (_e, kind: OriginKind, index: string): Promise<OriginDef | null> => {
    await openDb();
    const rows = all('SELECT * FROM origins WHERE kind = :k AND idx = :i', { ':k': kind, ':i': index });
    return rows.length ? toOrigin(rows[0]) : null;
  });

  ipcMain.handle('srd:getSubraces', async (_e, raceIndex: string): Promise<OriginDef[]> => {
    await openDb();
    return all("SELECT * FROM origins WHERE kind = 'subrace' AND parent = :p ORDER BY name", { ':p': raceIndex }).map(toOrigin);
  });

  ipcMain.handle('srd:getSubclasses', async (_e, classIndex: string): Promise<OriginDef[]> => {
    await openDb();
    return all("SELECT * FROM origins WHERE kind = 'subclass' AND parent = :p ORDER BY name", { ':p': classIndex }).map(toOrigin);
  });

  ipcMain.handle('srd:getClassChoices', async (_e, classIndex: string): Promise<BenefitChoice[]> => {
    await openDb();
    const rows = all('SELECT data FROM classes WHERE idx = :i', { ':i': classIndex });
    if (!rows.length) return [];
    const cls = JSON.parse(rows[0].data);
    const out: BenefitChoice[] = [];
    for (const [ci, choice] of (cls.proficiency_choices ?? []).entries()) {
      const opts = choice.from?.options ?? [];
      const skills = opts
        .map((o: any) => o.item?.index as string | undefined)
        .filter((idx: string | undefined): idx is string => !!idx && idx.startsWith('skill-'))
        .map((idx: string) => idx.replace(/^skill-/, ''));
      if (skills.length) {
        out.push({ id: `class-skill-${ci}`, type: 'skill', choose: choice.choose ?? 1, from: skills });
      }
    }
    return out;
  });

  // ---------------- Character store (writable user.db) ----------------
  ipcMain.handle('char:list', (): Promise<CharacterSummary[]> => listCharacters());
  ipcMain.handle('char:get', (_e, id: string): Promise<Character | null> => getCharacter(id));
  ipcMain.handle('char:save', (_e, c: Character): Promise<Character> => saveCharacter(c));
  ipcMain.handle('char:delete', (_e, id: string): Promise<void> => deleteCharacter(id));
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 940,
    minHeight: 600,
    backgroundColor: '#1a1614',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
