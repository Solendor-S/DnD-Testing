import { ActiveStatsPanel } from './ActiveStatsPanel';
import { QuickDicePanel } from './QuickDicePanel';
import { NotationInput } from './NotationInput';
import { StructuredRollPanel } from './StructuredRollPanel';
import { AttackDamagePanel } from './AttackDamagePanel';
import { RollHistory } from './RollHistory';

/** The Dice tab: active-stats panel on the left, rollers + history on the right. */
export function DiceView() {
  return (
    <div className="dice-view">
      <ActiveStatsPanel />
      <div className="dice-main">
        <div className="dice-rollers">
          <QuickDicePanel />
          <NotationInput />
          <StructuredRollPanel />
          <AttackDamagePanel />
        </div>
        <RollHistory />
      </div>
    </div>
  );
}
