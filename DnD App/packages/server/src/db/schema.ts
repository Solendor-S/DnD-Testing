/**
 * Drizzle schema for the dynamic multiplayer game state.
 * Phase 1: schema defined so the architecture is in place; the realtime
 * features that read/write these tables are built later.
 *
 * Written with the SQLite dialect for local dev. The same column definitions
 * port to the Postgres dialect (drizzle-orm/pg-core) when production multiplayer
 * is stood up — only the import and a few column-type names change.
 */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  dmUserId: text('dm_user_id').notNull(),
  joinCode: text('join_code').notNull().unique(),
  createdAt: text('created_at').notNull().default(''),
});

export const characters = sqliteTable('characters', {
  id: text('id').primaryKey(),
  sessionId: text('session_id'),
  ownerUserId: text('owner_user_id').notNull(),
  name: text('name').notNull(),
  classIndex: text('class_index'),
  raceIndex: text('race_index'),
  level: integer('level').notNull().default(1),
  data: text('data', { mode: 'json' }),
});

export const combatants = sqliteTable('combatants', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  name: text('name').notNull(),
  initiative: integer('initiative').notNull().default(0),
  hp: integer('hp').notNull().default(0),
  maxHp: integer('max_hp').notNull().default(0),
  ac: integer('ac').notNull().default(10),
  conditions: text('conditions', { mode: 'json' }).$type<string[]>().default([]),
  isPlayer: integer('is_player', { mode: 'boolean' }).notNull().default(false),
});
