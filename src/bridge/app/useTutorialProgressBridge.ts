import { useBridgeQuery } from '../core/useBridgeQuery';
import type { GetTutorialProgressResponse } from '../../bridge-types.generated.ts';

export interface TutorialProgressStep {
  text: string;
  isComplete: boolean;
}

export interface TutorialProgressState {
  steps: TutorialProgressStep[];
}

function mapTutorialProgress(data: GetTutorialProgressResponse): TutorialProgressState | null {
  if (!data.isVisible || data.steps.length === 0) return null;

  return {
    steps: data.steps.map(step => ({
      text: step.text,
      isComplete: step.isComplete,
    })),
  };
}

export function useTutorialProgressBridge(): TutorialProgressState | null {
  return useBridgeQuery({
    action: 'game.get_tutorial_progress',
    map: mapTutorialProgress,
  });
}
