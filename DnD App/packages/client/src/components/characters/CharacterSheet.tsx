import { useEffect, useState } from 'react';
import type { AbilityId, Character, CharacterSpellRef, ClassSummary, OriginDef } from '@dnd/shared';
import {
  ABILITIES, ABILITY_NAMES, ALIGNMENTS, castSpell, characterToModifierContext,
  suggestMaxHp, xpThresholdForLevel,
} from '@dnd/shared';
import { useDiceContext } from '../../context/ActiveStatsContext';
import { AbilityScoreEditor } from './AbilityScoreEditor';
import { DerivedStats } from './DerivedStats';
import { ProficiencyEditor } from './ProficiencyEditor';
import { CombatSection } from './CombatSection';
import { SpellSlotsSection } from './SpellSlotsSection';
import { EquipmentSection } from './EquipmentSection';
import { WeaponPicker } from './WeaponPicker';
import { SpellPicker } from './SpellPicker';
import { OriginSection } from './OriginSection';
import { ChoiceResolver } from './ChoiceResolver';
import { FeaturesEffectsPanel } from './FeaturesEffectsPanel';
import { resolveOrigins, type ActiveChoice } from '../../lib/origins';
import { SPELLCASTING_ABILITY, abilityNameToId } from '../../lib/character';

interface Props {
  character: Character;
  onSave: (c: Character) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function CharacterSheet({ character, onSave, onCancel, onDelete }: Props) {
  const { pushRolls } = useDiceContext();
  const [draft, setDraft] = useState<Character>(character);
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [subclasses, setSubclasses] = useState<OriginDef[]>([]);
  const [choices, setChoices] = useState<ActiveChoice[]>([]);

  useEffect(() => {
    window.srdApi.getClasses().then(setClasses);
  }, []);

  useEffect(() => {
    if (draft.classIndex) window.srdApi.getSubclasses(draft.classIndex).then(setSubclasses);
    else setSubclasses([]);
  }, [draft.classIndex]);

  // Recompute origin grants whenever a selection or resolved choice changes.
  useEffect(() => {
    let cancelled = false;
    resolveOrigins(draft).then(({ character: updated, choices: active }) => {
      if (cancelled) return;
      setDraft((d) => ({
        ...d,
        grantedAbilityBonuses: updated.grantedAbilityBonuses,
        granted: updated.granted,
        speed: updated.speed,
      }));
      setChoices(active);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(draft.origin), JSON.stringify(draft.choiceSelections), draft.classIndex,
      draft.level, draft.armorIndex, JSON.stringify(draft.effectToggles)]);

  function patch(p: Partial<Character>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  async function onClassChange(idx: string) {
    if (!idx) {
      patch({ classIndex: null, origin: { ...draft.origin, subclassIndex: null } });
      return;
    }
    const cls = await window.srdApi.getClass(idx);
    patch({
      classIndex: idx,
      // Changing class invalidates the subclass + its class/subclass choices.
      origin: { ...draft.origin, subclassIndex: null },
      choiceSelections: Object.fromEntries(
        Object.entries(draft.choiceSelections).filter(([k]) => !k.startsWith('subclass:') && !k.startsWith('class:'))
      ),
      hitDie: cls?.hitDie ?? draft.hitDie,
      saveProficiencies: (cls?.savingThrows ?? []).map(abilityNameToId).filter((x): x is AbilityId => !!x),
      spellcastingAbility: SPELLCASTING_ABILITY[idx] ?? null,
    });
  }
  function setSubclass(idx: string) {
    patch({
      origin: { ...draft.origin, subclassIndex: idx || null },
      choiceSelections: Object.fromEntries(
        Object.entries(draft.choiceSelections).filter(([k]) => !k.startsWith('subclass:'))
      ),
    });
  }
  function suggestHp() {
    const hp = suggestMaxHp(draft.hitDie, draft.level, draft.abilities.con) + draft.granted.hpPerLevel * draft.level;
    patch({ maxHp: hp, currentHp: hp });
  }
  async function castKnown(ref: CharacterSpellRef) {
    const spell = await window.srdApi.getSpell(ref.index);
    if (!spell) return;
    pushRolls(castSpell(spell, characterToModifierContext(draft), { castLevel: Math.max(ref.level, 1) }));
  }
  function save() {
    onSave({ ...draft, updatedAt: new Date().toISOString() });
  }

  const nextXp = xpThresholdForLevel(draft.level);

  return (
    <div className="character-sheet">
      <div className="sheet-header">
        <input className="sheet-name" value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
        <label className="crit-check">
          <input type="checkbox" checked={draft.inspiration} onChange={(e) => patch({ inspiration: e.target.checked })} /> Inspiration
        </label>
        <div className="sheet-actions">
          {onDelete && <button type="button" className="text-btn danger" onClick={onDelete}>Delete</button>}
          <button type="button" className="text-btn" onClick={onCancel}>Cancel</button>
          <button type="button" className="roll-btn" onClick={save}>Save</button>
        </div>
      </div>

      <div className="sheet-grid">
        <section className="sheet-card">
          <h3>Identity</h3>
          <div className="field-row">
            <label className="stats-inline">Class
              <select value={draft.classIndex ?? ''} onChange={(e) => onClassChange(e.target.value)}>
                <option value="">—</option>
                {classes.map((c) => <option key={c.index} value={c.index}>{c.name}</option>)}
              </select>
            </label>
            {subclasses.length > 0 && (
              <label className="stats-inline">Subclass
                <select value={draft.origin.subclassIndex ?? ''} onChange={(e) => setSubclass(e.target.value)}>
                  <option value="">—</option>
                  {subclasses.map((s) => <option key={s.index} value={s.index}>{s.name}</option>)}
                </select>
              </label>
            )}
            <label className="stats-inline">Level
              <input type="number" min={1} max={20} value={draft.level} onChange={(e) => patch({ level: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })} />
            </label>
            <label className="stats-inline">Alignment
              <select value={draft.alignment} onChange={(e) => patch({ alignment: e.target.value })}>
                <option value="">—</option>
                {ALIGNMENTS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
            <label className="stats-inline">XP
              <input type="number" min={0} value={draft.xp} onChange={(e) => patch({ xp: Number(e.target.value) || 0 })} />
            </label>
            {nextXp !== null && <span className="xp-hint">Next level at {nextXp.toLocaleString()} XP</span>}
          </div>
          <OriginSection character={draft} onChange={patch} />
        </section>

        <section className="sheet-card sheet-card--derived">
          <h3>Calculated Stats</h3>
          <DerivedStats character={draft} />
        </section>

        {choices.length > 0 && (
          <section className="sheet-card sheet-card--full">
            <h3>Origin Choices</h3>
            <ChoiceResolver character={draft} choices={choices} onChange={patch} />
          </section>
        )}

        <section className="sheet-card">
          <h3>Ability Scores <em className="h3-hint">(base — racial bonuses auto-applied)</em></h3>
          <AbilityScoreEditor abilities={draft.abilities} onChange={(abilities) => patch({ abilities })} />
        </section>

        <section className="sheet-card">
          <h3>Proficiencies &amp; Languages</h3>
          <ProficiencyEditor character={draft} onChange={patch} />
        </section>

        <section className="sheet-card sheet-card--full">
          <h3>Combat</h3>
          <div className="combat-extra">
            <label className="stats-inline">Hit die (d)
              <input type="number" value={draft.hitDie} onChange={(e) => patch({ hitDie: Number(e.target.value) || 0 })} />
            </label>
            <label className="stats-inline">Spellcasting
              <select value={draft.spellcastingAbility ?? ''} onChange={(e) => patch({ spellcastingAbility: (e.target.value || null) as AbilityId | null })}>
                <option value="">None</option>
                {ABILITIES.map((id) => <option key={id} value={id}>{ABILITY_NAMES[id]}</option>)}
              </select>
            </label>
            <button type="button" className="text-btn" onClick={suggestHp}>Suggest HP</button>
          </div>
          <CombatSection character={draft} onChange={patch} />
        </section>

        <section className="sheet-card sheet-card--full">
          <h3>Weapons &amp; Attacks</h3>
          <WeaponPicker character={draft} weapons={draft.weapons} onChange={(weapons) => patch({ weapons })} />
        </section>

        <section className="sheet-card sheet-card--full">
          <h3>Spells</h3>
          <SpellSlotsSection character={draft} onChange={patch} />
          <SpellPicker knownSpells={draft.knownSpells} onChange={(knownSpells) => patch({ knownSpells })} />
          {draft.knownSpells.length > 0 && (
            <div className="known-cast-list">
              <span className="field-label">Cast (uses this character's modifiers)</span>
              {draft.knownSpells.map((s) => (
                <button key={s.index} type="button" className="mod-btn" onClick={() => castKnown(s)}>Cast {s.name}</button>
              ))}
            </div>
          )}
        </section>

        <section className="sheet-card sheet-card--full">
          <h3>Equipment &amp; Wealth</h3>
          <EquipmentSection character={draft} onChange={patch} />
        </section>

        <section className="sheet-card sheet-card--full">
          <h3>Features &amp; Effects</h3>
          <FeaturesEffectsPanel character={draft} onChange={patch} />
        </section>

        <section className="sheet-card sheet-card--full">
          <h3>Roleplay &amp; Notes</h3>
          <div className="field-row field-row--cols">
            <label className="stats-inline stats-inline--grow">Features &amp; traits (one per line)
              <textarea rows={4} value={draft.features.join('\n')} onChange={(e) => patch({ features: e.target.value.split('\n').filter((x) => x.trim()) })} />
            </label>
          </div>
          <div className="field-row field-row--cols">
            <label className="stats-inline stats-inline--grow">Personality
              <textarea rows={2} value={draft.personality} onChange={(e) => patch({ personality: e.target.value })} />
            </label>
            <label className="stats-inline stats-inline--grow">Ideals
              <textarea rows={2} value={draft.ideals} onChange={(e) => patch({ ideals: e.target.value })} />
            </label>
          </div>
          <div className="field-row field-row--cols">
            <label className="stats-inline stats-inline--grow">Bonds
              <textarea rows={2} value={draft.bonds} onChange={(e) => patch({ bonds: e.target.value })} />
            </label>
            <label className="stats-inline stats-inline--grow">Flaws
              <textarea rows={2} value={draft.flaws} onChange={(e) => patch({ flaws: e.target.value })} />
            </label>
          </div>
          <label className="stats-inline stats-inline--full">Backstory
            <textarea rows={3} value={draft.backstory} onChange={(e) => patch({ backstory: e.target.value })} />
          </label>
          <label className="stats-inline stats-inline--full">Allies &amp; organisations
            <textarea rows={2} value={draft.allies} onChange={(e) => patch({ allies: e.target.value })} />
          </label>
          <label className="stats-inline stats-inline--full">Notes
            <textarea rows={2} value={draft.notes} onChange={(e) => patch({ notes: e.target.value })} />
          </label>
        </section>
      </div>
    </div>
  );
}
