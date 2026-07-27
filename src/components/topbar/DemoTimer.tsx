import React from 'react';
import Tooltip, { type TooltipContent } from '../common/tooltips/Tooltip';
import { useGameState } from '../../context/GameContext';
import { webUIText } from '../../localization/WebUITextContext';

const formatDemoTimeRemaining = (daysRemaining: number, daysInYear: number): string => {
  const years = Math.floor(daysRemaining / daysInYear);
  const days = daysRemaining % daysInYear;
  if (years > 0 && days > 0) {
    return webUIText('Demo.TimeRemainingYearsDays', { Years: years, Days: days });
  }
  if (years > 0) {
    return webUIText('Demo.TimeRemainingYears', { Years: years });
  }
  return webUIText('Demo.TimeRemainingDays', { Days: days });
};

const DemoTimer: React.FC = () => {
  const { hasDemoTimeLimit, demoDaysRemaining, demoEndDateText, daysInYear } = useGameState();
  if (!hasDemoTimeLimit) {
    return null;
  }

  const timeRemaining = formatDemoTimeRemaining(demoDaysRemaining, daysInYear);
  const tooltip: TooltipContent = {
    title: webUIText('Demo.TimeRemaining'),
    lines: [
      { label: webUIText('Demo.EndDate'), value: demoEndDateText },
    ],
    footer: webUIText('Demo.TimeRemainingFooter'),
  };

  return (
    <Tooltip content={tooltip} position="right" delay={200}>
      <div className="demo-timer" role="status" aria-label={`${webUIText('Demo.TimeRemaining')}: ${timeRemaining}`}>
        <span className="demo-timer-label">{webUIText('Demo.TimerLabel')}</span>
        <span>{timeRemaining}</span>
      </div>
    </Tooltip>
  );
};

export default DemoTimer;
