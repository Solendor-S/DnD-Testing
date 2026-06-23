import type { MonsterDetail } from '@dnd/shared';
import { abilityModifier, formatCr, formatSpeed, titleCase } from '../lib/formatters';

export function StatBlock({ monster: m }: { monster: MonsterDetail }) {
  const abilities: [string, number][] = [
    ['STR', m.abilityScores.str],
    ['DEX', m.abilityScores.dex],
    ['CON', m.abilityScores.con],
    ['INT', m.abilityScores.int],
    ['WIS', m.abilityScores.wis],
    ['CHA', m.abilityScores.cha],
  ];

  return (
    <article className="statblock">
      <h2 className="statblock-name">{m.name}</h2>
      <p className="statblock-meta">
        {m.size} {titleCase(m.type)}{m.subtype ? ` (${m.subtype})` : ''}, {m.alignment}
      </p>
      <div className="statblock-rule" />

      <dl className="statblock-lines">
        <div><dt>Armor Class</dt><dd>{m.ac}</dd></div>
        <div><dt>Hit Points</dt><dd>{m.hp}</dd></div>
        <div><dt>Speed</dt><dd>{formatSpeed(m.speed as Record<string, string>)}</dd></div>
      </dl>
      <div className="statblock-rule" />

      <div className="statblock-abilities">
        {abilities.map(([label, score]) => (
          <div key={label} className="statblock-ability">
            <span className="ability-label">{label}</span>
            <span className="ability-score">{score} ({abilityModifier(score)})</span>
          </div>
        ))}
      </div>
      <div className="statblock-rule" />

      <dl className="statblock-lines">
        {m.damageVulnerabilities.length > 0 && <div><dt>Vulnerabilities</dt><dd>{m.damageVulnerabilities.join(', ')}</dd></div>}
        {m.damageResistances.length > 0 && <div><dt>Resistances</dt><dd>{m.damageResistances.join(', ')}</dd></div>}
        {m.damageImmunities.length > 0 && <div><dt>Damage Immunities</dt><dd>{m.damageImmunities.join(', ')}</dd></div>}
        {m.conditionImmunities.length > 0 && <div><dt>Condition Immunities</dt><dd>{m.conditionImmunities.join(', ')}</dd></div>}
        {m.languages && <div><dt>Languages</dt><dd>{m.languages}</dd></div>}
        <div><dt>Challenge</dt><dd>{formatCr(m.cr)} ({m.xp.toLocaleString()} XP)</dd></div>
      </dl>

      {m.specialAbilities.length > 0 && (
        <Section title="Traits" items={m.specialAbilities} />
      )}
      {m.actions.length > 0 && <Section title="Actions" items={m.actions} />}
      {m.legendaryActions.length > 0 && <Section title="Legendary Actions" items={m.legendaryActions} />}
    </article>
  );
}

function Section({ title, items }: { title: string; items: { name: string; desc: string }[] }) {
  return (
    <section className="statblock-section">
      <h3 className="statblock-section-title">{title}</h3>
      {items.map((it, i) => (
        <p key={i} className="statblock-entry">
          <strong>{it.name}.</strong> {it.desc}
        </p>
      ))}
    </section>
  );
}
