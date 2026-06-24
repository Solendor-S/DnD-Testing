import { useEffect, useState } from 'react';
import type { Character, OriginDef } from '@dnd/shared';

interface Props {
  character: Character;
  onChange: (patch: Partial<Character>) => void;
}

/** Drop choiceSelection keys belonging to the given source prefixes (clean swap). */
function prune(cs: Record<string, string[]>, prefixes: string[]): Record<string, string[]> {
  return Object.fromEntries(Object.entries(cs).filter(([k]) => !prefixes.some((p) => k.startsWith(p))));
}

export function OriginSection({ character: c, onChange }: Props) {
  const [races, setRaces] = useState<OriginDef[]>([]);
  const [backgrounds, setBackgrounds] = useState<OriginDef[]>([]);
  const [subraces, setSubraces] = useState<OriginDef[]>([]);

  useEffect(() => {
    window.srdApi.getOrigins('race').then(setRaces);
    window.srdApi.getOrigins('background').then(setBackgrounds);
  }, []);

  useEffect(() => {
    if (c.origin.raceIndex) window.srdApi.getSubraces(c.origin.raceIndex).then(setSubraces);
    else setSubraces([]);
  }, [c.origin.raceIndex]);

  function setRace(idx: string) {
    onChange({
      origin: { ...c.origin, raceIndex: idx || null, subraceIndex: null },
      choiceSelections: prune(c.choiceSelections, ['race:', 'subrace:']),
    });
  }
  function setSubrace(idx: string) {
    onChange({
      origin: { ...c.origin, subraceIndex: idx || null },
      choiceSelections: prune(c.choiceSelections, ['subrace:']),
    });
  }
  function setBackground(idx: string) {
    const bg = backgrounds.find((b) => b.index === idx);
    onChange({
      origin: { ...c.origin, backgroundIndex: idx || null },
      background: bg?.name ?? '',
      choiceSelections: prune(c.choiceSelections, ['background:']),
    });
  }
  return (
    <div className="origin-section">
      <div className="field-row">
        <label className="stats-inline">Race
          <select value={c.origin.raceIndex ?? ''} onChange={(e) => setRace(e.target.value)}>
            <option value="">—</option>
            {races.map((r) => <option key={r.index} value={r.index}>{r.name}</option>)}
          </select>
        </label>
        {subraces.length > 0 && (
          <label className="stats-inline">Subrace
            <select value={c.origin.subraceIndex ?? ''} onChange={(e) => setSubrace(e.target.value)}>
              <option value="">—</option>
              {subraces.map((s) => <option key={s.index} value={s.index}>{s.name}</option>)}
            </select>
          </label>
        )}
        <label className="stats-inline">Background
          <select value={c.origin.backgroundIndex ?? ''} onChange={(e) => setBackground(e.target.value)}>
            <option value="">—</option>
            {backgrounds.map((b) => <option key={b.index} value={b.index}>{b.name}</option>)}
          </select>
        </label>
      </div>
      <p className="panel-hint">Selecting a race, subrace, or background auto-applies its benefits below. Resolve any choices in the next section.</p>
    </div>
  );
}
