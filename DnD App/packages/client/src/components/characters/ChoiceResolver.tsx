import { useState } from 'react';
import type { Character } from '@dnd/shared';
import type { ActiveChoice } from '../../lib/origins';

interface Props {
  character: Character;
  choices: ActiveChoice[];
  onChange: (patch: Partial<Character>) => void;
}

const TYPE_LABEL: Record<string, string> = {
  ability: 'ability score', skill: 'skill', language: 'language', tool: 'tool',
};
const MAX_MASTERY = 3;

interface Pending { key: string; skillId: string; skillName: string; nextLevel: number; tooMuch: boolean }

export function ChoiceResolver({ character: c, choices, onChange }: Props) {
  const [pending, setPending] = useState<Pending | null>(null);
  if (choices.length === 0) return null;

  function setPicks(key: string, picks: string[]) {
    onChange({ choiceSelections: { ...c.choiceSelections, [key]: picks } });
  }

  function toggle(choice: ActiveChoice['choice'], key: string, optionId: string, optionName: string) {
    const cur = c.choiceSelections[key] ?? [];
    if (cur.includes(optionId)) { setPicks(key, cur.filter((x) => x !== optionId)); return; }
    if (cur.length >= choice.choose) return; // at limit for this choice
    // Picking a skill already proficient elsewhere → mastery decision.
    if (choice.type === 'skill' && c.granted.skills.includes(optionId)) {
      const level = c.granted.skillMastery[optionId] ?? 0;
      setPending({ key, skillId: optionId, skillName: optionName, nextLevel: level + 1, tooMuch: level >= MAX_MASTERY });
      return;
    }
    setPicks(key, [...cur, optionId]);
  }

  function confirmMastery() {
    if (!pending || pending.tooMuch) return;
    const cur = c.choiceSelections[pending.key] ?? [];
    setPicks(pending.key, [...cur, pending.skillId]);
    setPending(null);
  }

  return (
    <div className="choice-resolver">
      {choices.map(({ key, sourceName, choice, options }) => {
        const picks = c.choiceSelections[key] ?? [];
        const remaining = choice.choose - picks.length;
        if (options.length === 0) return null;
        return (
          <div key={key} className="choice-block">
            <span className="choice-label">
              {sourceName}: choose {choice.choose} {TYPE_LABEL[choice.type]}{choice.choose > 1 ? 's' : ''}
              {choice.bonus ? ` (+${choice.bonus} each)` : ''}
              <span className={`choice-remaining${remaining === 0 ? ' choice-remaining--done' : ''}`}>
                {remaining > 0 ? `${remaining} left` : '✓'}
              </span>
            </span>
            <div className="chip-row chip-row--wrap">
              {options.map((opt) => {
                const on = picks.includes(opt.id);
                const atLimit = !on && picks.length >= choice.choose;
                const mastery = choice.type === 'skill' ? (c.granted.skillMastery[opt.id] ?? 0) : 0;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`pill${on ? ' pill--on' : ''}${mastery > 0 ? ' pill--expert' : ''}${atLimit ? ' pill--disabled' : ''}`}
                    disabled={atLimit}
                    onClick={() => toggle(choice, key, opt.id, opt.name)}
                  >
                    {opt.name}{mastery > 0 ? ` ${'◆'.repeat(mastery)}` : ''}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {pending && (
        <div className="mastery-overlay" onClick={() => setPending(null)}>
          <div className="mastery-modal" onClick={(e) => e.stopPropagation()}>
            {pending.tooMuch ? (
              <>
                <h4>{pending.skillName} is fully mastered</h4>
                <p>You've already mastered {pending.skillName} to the maximum (level {MAX_MASTERY}). Spend this pick on a different skill instead.</p>
                <div className="mastery-actions">
                  <button type="button" className="roll-btn" onClick={() => setPending(null)}>OK</button>
                </div>
              </>
            ) : (
              <>
                <h4>Already proficient in {pending.skillName}</h4>
                <p>
                  You're already proficient in {pending.skillName}. Spend this pick to <strong>increase mastery to level {pending.nextLevel}/{MAX_MASTERY}</strong>
                  {' '}(adds another proficiency bonus), or choose a different skill instead?
                </p>
                <div className="mastery-actions">
                  <button type="button" className="text-btn" onClick={() => setPending(null)}>Choose another</button>
                  <button type="button" className="roll-btn" onClick={confirmMastery}>Increase mastery →{pending.nextLevel}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
