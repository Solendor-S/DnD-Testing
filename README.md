# DnD Testing

A testing and development space for building a D&D application.

## What This Is

This repository is an experimental workspace for building a Dungeons & Dragons app from the ground up. The goal is to explore what a modern, feature-rich D&D tool could look like — starting with core mechanics and expanding into more ambitious territory.

All application code lives in the [`DnD App/`](./DnD%20App) directory.

## Planned Features

### Core
- Character creation and management (classes, races, ability scores, backgrounds)
- Skill lists and proficiency tracking
- Spell lists and slot management
- Inventory and equipment

### Mechanics
- Combat tracker (initiative, HP, conditions)
- Dice roller with modifier support
- Rule lookups backed by the 5e Player's Handbook

### Ambitious / Exploratory
- 3D mechanics — visualising maps, encounters, or character models in three dimensions
- Interactive encounter builder
- Campaign and session notes management
- Homebrew content support (custom spells, items, classes)

## Rules Reference

App behaviour and rule implementations are sourced from the **D&D 5e Player's Handbook** and cross-referenced against the [D&D 5e Wiki](https://dnd5e.wikidot.com/).

## Architecture

A npm-workspaces monorepo (rooted at `DnD App/`) with a clean split between
**static reference data** and **dynamic multiplayer state**:

```text
DnD App/
├── data/srd.db              prebuilt SQLite (SRD rules) — bundled in the client
├── scripts/                 fetch-srd.ts + build-srd-db.ts (seed pipeline)
└── packages/
    ├── shared/   @dnd/shared — TS types shared by client & server (SRD models,
    │                            Socket.IO event contracts, API types)
    ├── client/   Electron + Vite + React desktop app (queries srd.db via sql.js)
    └── server/   Fastify + Socket.IO + Drizzle (libSQL) multiplayer backend
```

- **Static SRD reference** (spells/monsters/classes/races) lives in `data/srd.db`,
  bundled into the client and queried locally via `sql.js` — offline, instant, no server.
- **Dynamic game state** (sessions, characters, combat, dice) belongs to the backend
  server. Phase 1 ships it as a skeleton (`/health` + typed Socket.IO stubs + Drizzle
  schema); the realtime features are built later against the shared contracts.

SRD data: [`5e-bits/5e-database`](https://github.com/5e-bits/5e-database) (OGL v1.0a).

## Development

All commands run from the `DnD App/` directory:

```bash
cd "DnD App"
npm install            # install all workspaces (no native compiler needed)
npm run fetch-srd      # clone the 5e SRD JSON into data/raw/
npm run build-db       # build data/srd.db from the JSON
npm run dev:client     # launch the Electron desktop app
npm run dev:server     # start the backend (http://localhost:3001)
npm run typecheck      # typecheck every package
```

Current feature: the **Rules Browser** — search/filter spells, monsters, classes and
races, with a two-panel list + detail view (incl. monster stat blocks).

## Status

Early development. Foundation + Rules Browser are in place; multiplayer features
(characters, combat tracker, dice, sessions) are next.
