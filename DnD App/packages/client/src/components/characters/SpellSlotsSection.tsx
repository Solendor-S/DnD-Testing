import type { Character } from '@dnd/shared';
import { spellSlotsForLevel } from '@dnd/shared';

interface Props {
  character: Character;
  onChange: (patch: Partial<Character>) => void;
}

/** Spell-slot tracker (full-caster table from the guide §17). */
export function SpellSlotsSection({ character: c, onChange }: Props) {
  const slots = spellSlotsForLevel(c.level);
  const used = c.spellSlotsUsed;

  function setUsed(level: number, value: number) {
    const next = [...used];
    next[level] = Math.max(0, Math.min(slots[level], value));
    onChange({ spellSlotsUsed: next });
  }

  if (!c.spellcastingAbility) return null;
  const hasSlots = slots.some((n) => n > 0);
  if (!hasSlots) return null;

  return (
    <div className="spell-slots">
      <div className="spell-slots-head">
        <span className="field-label">Spell Slots <em>(full-caster table)</em></span>
        <button type="button" className="text-btn" onClick={() => onChange({ spellSlotsUsed: [0, 0, 0, 0, 0, 0, 0, 0, 0] })}>Long rest</button>
      </div>
      <div className="slot-grid">
        {slots.map((total, i) => total > 0 && (
          <div key={i} className="slot-level">
            <span className="slot-level-label">Lv {i + 1}</span>
            <div className="slot-pips">
              {Array.from({ length: total }, (_, p) => (
                <span
                  key={p}
                  className={`slot-pip${p < (used[i] ?? 0) ? ' slot-pip--used' : ''}`}
                  onClick={() => setUsed(i, p < (used[i] ?? 0) ? p : p + 1)}
                />
              ))}
            </div>
            <span className="slot-count">{total - (used[i] ?? 0)}/{total}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
