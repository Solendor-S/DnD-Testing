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
  WeaponDef,
  ArmorDef,
  Character,
  CharacterSummary,
  OriginDef,
  OriginKind,
  BenefitChoice,
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
  getWeapons: (): Promise<WeaponDef[]> => ipcRenderer.invoke('srd:getWeapons'),
  getArmor: (): Promise<ArmorDef[]> => ipcRenderer.invoke('srd:getArmor'),
  getOrigins: (kind: OriginKind): Promise<OriginDef[]> => ipcRenderer.invoke('srd:getOrigins', kind),
  getOrigin: (kind: OriginKind, index: string): Promise<OriginDef | null> => ipcRenderer.invoke('srd:getOrigin', kind, index),
  getSubraces: (raceIndex: string): Promise<OriginDef[]> => ipcRenderer.invoke('srd:getSubraces', raceIndex),
  getSubclasses: (classIndex: string): Promise<OriginDef[]> => ipcRenderer.invoke('srd:getSubclasses', classIndex),
  getClassChoices: (classIndex: string): Promise<BenefitChoice[]> => ipcRenderer.invoke('srd:getClassChoices', classIndex),
};

const charApi = {
  list: (): Promise<CharacterSummary[]> => ipcRenderer.invoke('char:list'),
  get: (id: string): Promise<Character | null> => ipcRenderer.invoke('char:get', id),
  save: (c: Character): Promise<Character> => ipcRenderer.invoke('char:save', c),
  remove: (id: string): Promise<void> => ipcRenderer.invoke('char:delete', id),
};

export type SrdApi = typeof srdApi;
export type CharApi = typeof charApi;

contextBridge.exposeInMainWorld('srdApi', srdApi);
contextBridge.exposeInMainWorld('charApi', charApi);
