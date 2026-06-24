import type { Character, Effect } from '@dnd/shared';
import { effectsForKeys } from '@dnd/shared';

interface Props {
  character: Character;
  onChange: (patch: Partial<Character>) => void;
}

/**
 * Transparency surface: shows which origin/subclass features are auto-applied,
 * which are situational toggles, and which are manual (text-only mechanics we
 * don't compute) — so it's always clear what's handled vs. applied by hand.
 */
export function FeaturesEffectsPanel({ character: c, onChange }: Props) {
  const candidates = effectsForKeys([c.origin.raceIndex, c.origin.subraceIndex, c.origin.subclassIndex, c.classIndex]);
  const effectSources = new Set(candidates.map((e) => e.source));
  const unarmored = c.armorIndex == null;

  // Origin/subclass features that have NO modelled effect → manual.
  const manual = c.granted.features.filter((f) => !effectSources.has(f.name));

  function toggle(id: string) {
    onChange({ effectToggles: { ...c.effectToggles, [id]: !c.effectToggles[id] } });
  }

  function statusOf(e: Effect): { kind: 'locked' | 'toggle' | 'auto' | 'inactive'; note: string } {
    if (e.minLevel && c.level < e.minLevel) return { kind: 'locked', note: `unlocks at level ${e.minLevel}` };
    if (e.condition === 'toggle') return { kind: 'toggle', note: '' };
    if (e.condition === 'unarmored' && !unarmored) return { kind: 'inactive', note: 'inactive — wearing armor' };
    return { kind: 'auto', note: '' };
  }

  if (candidates.length === 0 && manual.length === 0) return null;

  return (
    <div className="effects-panel">
      {candidates.map((e) => {
        const st = statusOf(e);
        return (
          <div key={e.id} className="effect-row">
            {st.kind === 'toggle' ? (
              <label className="effect-toggle">
                <input type="checkbox" checked={!!c.effectToggles[e.id]} onChange={() => toggle(e.id)} />
                <span className="badge badge--toggle">Toggle</span>
              </label>
            ) : (
              <span className={`badge badge--${st.kind}`}>
                {st.kind === 'auto' ? 'Auto' : st.kind === 'locked' ? 'Locked' : 'Auto'}
              </span>
            )}
            <span className="effect-info">
              <strong>{e.source}</strong> <span className="effect-desc">{e.desc}</span>
              {st.note && <em className="effect-note"> ({st.note})</em>}
            </span>
          </div>
        );
      })}

      {manual.map((f, i) => (
        <div key={`m-${i}`} className="effect-row">
          <span className="badge badge--manual">Manual</span>
          <span className="effect-info"><strong>{f.name}</strong> <span className="effect-desc">{f.desc}</span></span>
        </div>
      ))}

      <p className="effects-hint">
        <span className="badge badge--auto">Auto</span> applied to your stats ·
        <span className="badge badge--toggle">Toggle</span> situational ·
        <span className="badge badge--manual">Manual</span> apply at the table (not auto-calculated).
      </p>
    </div>
  );
}
