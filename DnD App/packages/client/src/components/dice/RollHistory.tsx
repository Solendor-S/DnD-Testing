import { useDiceContext } from '../../context/ActiveStatsContext';
import { RollResultCard } from './RollResultCard';

export function RollHistory() {
  const { history, clearHistory, persist, setPersist } = useDiceContext();

  return (
    <section className="dice-section roll-history">
      <div className="dice-section-head">
        <h3 className="dice-section-title">History</h3>
        <div className="history-controls">
          <label className="persist-toggle">
            <input type="checkbox" checked={persist} onChange={(e) => setPersist(e.target.checked)} />
            Save across restarts
          </label>
          <button className="text-btn" type="button" onClick={clearHistory} disabled={history.length === 0}>
            Clear
          </button>
        </div>
      </div>

      {history.length === 0 ? (
        <p className="history-empty">No rolls yet. Roll some dice above.</p>
      ) : (
        <div className="history-list">
          {history.map((r) => <RollResultCard key={r.id} result={r} />)}
        </div>
      )}
    </section>
  );
}
