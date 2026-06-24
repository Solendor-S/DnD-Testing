import type { RollResult } from '@dnd/shared';
import { ABILITY_NAMES } from '@dnd/shared';
import { formatModifier } from '../../lib/formatters';

/** Renders a single roll: label, per-die chips (kept highlighted), modifier, total. */
export function RollResultCard({ result }: { result: RollResult }) {
  const { groups, modifier, total, label, expression, crit, fumble, saveDc } = result;

  return (
    <div className={`roll-card${crit ? ' roll-card--crit' : ''}${fumble ? ' roll-card--fumble' : ''}`}>
      <div className="roll-card-head">
        <span className="roll-card-label">{label}</span>
        <span className="roll-card-expr">{expression}</span>
      </div>

      <div className="roll-card-body">
        <div className="roll-dice">
          {groups.map((g, gi) => (
            <span key={gi} className="roll-group">
              {g.rolls.map((v, i) => (
                <span
                  key={i}
                  className={
                    'die-chip'
                    + (g.kept[i] ? '' : ' die-chip--dropped')
                    + (g.sides === 20 && g.kept[i] && v === 20 ? ' die-chip--max' : '')
                    + (g.sides === 20 && g.kept[i] && v === 1 ? ' die-chip--min' : '')
                  }
                  title={`d${g.sides}`}
                >
                  {v}
                </span>
              ))}
            </span>
          ))}
          {modifier !== 0 && <span className="roll-mod">{formatModifier(modifier)}</span>}
        </div>

        <div className="roll-total">
          {total}
          {crit && <span className="roll-badge roll-badge--crit">CRIT</span>}
          {fumble && <span className="roll-badge roll-badge--fumble">FUMBLE</span>}
        </div>
      </div>

      {saveDc && (
        <div className="roll-save-line">
          DC <strong>{saveDc.dc}</strong> {ABILITY_NAMES[saveDc.ability]} save
          {saveDc.onSuccess ? ` — ${saveDc.onSuccess} on success` : ''}
        </div>
      )}
    </div>
  );
}
