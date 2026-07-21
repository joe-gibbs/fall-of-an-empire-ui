import React, { useCallback, useRef, useState } from 'react';
import Tooltip, { type TooltipContent, type TooltipLine } from '../common/tooltips/Tooltip';
import { useGameState } from '../../context/GameContext';
import { WebkilnAssetPath } from '../../utils/assets';
import {
  bridgeCall,
  type GetSeasonEffectsResponse,
  type SeasonResourceEffect,
} from '../../bridge-types.generated';
import { formatNumber, formatSignedNumber } from '../../utils/numberFormat';

import { webUIText } from '../../localization/WebUITextContext';
type SeasonKey = 'spring' | 'summer' | 'autumn' | 'winter';
type ClimateTrendDirection = 'warming' | 'cooling' | null;

const CLIMATE_TREND_THRESHOLD = 0.003;

const seasonForMonth = (month: number): SeasonKey => {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
};

const seasonFromLabel = (label: string, month: number): SeasonKey => {
  const normalized = label.toLowerCase();
  if (normalized === 'spring') return 'spring';
  if (normalized === 'summer') return 'summer';
  if (normalized === 'autumn') return 'autumn';
  if (normalized === 'winter') return 'winter';
  return seasonForMonth(month);
};

const seasonIconName = (season: SeasonKey): string => (
  season.charAt(0).toUpperCase() + season.slice(1)
);

const climateTrendDirection = (trend: number): ClimateTrendDirection => {
  if (trend > CLIMATE_TREND_THRESHOLD) return 'warming';
  if (trend < -CLIMATE_TREND_THRESHOLD) return 'cooling';
  return null;
};

const climateTrendIcon = (direction: Exclude<ClimateTrendDirection, null>): string => (
  direction === 'warming' ? '/assets/icons/I_Warming.png' : '/assets/icons/I_Cooling.png'
);

const signedValueColour = (value: number, positiveIsGood: boolean): string => {
  if (Math.abs(value) <= 0.0001) return 'var(--text-muted)';
  return (value > 0) === positiveIsGood ? 'var(--green)' : 'var(--red)';
};

const buildTooltip = (
  dateText: string,
  seasonLabel: string,
  season: SeasonKey,
  climateDescription: string,
  trendDirection: ClimateTrendDirection,
  seasonEffects: GetSeasonEffectsResponse | null,
): TooltipContent => {
  const lines: TooltipLine[] = [
    { label: webUIText('Auto.Prop.ComponentsTopbarDateDisplay.52.1'), value: seasonLabel || seasonIconName(season) },
  ];

  if (climateDescription) {
    lines.push({ label: webUIText('Topbar.Climate'), value: climateDescription });
  }

  if (trendDirection) {
    lines.push({
      label: webUIText('Topbar.ClimateTrend'),
      value: trendDirection === 'warming'
        ? webUIText('Topbar.ClimateWarming')
        : webUIText('Topbar.ClimateCooling'),
      valueIcon: climateTrendIcon(trendDirection),
    });
  }

  if (seasonEffects) {
    lines.push({ label: webUIText('Topbar.SeasonEffects'), isHeader: true });
    if (seasonEffects.resourceEffects.length === 0) {
      lines.push({ label: webUIText('Topbar.SeasonNoProductionEffects') });
    } else {
      seasonEffects.resourceEffects.forEach((effect: SeasonResourceEffect) => {
        lines.push({
          label: webUIText('Topbar.SeasonProductionEffect', { Resource: effect.resourceName }),
          value: `${formatSignedNumber(effect.modifierPercent, { maximumFractionDigits: 1 })}%`,
          valueColor: signedValueColour(effect.modifierPercent, true),
          valueIcon: `/assets/resources/${effect.resourceId}.png`,
        });
      });
    }

    lines.push({
      label: webUIText('Topbar.SeasonBuildingCondition'),
      value: webUIText('Topbar.SeasonPerMonthValue', {
        Value: formatSignedNumber(seasonEffects.buildingConditionChangePerMonth, { maximumFractionDigits: 2 }),
      }),
      valueColor: signedValueColour(seasonEffects.buildingConditionChangePerMonth, true),
      valueIcon: '/assets/icons/I_BuildingsQuickButton.png',
    });
    lines.push({
      label: webUIText('Topbar.SeasonSnowSeverity'),
      value: webUIText('Topbar.SeasonMultiplierValue', {
        Value: formatNumber(seasonEffects.snowSeverityMultiplier, { maximumFractionDigits: 2 }),
      }),
      valueColor: signedValueColour(seasonEffects.snowSeverityMultiplier - 1, false),
      valueIcon: '/assets/icons/Terrain/I_SnowAttrition.png',
    });
    lines.push({
      label: webUIText('Topbar.SeasonTerrainDryness'),
      value: `${formatSignedNumber(seasonEffects.terrainDrynessModifierPercent, { maximumFractionDigits: 1 })}%`,
      valueColor: signedValueColour(seasonEffects.terrainDrynessModifierPercent, false),
      valueIcon: '/assets/icons/Terrain/I_DesertAttrition.png',
    });

    if (seasonEffects.diseaseEffects.length > 0) {
      lines.push({ label: webUIText('Topbar.SeasonDiseaseEffects'), isHeader: true });
      seasonEffects.diseaseEffects.forEach((effect) => {
        lines.push({
          label: effect.diseaseName,
          value: `${formatSignedNumber(effect.modifierPercent, { maximumFractionDigits: 1 })}%`,
          valueColor: signedValueColour(effect.modifierPercent, false),
          valueIcon: '/assets/icons/I_Skull.png',
        });
      });
    }
  }

  return {
    title: dateText,
    lines,
    footer: seasonEffects ? webUIText('Topbar.SeasonEffectsFooter') : undefined,
  };
};

const DateDisplay: React.FC = () => {
  const {
    date,
    dateText,
    isPaused,
    speed,
    season: seasonLabel,
    climateTrend,
    climateDescription,
    gameDay,
  } = useGameState();
  const [seasonEffects, setSeasonEffects] = useState<GetSeasonEffectsResponse | null>(null);
  const requestedGameDayRef = useRef<number | null>(null);
  const currentGameDayRef = useRef(gameDay);
  currentGameDayRef.current = gameDay;

  const requestSeasonEffects = useCallback(() => {
    if (seasonEffects?.gameDay === gameDay || requestedGameDayRef.current === gameDay) return;
    requestedGameDayRef.current = gameDay;
    bridgeCall('game.get_season_effects')
      .then((response) => {
        if (response.gameDay === currentGameDayRef.current) {
          setSeasonEffects(response);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (requestedGameDayRef.current === gameDay) requestedGameDayRef.current = null;
      });
  }, [gameDay, seasonEffects?.gameDay]);

  const { month } = date;
  const displayMonth = Math.round(month);
  const season = seasonFromLabel(seasonLabel, displayMonth);
  const seasonIcon = WebkilnAssetPath(`/assets/icons/Seasons/I_${seasonIconName(season)}.png`);
  const trendDirection = climateTrendDirection(climateTrend);
  const trendIcon = trendDirection ? climateTrendIcon(trendDirection) : null;
  const trendLabel = trendDirection === 'warming'
    ? webUIText('Topbar.ClimateWarming')
    : trendDirection === 'cooling'
      ? webUIText('Topbar.ClimateCooling')
      : '';
  const tooltip = buildTooltip(
    dateText,
    seasonLabel,
    season,
    climateDescription,
    trendDirection,
    seasonEffects?.gameDay === gameDay ? seasonEffects : null,
  );

  return (
    <Tooltip content={tooltip} position="bottom" delay={200} onShowIntent={requestSeasonEffects}>
      <div className="date-display" data-tutorial-target="DateDisplay SeasonDisplay" aria-label={tooltip.title}>
        <img
          src={seasonIcon}
          alt={seasonLabel || season}
          className="date-display-season-icon"
        />
        {trendIcon && (
          <img
            src={trendIcon}
            alt={trendLabel}
            className={`date-display-climate-icon date-display-climate-icon--${trendDirection}`}
          />
        )}
        <span className="date-display-text">
          {dateText}
        </span>
        <span className={`date-display-status ${isPaused ? 'date-display-status--paused' : ''}`}>
          {isPaused ? webUIText("Auto.Fix.ExprTrue.componentstopbarDateDisplay.85.1") : webUIText("Auto.Fix.ExprFalse.componentstopbarDateDisplay.85.1", { Speed: speed })}
        </span>
      </div>
    </Tooltip>
  );
};

export default DateDisplay;
