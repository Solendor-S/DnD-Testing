import { useState } from 'react';
import { useDiceRoller } from '../../hooks/useDiceRoller';

export function NotationInput() {
  const roller = useDiceRoller();
  const [expr, setExpr] = useState('');
  const [error, setError] = useState<string | null>(null);

  function roll() {
    const value = expr.trim();
    if (!value) return;
    try {
      roller.expression(value);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid expression');
    }
  }

  return (
    <section className="dice-section">
      <h3 className="dice-section-title">Notation</h3>
      <div className="notation-row">
        <input
          className="notation-input"
          value={expr}
          placeholder="e.g. 2d6 + 1d4 + 3, or 4d6dl1"
          onChange={(e) => setExpr(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && roll()}
        />
        <button className="roll-btn" onClick={roll} type="button">Roll</button>
      </div>
      {error && <p className="notation-error">{error}</p>}
    </section>
  );
}
