import { useCallback, useEffect, useState } from 'react';
import { bridgeCall, onBridgeEvent } from '../../bridge-types.generated.ts';
import type { ConfirmMilitaryMergePrompt } from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';
import { GAMEPLAY_CONTEXT_RESET_EVENT } from '../core/gameplayCacheReset';
import { bridgeEvents } from '../core/bridgeEvents';
import { webUIText } from '../../localization/WebUITextContext';

function formatSourceNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) {
    return webUIText('Military.MergeConfirm.TwoSources', {
      First: names[0],
      Second: names[1],
    });
  }

  return webUIText('Military.MergeConfirm.ManySources', {
    List: names.slice(0, -1).join(', '),
    Last: names[names.length - 1],
  });
}

export function useMilitaryMergeConfirmBridge() {
  const [prompt, setPrompt] = useState<ConfirmMilitaryMergePrompt | null>(null);

  useEffect(() => onBridgeEvent('game.confirm_military_merge', (event) => {
    if (!event.open) {
      setPrompt(null);
      return;
    }

    setPrompt(event);
  }), []);

  useEffect(() => {
    const handleReset = () => setPrompt(null);
    bridgeEvents.addEventListener(GAMEPLAY_CONTEXT_RESET_EVENT, handleReset);
    return () => bridgeEvents.removeEventListener(GAMEPLAY_CONTEXT_RESET_EVENT, handleReset);
  }, []);

  const confirm = useCallback(() => {
    if (!prompt) return;

    bridgeCall('game.confirm_military_merge', {
      confirmed: true,
      targetMilitaryId: prompt.targetMilitaryId,
      sourceMilitaryIds: prompt.sourceMilitaryIds,
      queue: prompt.queue,
      createNewTemplate: prompt.createNewTemplate,
    }).catch(error => acknowledgeBridgeFailure(error, 'game.confirm_military_merge'));
  }, [prompt]);

  const cancel = useCallback(() => {
    setPrompt(null);
  }, []);

  const visible = Boolean(prompt?.open);
  const isNavy = prompt?.isNavy ?? false;
  const sources = formatSourceNames(prompt?.sourceNames ?? []);
  const target = prompt?.targetName ?? '';

  return {
    visible,
    title: webUIText(isNavy ? 'Military.MergeConfirm.TitleNavy' : 'Military.MergeConfirm.TitleArmy'),
    message: webUIText(
      isNavy ? 'Military.MergeConfirm.MessageNavy' : 'Military.MergeConfirm.MessageArmy',
      { Sources: sources, Target: target },
    ),
    confirmText: webUIText('Military.MergeConfirm.Confirm'),
    confirm,
    cancel,
  };
}
