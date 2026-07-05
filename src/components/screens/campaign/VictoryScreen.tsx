import CampaignOutcomeScreen from './CampaignOutcomeScreen';
import {
  createDefaultVictorySummary,
  type CampaignOutcomeSummary,
} from './CampaignOutcomeData';

interface Props {
  onClose: () => void;
  summary?: CampaignOutcomeSummary;
  onContinuePlaying?: () => void;
  onMainMenu?: () => void;
}

export default function VictoryScreen({ onClose, summary, onContinuePlaying, onMainMenu }: Props) {
  return (
    <CampaignOutcomeScreen
      kind="victory"
      summary={summary ?? createDefaultVictorySummary()}
      onClose={onClose}
      onContinuePlaying={onContinuePlaying}
      onMainMenu={onMainMenu}
    />
  );
}
