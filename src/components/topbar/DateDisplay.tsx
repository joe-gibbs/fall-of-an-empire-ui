import React from 'react';
import Tooltip, { type TooltipContent, type TooltipLine } from '../common/tooltips/Tooltip';
import { useGameState } from '../../context/GameContext';

import { webUIText } from '../../localization/WebUITextContext';
type SeasonKey = 'spring' | 'summer' | 'autumn' | 'winter';
type ClimateTrendDirection = 'warming' | 'cooling' | null;

const CLIMATE_TREND_THRESHOLD = 0.003;

const SEASON_FOOTERS: Record<SeasonKey, string> = {
  spring: 'Spring brings steadier conditions for food, supply, and movement.',
  summer: 'Summer is the best season for campaigning and reliable supply.',
  autumn: 'Autumn is harvest season, with ordinary movement and supply conditions.',
  winter: 'Winter reduces food and makes supply and movement harsher.',
};

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

const buildTooltip = (
  dateText: string,
  seasonLabel: string,
  season: SeasonKey,
  climateDescription: string,
  trendDirection: ClimateTrendDirection,
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

  return {
    title: dateText,
    lines,
    footer: SEASON_FOOTERS[season],
  };
};

const DateDisplay: React.FC = () => {
  const { date, dateText, isPaused, speed, season: seasonLabel, climateTrend, climateDescription } = useGameState();
  const { month } = date;
  const displayMonth = Math.round(month);
  const season = seasonFromLabel(seasonLabel, displayMonth);
  const seasonIcon = `/assets/icons/Seasons/I_${seasonIconName(season)}.png`;
  const trendDirection = climateTrendDirection(climateTrend);
  const trendIcon = trendDirection ? climateTrendIcon(trendDirection) : null;
  const trendLabel = trendDirection === 'warming'
    ? webUIText('Topbar.ClimateWarming')
    : trendDirection === 'cooling'
      ? webUIText('Topbar.ClimateCooling')
      : '';
  const tooltip = buildTooltip(dateText, seasonLabel, season, climateDescription, trendDirection);

  return (
    <Tooltip content={tooltip} position="bottom" delay={200}>
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
