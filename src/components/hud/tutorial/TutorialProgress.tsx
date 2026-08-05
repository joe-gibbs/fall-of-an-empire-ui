import { useState } from 'react';
import type { TutorialProgressState } from '../../../bridge/app/useTutorialProgressBridge';
import { useAnimatedPresence } from '../../../hooks/useAnimatedPresence';
import { useKeyActionResolver } from '../../../hooks/useKeyActionResolver';
import { renderRichText } from '../../../utils/richText';
import './TutorialProgress.css';

interface TutorialProgressProps {
  progress: TutorialProgressState | null;
  placement: 'left' | 'shifted';
  onLinkClick?: (type: string, id: string) => void;
}

const EXIT_DURATION_MS = 160;
const COMPLETE_ICON = '/assets/icons/I_GoalMet.png';
const IN_PROGRESS_ICON = '/assets/icons/I_GoalPartial.png';

export default function TutorialProgress({ progress, placement, onLinkClick }: TutorialProgressProps) {
  const visible = Boolean(progress && progress.steps.length > 0);
  const [renderProgress, setRenderProgress] = useState<TutorialProgressState | null>(progress);
  const { mounted, closing } = useAnimatedPresence(visible, { durationMs: EXIT_DURATION_MS });
  const resolveKeyAction = useKeyActionResolver();

  let currentRenderProgress = renderProgress;
  if (progress && progress !== renderProgress) {
    currentRenderProgress = progress;
    setRenderProgress(progress);
  }

  if (!mounted || !currentRenderProgress) return null;

  return (
    <div
      className={`tutorial-progress-shell tutorial-progress-shell--${placement}${closing ? ' tutorial-progress-shell--closing' : ''}`}
      data-tutorial-target="TutorialProgress"
    >
      <div className="tutorial-progress-panel">
        <div className="tutorial-progress-list">
          {currentRenderProgress.steps.map((step, index) => (
            <div
              key={`${index}:${step.text}`}
              className={`tutorial-progress-step${step.isComplete ? ' tutorial-progress-step--complete' : ''}`}
            >
              <span className="tutorial-progress-icon-wrap" aria-hidden="true">
                <img
                  src={step.isComplete ? COMPLETE_ICON : IN_PROGRESS_ICON}
                  alt=""
                  className="tutorial-progress-icon"
                  draggable={false}
                />
              </span>
              <span className="tutorial-progress-text">
                {renderRichText(step.text, {
                  onLinkClick,
                  linkClassPrefix: 'tutorial-progress-link',
                  keepLinksWithPreviousWord: true,
                  resolveKeyAction,
                })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
