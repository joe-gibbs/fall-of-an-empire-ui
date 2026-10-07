import { buildIncomeTooltip } from './IncomeBreakdownDetails';
import React, { useEffect, useState } from 'react';
import Tooltip from '../common/tooltips/Tooltip';
import { useGameState } from '../../context/GameContext';
import { useBridgeQuery } from '../../bridge/core/useBridgeQuery';
import { acknowledgeBridgeFailure } from '../../bridge/core/runtimeEngine';
import { bridgeCall } from '../../bridge-types.generated.ts';
import type { GetIncomeBreakdownResponse } from '../../bridge-types.generated.ts';
import { formatNumber } from '../../utils/numberFormat';

import { webUIText } from '../../localization/WebUITextContext';
const FPS_UPDATE_MS = 200;

function useFpsCounter(active: boolean): number {
  const [fps, setFps] = useState(0);

  useEffect(() => {
    if (!active) {
      return;
    }

    let frameId = 0;
    let frames = 0;
    let lastUpdate = Date.now();

    const tick = () => {
      frames += 1;
      const now = Date.now();
      const elapsed = now - lastUpdate;
      if (elapsed >= FPS_UPDATE_MS) {
        setFps(Math.round((frames * 1000) / elapsed));
        frames = 0;
        lastUpdate = now;
      }
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [active]);

  return fps;
}

const ResourceDisplay: React.FC = () => {
  const { gold, goldDelta } = useGameState();
  const [incomeData, setIncomeData] = useState<GetIncomeBreakdownResponse | null>(null);
  const showFpsCounter = useBridgeQuery({
    action: 'game.get_settings',
    map: data => data.graphics.showFpsCounter,
  });
  const fps = useFpsCounter(showFpsCounter === true);

  useEffect(() => {
    bridgeCall('game.get_income_breakdown').then(setIncomeData).catch(acknowledgeBridgeFailure);
  }, [gold, goldDelta]);

  const tooltip = incomeData
    ? buildIncomeTooltip(incomeData)
    : { title: webUIText('Auto.Prop.ComponentsTopbarResourceDisplay.210.21'), lines: [] };
  const deltaSign = goldDelta >= 0 ? '+' : '';
  const deltaClass = goldDelta >= 0 ? 'resource-delta--positive' : 'resource-delta--negative';
  const deltaText = `${deltaSign}${formatNumber(goldDelta)}`;

  return (
    <div className="resource-display">
      {showFpsCounter === true && (
        <>
          <span className="resource-fps">{webUIText('TopbarResource.Fps', { Value1: formatNumber(fps) })}</span>
          <div className="resource-separator" />
        </>
      )}
      <Tooltip content={tooltip} position="bottom">
        <div className="resource-main" data-tutorial-target="ResourceDisplay GoldDisplay IncomeText">
          <img src="/assets/icons/I_Coins.png" alt={webUIText('Auto.Attr.ComponentsTopbarResourceDisplay.224.22')} className="resource-coin-icon" />
          <span className="resource-pop-value">{formatNumber(gold)}</span>
          <span className={`resource-delta ${deltaClass}`}>{deltaText}</span>
        </div>
      </Tooltip>
    </div>
  );
};

export default ResourceDisplay;
