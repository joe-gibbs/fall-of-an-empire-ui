import { useCallback, useMemo, useState } from 'react';
import { bridgeCall } from '../../bridge-types.generated.ts';
import type { Event as GameEvent, EventChoiceInputs } from '../../data/types';
import { webUIText } from '../../localization/WebUITextContext';
import { WebkilnAssetPath } from '../../utils/assets';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';
import { useProvinceModeOverviewBridge } from './useProvinceModeOverviewBridge';

export function useProvinceRecallBridge(enabled: boolean): {
  event: GameEvent | null;
  chooseOption: (optionIndex: number, inputs?: EventChoiceInputs) => void;
} {
  const overview = useProvinceModeOverviewBridge(enabled);
  const [answeredEventId, setAnsweredEventId] = useState<string | null>(null);

  const event = useMemo<GameEvent | null>(() => {
    if (!enabled || !overview?.active || overview.recallStage < 4) return null;

    const id = `province-recall:${overview.province.id}:${overview.governor.id}`;
    if (id === answeredEventId) return null;

    return {
      id,
      title: webUIText('ProvinceMode.RecallEvent.Title'),
      body: webUIText('ProvinceMode.RecallEvent.Body', {
        Emperor: overview.emperor.name,
        Province: overview.province.name,
      }),
      image: WebkilnAssetPath('/assets/events/interaction-replace-governor.png') ?? null,
      presentationStyle: 'important',
      previousEvents: [],
      options: [
        {
          text: webUIText('ProvinceMode.RecallEvent.Accept'),
          tooltip: webUIText('ProvinceMode.RecallEvent.AcceptTooltip'),
        },
        {
          text: webUIText('ProvinceMode.RecallEvent.Refuse'),
          tooltip: webUIText('ProvinceMode.RecallEvent.RefuseTooltip'),
        },
      ],
    };
  }, [answeredEventId, enabled, overview]);

  const chooseOption = useCallback((optionIndex: number) => {
    if (!event) return;
    setAnsweredEventId(event.id);
    bridgeCall('game.respond_to_province_recall', { acceptRecall: optionIndex === 0 })
      .then(response => {
        if (!response.success) {
          setAnsweredEventId(null);
        }
      })
      .catch(error => {
        acknowledgeBridgeFailure(error);
        setAnsweredEventId(null);
      });
  }, [event]);

  return { event, chooseOption };
}
