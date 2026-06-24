import { useState } from 'react';
import type { Advantage } from '@dnd/shared';
import {
  ABILITIES, ABILITY_NAMES, SKILLS,
  abilityMod, saveModifier, skillModifier, initiativeModifier,
} from '@dnd/shared';
import { useDiceContext } from '../../context/ActiveStatsContext';
import { useDiceRoller } from '../../hooks/useDiceRoller';
import { formatModifier } from '../../lib/formatters';
import { AdvantageToggle } from './AdvantageToggle';

export function StructuredRollPanel() {
  const { stats } = useDiceContext();
  const roller = useDiceRoller();
  const [adv, setAdv] = useState<Advantage>('normal');

  return (
    <section className="dice-section">
      <div className="dice-section-head">
        <h3 className="dice-section-title">Checks, Saves &amp; Skills</h3>
        <AdvantageToggle value={adv} onChange={setAdv} />
      </div>

      <div className="structured-block">
        <span className="structured-label">Ability checks</span>
        <div className="btn-grid">
          {ABILITIES.map((id) => (
            <button key={id} className="mod-btn" type="button" onClick={() => roller.abilityCheck(id, adv)}>
              {ABILITY_NAMES[id].slice(0, 3)} <em>{formatModifier(abilityMod(stats.abilities[id]))}</em>
            </button>
          ))}
        </div>
      </div>

      <div className="structured-block">
        <span className="structured-label">Saving throws</span>
        <div className="btn-grid">
          {ABILITIES.map((id) => (
            <button key={id} className="mod-btn" type="button" onClick={() => roller.save(id, adv)}>
              {ABILITY_NAMES[id].slice(0, 3)} <em>{formatModifier(saveModifier(stats, id))}</em>
            </button>
          ))}
          <button className="mod-btn mod-btn--wide" type="button" onClick={() => roller.initiative(adv)}>
            Initiative <em>{formatModifier(initiativeModifier(stats))}</em>
          </button>
        </div>
      </div>

      <div className="structured-block">
        <span className="structured-label">Skills</span>
        <div className="btn-grid btn-grid--skills">
          {SKILLS.map((s) => (
            <button key={s.id} className="mod-btn mod-btn--skill" type="button" onClick={() => roller.skillCheck(s.id, adv)}>
              {s.name} <em>{formatModifier(skillModifier(stats, s.id))}</em>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
