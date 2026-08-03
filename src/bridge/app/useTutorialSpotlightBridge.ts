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
  const spotlight = {
    ...HIDDEN_SPOTLIGHT,
    ...next,
    currentPage: Math.max(0, Math.round(next.currentPage ?? 0)),
    totalPages: Math.max(0, Math.round(next.totalPages ?? 0)),
    requiredUnitCount: Math.max(1, Math.round(next.requiredUnitCount ?? 1)),
  };
  if (spotlight.isBuildingTarget && spotlight.targetDetail) {
    window.dispatchEvent(new CustomEvent('tutorial:building-target-request', { detail: spotlight.targetDetail }));
  }
  if (spotlight.isUnitTarget && spotlight.targetDetail) {
    window.dispatchEvent(new CustomEvent('tutorial:unit-target-request', { detail: spotlight.targetDetail }));
  }
  return spotlight;
}

export function useTutorialSpotlightBridge() {
  const [spotlight, setSpotlight] = useState<TutorialSpotlightResponse>(HIDDEN_SPOTLIGHT);

  useEffect(() => onBridgeEvent('game.tutorial_spotlight', (event) => {
    setSpotlight(normaliseSpotlight(event));
  }), []);

  useEffect(() => {
    bridgeCall('game.tutorial_spotlight', { command: 'bind', eventId: '', direction: 0 })
      .then(response => setSpotlight(normaliseSpotlight(response)))
      .catch(error => acknowledgeBridgeFailure(error, 'game.tutorial_spotlight'));
  }, []);

  const resolve = useCallback((eventId: string) => {
    bridgeCall('game.tutorial_spotlight', { command: 'resolve', eventId, direction: 0 })
      .then(response => setSpotlight(normaliseSpotlight(response)))
      .catch(error => acknowledgeBridgeFailure(error, 'game.tutorial_spotlight'));
  }, []);

  const dismiss = useCallback((eventId: string) => {
    bridgeCall('game.tutorial_spotlight', { command: 'dismiss', eventId, direction: 0 })
      .then(response => setSpotlight(normaliseSpotlight(response)))
      .catch(error => acknowledgeBridgeFailure(error, 'game.tutorial_spotlight'));
  }, []);

  const navigate = useCallback((direction: -1 | 1) => {
    bridgeCall('game.tutorial_spotlight', { command: 'navigate', eventId: spotlight.eventId, direction })
      .then(response => setSpotlight(normaliseSpotlight(response)))
      .catch(error => acknowledgeBridgeFailure(error, 'game.tutorial_spotlight'));
  }, [spotlight.eventId]);

  return { spotlight, resolve, dismiss, navigate };
}
