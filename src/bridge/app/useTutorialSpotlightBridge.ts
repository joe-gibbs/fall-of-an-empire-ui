import { useCallback, useEffect, useState } from 'react';
import {
  bridgeCall,
  onBridgeEvent,
  type TutorialSpotlightResponse,
} from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';

const HIDDEN_SPOTLIGHT: TutorialSpotlightResponse = {
  isVisible: false,
  eventId: '',
  target: '',
  targetDetail: '',
  title: '',
  body: '',
  currentPage: 0,
  totalPages: 0,
  canGoBack: false,
  canGoForward: false,
  isBuildingTarget: false,
  isUnitTarget: false,
  requiredUnitCount: 1,
};

function normaliseSpotlight(next: TutorialSpotlightResponse | null | undefined): TutorialSpotlightResponse {
  if (!next?.isVisible) return HIDDEN_SPOTLIGHT;
  return {
    ...HIDDEN_SPOTLIGHT,
    ...next,
    currentPage: Math.max(0, Math.round(next.currentPage ?? 0)),
    totalPages: Math.max(0, Math.round(next.totalPages ?? 0)),
    requiredUnitCount: Math.max(1, Math.round(next.requiredUnitCount ?? 1)),
  };
}

function publishSpotlightTargetRequests(spotlight: TutorialSpotlightResponse): void {
  if (!spotlight.isVisible) return;
  if (spotlight.isBuildingTarget && spotlight.targetDetail) {
    window.dispatchEvent(new CustomEvent('tutorial:building-target-request', { detail: spotlight.targetDetail }));
  }
  if (spotlight.isUnitTarget && spotlight.targetDetail) {
    window.dispatchEvent(new CustomEvent('tutorial:unit-target-request', { detail: spotlight.targetDetail }));
  }
}

export function useTutorialSpotlightBridge() {
  const [spotlight, setSpotlight] = useState<TutorialSpotlightResponse>(HIDDEN_SPOTLIGHT);

  const applySpotlight = useCallback((next: TutorialSpotlightResponse | null | undefined) => {
    const normalised = normaliseSpotlight(next);
    setSpotlight((current) => {
      if (
        current.isVisible === normalised.isVisible
        && current.eventId === normalised.eventId
        && current.target === normalised.target
        && current.targetDetail === normalised.targetDetail
        && current.title === normalised.title
        && current.body === normalised.body
        && current.currentPage === normalised.currentPage
        && current.totalPages === normalised.totalPages
        && current.canGoBack === normalised.canGoBack
        && current.canGoForward === normalised.canGoForward
        && current.isBuildingTarget === normalised.isBuildingTarget
        && current.isUnitTarget === normalised.isUnitTarget
        && current.requiredUnitCount === normalised.requiredUnitCount
      ) {
        return current;
      }
      return normalised;
    });
    publishSpotlightTargetRequests(normalised);
  }, []);

  useEffect(() => onBridgeEvent('game.tutorial_spotlight', (event) => {
    applySpotlight(event);
  }), [applySpotlight]);

  useEffect(() => {
    bridgeCall('game.tutorial_spotlight', { command: 'bind', eventId: '', direction: 0 })
      .then(response => applySpotlight(response))
      .catch(error => acknowledgeBridgeFailure(error, 'game.tutorial_spotlight'));
  }, [applySpotlight]);

  const resolve = useCallback((eventId: string) => {
    bridgeCall('game.tutorial_spotlight', { command: 'resolve', eventId, direction: 0 })
      .then(response => applySpotlight(response))
      .catch(error => acknowledgeBridgeFailure(error, 'game.tutorial_spotlight'));
  }, [applySpotlight]);

  const dismiss = useCallback((eventId: string) => {
    bridgeCall('game.tutorial_spotlight', { command: 'dismiss', eventId, direction: 0 })
      .then(response => applySpotlight(response))
      .catch(error => acknowledgeBridgeFailure(error, 'game.tutorial_spotlight'));
  }, [applySpotlight]);

  const navigate = useCallback((direction: -1 | 1) => {
    bridgeCall('game.tutorial_spotlight', { command: 'navigate', eventId: spotlight.eventId, direction })
      .then(response => applySpotlight(response))
      .catch(error => acknowledgeBridgeFailure(error, 'game.tutorial_spotlight'));
  }, [applySpotlight, spotlight.eventId]);

  return { spotlight, resolve, dismiss, navigate };
}
