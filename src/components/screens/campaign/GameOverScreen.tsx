import CampaignOutcomeScreen from './CampaignOutcomeScreen';
import {
  createDefaultGameOverSummary,
  type CampaignOutcomeSummary,
  type GameOverCause,
} from './CampaignOutcomeData';

export type { GameOverCause };

interface Props {
  onClose: () => void;
  cause?: GameOverCause;
  summary?: CampaignOutcomeSummary;
  onLoadSave?: () => void;
  onMainMenu?: () => void;
  onPurchaseFullGame?: () => void;
}

export default function GameOverScreen({
  onClose,
  cause = 'rebellion',
  summary,
  onLoadSave,
  onMainMenu,
  onPurchaseFullGame,
}: Props) {
  return (
    <CampaignOutcomeScreen
      kind="defeat"
      summary={summary ?? createDefaultGameOverSummary(cause)}
      onClose={onClose}
      onLoadSave={onLoadSave}
      onMainMenu={onMainMenu}
      onPurchaseFullGame={cause === 'demo_expired' ? onPurchaseFullGame : undefined}
    />
  );
}
