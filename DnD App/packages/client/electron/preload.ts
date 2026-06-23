import { contextBridge, ipcRenderer } from 'electron';
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
} from '@dnd/shared';

const srdApi = {
  querySpells: (q: SpellQuery): Promise<SpellSummary[]> => ipcRenderer.invoke('srd:querySpells', q),
  getSpell: (index: string): Promise<SpellDetail | null> => ipcRenderer.invoke('srd:getSpell', index),
  queryMonsters: (q: MonsterQuery): Promise<MonsterSummary[]> => ipcRenderer.invoke('srd:queryMonsters', q),
  getMonster: (index: string): Promise<MonsterDetail | null> => ipcRenderer.invoke('srd:getMonster', index),
  getClasses: (): Promise<ClassSummary[]> => ipcRenderer.invoke('srd:getClasses'),
  getClass: (index: string): Promise<ClassDetail | null> => ipcRenderer.invoke('srd:getClass', index),
  getRaces: (): Promise<RaceSummary[]> => ipcRenderer.invoke('srd:getRaces'),
  getRace: (index: string): Promise<RaceDetail | null> => ipcRenderer.invoke('srd:getRace', index),
};

export type SrdApi = typeof srdApi;

contextBridge.exposeInMainWorld('srdApi', srdApi);
