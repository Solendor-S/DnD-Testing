import type { Advantage } from '@dnd/shared';

const OPTIONS: { value: Advantage; label: string }[] = [
  { value: 'disadvantage', label: 'Dis' },
  { value: 'normal', label: 'Normal' },
  { value: 'advantage', label: 'Adv' },
];

interface Props {
  value: Advantage;
  onChange: (value: Advantage) => void;
}

export function AdvantageToggle({ value, onChange }: Props) {
  return (
    <div className="adv-toggle" role="group" aria-label="Advantage">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          className={`adv-btn adv-btn--${o.value}${value === o.value ? ' adv-btn--active' : ''}`}
          onClick={() => onChange(o.value)}
          type="button"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
