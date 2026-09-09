import { formatSignedNumber } from '../../../../utils/numberFormat';
import { webUIText } from '../../../../localization/WebUITextContext';
import './WarScoreProgress.css';

interface WarScoreProgressProps {
  score: number;
  className?: string;
}

function formatWarScoreLabel(score: number): string {
  const rounded = Math.round(score * 10) / 10;
  const formatted = formatSignedNumber(rounded);
  if (score > 0) return webUIText('PeaceNegotiation.WarScoreWinning', { Score: formatted });
  if (score < 0) return webUIText('PeaceNegotiation.WarScoreLosing', { Score: formatted });
  return webUIText('PeaceNegotiation.WarScoreStalemate', { Score: formatted });
}

export default function WarScoreProgress({ score, className = '' }: WarScoreProgressProps) {
  const scale = Math.min(1, Math.abs(score) / 100).toFixed(3);

  return (
    <div className={`war-score-progress${className ? ` ${className}` : ''}`}>
      <div className="war-score-progress-track">
        <div className="war-score-progress-center" />
        {score > 0 ? (
          <div
            className="war-score-progress-fill war-score-progress-fill--ours"
            style={{ transform: `scaleX(${scale})` }}
          />
        ) : null}
        {score < 0 ? (
          <div
            className="war-score-progress-fill war-score-progress-fill--theirs"
            style={{ transform: `scaleX(${scale})` }}
          />
        ) : null}
      </div>
      <span className="war-score-progress-value">{formatWarScoreLabel(score)}</span>
    </div>
  );
}
