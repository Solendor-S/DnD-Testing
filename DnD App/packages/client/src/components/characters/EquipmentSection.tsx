import type { Character, InventoryItem } from '@dnd/shared';
import { carryingCapacity, encumberedAt, heavilyEncumberedAt, coinsToGp } from '@dnd/shared';
import { newItemId } from '../../lib/character';

interface Props {
  character: Character;
  onChange: (patch: Partial<Character>) => void;
}

const COIN_KEYS = ['cp', 'sp', 'ep', 'gp', 'pp'] as const;

export function EquipmentSection({ character: c, onChange }: Props) {
  function addItem() {
    onChange({ inventory: [...c.inventory, { id: newItemId(), qty: 1, name: '', cost: '', weight: 0 }] });
  }
  function updateItem(id: string, p: Partial<InventoryItem>) {
    onChange({ inventory: c.inventory.map((it) => (it.id === id ? { ...it, ...p } : it)) });
  }
  function removeItem(id: string) {
    onChange({ inventory: c.inventory.filter((it) => it.id !== id) });
  }

  const totalWeight = c.inventory.reduce((sum, it) => sum + it.weight * it.qty, 0);
  const capacity = carryingCapacity(c.abilities.str);
  const encumbrance = totalWeight > heavilyEncumberedAt(c.abilities.str) ? 'Heavily encumbered'
    : totalWeight > encumberedAt(c.abilities.str) ? 'Encumbered' : 'Unencumbered';

  return (
    <div className="equipment-section">
      <div className="inventory-list">
        {c.inventory.map((it) => (
          <div key={it.id} className="inventory-row">
            <input className="inv-qty" type="number" min={1} value={it.qty} onChange={(e) => updateItem(it.id, { qty: Number(e.target.value) || 1 })} />
            <input className="inv-name" placeholder="Item" value={it.name} onChange={(e) => updateItem(it.id, { name: e.target.value })} />
            <input className="inv-cost" placeholder="Cost" value={it.cost} onChange={(e) => updateItem(it.id, { cost: e.target.value })} />
            <input className="inv-weight" type="number" step="0.1" placeholder="lb" value={it.weight} onChange={(e) => updateItem(it.id, { weight: Number(e.target.value) || 0 })} />
            <button type="button" className="text-btn" onClick={() => removeItem(it.id)}>✕</button>
          </div>
        ))}
        <button type="button" className="text-btn" onClick={addItem}>+ Add item</button>
      </div>

      <div className="equip-summary">
        <span>Weight: <strong>{totalWeight.toFixed(1)}</strong> / {capacity} lb</span>
        <span className={encumbrance !== 'Unencumbered' ? 'over-budget' : ''}>{encumbrance}</span>
      </div>

      <div className="coins-row">
        <span className="field-label">Wealth</span>
        {COIN_KEYS.map((k) => (
          <label key={k} className="coin-field">
            {k.toUpperCase()}
            <input type="number" min={0} value={c.coins[k]} onChange={(e) => onChange({ coins: { ...c.coins, [k]: Number(e.target.value) || 0 } })} />
          </label>
        ))}
        <span className="coin-total">= {coinsToGp(c.coins).toFixed(2)} gp</span>
      </div>
    </div>
  );
}
