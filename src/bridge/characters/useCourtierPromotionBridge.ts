import { useEffect, useState } from 'react';
import { bridgeCall } from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';
import type { CourtierType, StatKey, StatRange } from '../../data/courtierTypes';
import { WebkilnAssetPath } from '../../utils/assets';

interface CourtierPromotionEvent {
  settlementId: string;
  settlementName: string;
  playerGold: number;
  promotionCost: number;
}

interface BridgeStatRange {
  statistic: string;
  min: number;
  max: number;
  mean: number;
}

interface BridgeCourtierType {
  id: string;
  title: string;
  description: string;
  backgroundImage: string;
  foregroundImage: string;
  ageMin: number;
  ageMax: number;
  minTraits: number;
  maxTraits: number;
  stats: BridgeStatRange[];
}

export interface CourtierPromotionState {
  open: boolean;
  settlementId: string;
  settlementName: string;
  playerGold: number;
  promotionCost: number;
  types: CourtierType[];
}

const INITIAL: CourtierPromotionState = {
  open: false,
  settlementId: '',
  settlementName: '',
  playerGold: 0,
  promotionCost: 500,
  types: [],
};

const STAT_KEYS: readonly StatKey[] = [
  'tactics', 'authority', 'cunning', 'governance', 'loyalty', 'constitution',
];

function defaultRange(): StatRange { return { min: 0, max: 0 }; }

function mapBridgeType(t: BridgeCourtierType): CourtierType {
  const stats = STAT_KEYS.reduce<Record<StatKey, StatRange>>((acc, key) => {
    acc[key] = defaultRange();
    return acc;
  }, {} as Record<StatKey, StatRange>);

  for (const entry of t.stats) {
    const key = entry.statistic.toLowerCase() as StatKey;
    if (STAT_KEYS.includes(key)) {
      stats[key] = { min: entry.min, max: entry.max };
    }
  }

  return {
    id: t.id,
    title: t.title,
    description: t.description,
    background: WebkilnAssetPath(t.backgroundImage) ?? '',
    foreground: WebkilnAssetPath(t.foregroundImage) ?? '',
    ageRange: { min: t.ageMin, max: t.ageMax },
    stats,
    traitPool: [],
    minTraits: t.minTraits,
    maxTraits: t.maxTraits,
  };
}

let costCache = 500;

/**
 * Listens for ui.courtier_promotion_event pushes from the game. The game
 * broadcasts a payload with a settlementId when it wants the modal open, and
 * an empty settlementId when it wants it closed.
 *
 * The close path is local-only (no bridge round-trip) to avoid a feedback
 * loop with UUISubsystem::HideCourtierPromotion.
 */
export function useCourtierPromotionBridge() {
  const [state, setState] = useState<CourtierPromotionState>({
    ...INITIAL,
    types: [],
    promotionCost: costCache,
  });

  useEffect(() => {
    let cancelled = false;
    const handler = async (e: Event) => {
      const data = (e as CustomEvent).detail as CourtierPromotionEvent | undefined;
      if (!data) return;

      console.log('[Bridge] push: courtier_promotion_event', data);

      if (!data.settlementId) {
        setState(s => ({ ...INITIAL, types: s.types, promotionCost: s.promotionCost }));
        return;
      }

      let cost = data.promotionCost;
      let types: CourtierType[] = [];
      try {
        const result = await bridgeCall('game.get_courtier_types', { settlementId: data.settlementId });
        if (cancelled) return;
        types = result.types.map(mapBridgeType);
        cost = result.promotionCost;
        costCache = cost;
      } catch (error) {
        acknowledgeBridgeFailure(error);
      }

      setState({
        open: true,
        settlementId: data.settlementId,
        settlementName: data.settlementName,
        playerGold: data.playerGold,
        promotionCost: cost,
        types,
      });
    };

    window.addEventListener('bridge:ui.courtier_promotion_event', handler as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener('bridge:ui.courtier_promotion_event', handler as EventListener);
    };
  }, []);

  const close = () => setState(s => ({ ...INITIAL, types: s.types, promotionCost: s.promotionCost }));

  const promote = async (courtierTypeId: string) => {
    const result = await bridgeCall('game.promote_courtier', {
      settlementId: state.settlementId,
      courtierTypeId,
    });
    if (result.success) {
      setState(s => ({ ...INITIAL, types: s.types, promotionCost: s.promotionCost }));
    }
    return result;
  };

  return { state, close, promote };
}
