import React from 'react';
import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react';
import Tooltip, { type TooltipContent, type TooltipLine } from '../common/tooltips/Tooltip';
import Portrait from '../common/portraits/Portrait';
import { useProvinceModeOverview } from '../../data-source/index';
import type { PlayerFactionSummary } from '../../bridge/app/usePlayerFactionBridge';
import { webUIText } from '../../localization/WebUITextContext';
import { playSound } from '../../hooks/useSound';
import { formatNumber, formatSignedNumber } from '../../utils/numberFormat';
import type { ProvinceModeOverview, ProvinceModeScoreRow } from '../../bridge/provinces/useProvinceModeOverviewBridge';

interface ImperialStandingIndicatorProps {
  playerFaction: PlayerFactionSummary | null;
  onOpenSubjectScreen?: () => void;
  tooltipDisabled?: boolean;
}

const IMPERIAL_RING_STACK_SRC = '/assets/glance/rings/imperial-standing-ring-stack.png';
const IMPERIAL_WARNING_ICON_SRC = '/assets/icons/I_ExclamationWarning.png';
const IMPERIAL_RING_STACK_COLUMNS = 6;
const IMPERIAL_RING_STACK_ROWS = 5;
const IMPERIAL_RING_MAX_FILLED_SEGMENTS = 5;

type StandingTone = 'favoured' | 'stable' | 'warning' | 'danger' | 'critical';

const STANDING_TONE_ROW: Record<StandingTone, number> = {
  favoured: 0,
  stable: 1,
  warning: 2,
  danger: 3,
  critical: 4,
};

function valueColour(value: number): string {
  if (value > 0) return 'var(--green)';
  if (value < 0) return 'var(--red)';
  return 'var(--text-muted)';
}

function threatScoreColour(value: number): string {
  if (value >= 85) return 'var(--red)';
  if (value >= 65) return 'var(--orange)';
  if (value >= 45) return 'var(--yellow)';
  return 'var(--green)';
}

function threatCauseColour(value: number): string {
  if (value < 0) return 'var(--green)';
  if (value >= 12) return 'var(--red)';
  if (value >= 6) return 'var(--orange)';
  return 'var(--text-muted)';
}

function formatSpritePercent(value: number): string {
  return value.toFixed(5).replace(/0+$/, '').replace(/\.$/, '');
}

function spritePosition(index: number, columns: number, rows: number): string {
  const column = index % columns;
  const row = Math.floor(index / columns);
  const x = columns <= 1 ? 0 : column / (columns - 1) * 100;
  const y = rows <= 1 ? 0 : row / (rows - 1) * 100;
  return `${formatSpritePercent(x)}% ${formatSpritePercent(y)}%`;
}

function imperialRingStyle(tone: StandingTone, filledSegments: number): CSSProperties {
  const index = STANDING_TONE_ROW[tone] * IMPERIAL_RING_STACK_COLUMNS + filledSegments;
  return {
    backgroundImage: `url("${IMPERIAL_RING_STACK_SRC}")`,
    backgroundPosition: spritePosition(index, IMPERIAL_RING_STACK_COLUMNS, IMPERIAL_RING_STACK_ROWS),
    backgroundSize: `${String(IMPERIAL_RING_STACK_COLUMNS * 100)}% ${String(IMPERIAL_RING_STACK_ROWS * 100)}%`,
  };
}

function recallStageTone(overview: ProvinceModeOverview): StandingTone {
  if (overview.recallStage >= 4) return 'critical';
  if (overview.recallStage >= 3) return 'danger';
  if (overview.recallStage >= 2) return 'warning';
  if (overview.recallStage >= 1) return 'stable';
  return 'favoured';
}

function recallStageSegments(overview: ProvinceModeOverview): number {
  return IMPERIAL_RING_MAX_FILLED_SEGMENTS - overview.recallStage;
}

function scorePartColour(kind: 'threat' | 'standing', value: number): string {
  if (value === 0) return 'var(--text-muted)';
  if (kind === 'threat') return value > 0 ? 'var(--red)' : 'var(--green)';
  return valueColour(value);
}

function scoreRowSubTooltip(row: ProvinceModeScoreRow, kind: 'threat' | 'standing'): TooltipContent | undefined {
  if (row.parts.length === 0 && !row.description) return undefined;

  const lines: TooltipLine[] = [
    {
      label: webUIText('FactionOverview.ModifierTotal'),
      value: formatSignedNumber(row.value),
      valueColor: kind === 'threat' ? threatCauseColour(row.value) : valueColour(row.value),
    },
  ];

  if (row.parts.length > 0) {
    lines.push({ label: webUIText('FactionOverview.ModifierSources'), isHeader: true });
    for (const part of row.parts) {
      lines.push({
        label: part.label,
        value: formatSignedNumber(part.value),
        valueColor: scorePartColour(kind, part.value),
      });
    }
  }

  if (row.remainingDays > 0) {
    lines.push({
      label: webUIText('ProvinceMode.StandingModifier.Remaining', { Days: formatNumber(row.remainingDays) }),
      stacked: true,
    });
  }

  return {
    title: row.label,
    body: row.description || undefined,
    lines,
  };
}

function recallStatus(overview: ProvinceModeOverview): { label: string; colour: string } {
  if (overview.recallStage >= 4) {
    return { label: webUIText('ProvinceMode.Warning.RecallOrdered'), colour: 'var(--red)' };
  }
  if (overview.recallStage >= 3) {
    return { label: webUIText('ProvinceMode.Warning.RecallWarning'), colour: 'var(--orange)' };
  }
  if (overview.recallStage >= 2) {
    return { label: webUIText('ProvinceMode.Warning.Watched'), colour: 'var(--yellow)' };
  }
  if (overview.recallStage >= 1) {
    return { label: webUIText('ProvinceMode.Warning.Stable'), colour: 'var(--text-muted)' };
  }
  return { label: webUIText('ProvinceMode.Warning.Favoured'), colour: 'var(--green)' };
}

function buildTooltip(playerFaction: PlayerFactionSummary, overview: ProvinceModeOverview): TooltipContent {
  const status = recallStatus(overview);
  const standingRows = overview.standingRows.slice(0, 5);
  const threatRows = overview.threatRows
    .slice()
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 5);
  const lines: TooltipLine[] = [
    {
      label: webUIText('ImperialStanding.Status'),
      value: status.label,
      valueColor: status.colour,
    },
    {
      label: webUIText('ImperialStanding.Standing'),
      value: webUIText('ImperialStanding.ScoreOutOf100', { Score: formatNumber(overview.standingScore) }),
      valueColor: 'var(--gold-light)',
    },
    {
      label: webUIText('ProvinceMode.ThreatTitle'),
      value: webUIText('ImperialStanding.ScoreOutOf100', { Score: formatNumber(overview.threatScore) }),
      valueColor: threatScoreColour(overview.threatScore),
    },
    {
      label: webUIText('ImperialStanding.Trend'),
      value: webUIText('ImperialStanding.TrendPerMonth', { Value: formatSignedNumber(overview.standingTrend) }),
      valueColor: valueColour(overview.standingTrend),
    },
    {
      label: webUIText('ImperialStanding.RecallPressure'),
      value: status.label,
      valueColor: status.colour,
    },
    {
      label: webUIText('ImperialStanding.NextReview'),
      value: webUIText('ImperialStanding.NextReviewDays', { Days: formatNumber(overview.nextReviewDays) }),
    },
    {
      label: webUIText('ImperialStanding.Standing'),
      isHeader: true,
    },
    ...standingRows.map(row => ({
      label: row.label,
      value: formatSignedNumber(row.value),
      valueColor: valueColour(row.value),
      subTooltip: scoreRowSubTooltip(row, 'standing'),
    })),
    {
      label: webUIText('ProvinceMode.ThreatTitle'),
      isHeader: true,
    },
    ...threatRows.map(row => ({
      label: row.label,
      value: formatSignedNumber(row.value),
      valueColor: threatCauseColour(row.value),
      subTooltip: scoreRowSubTooltip(row, 'threat'),
    })),
  ];

  return {
    title: webUIText('ImperialStanding.Title'),
    body: webUIText('ImperialStanding.Body', { Faction: playerFaction.name }),
    lines,
  };
}

const ImperialStandingIndicator: React.FC<ImperialStandingIndicatorProps> = ({ playerFaction, onOpenSubjectScreen, tooltipDisabled = false }) => {
  const overview = useProvinceModeOverview(Boolean(playerFaction && playerFaction.diplomaticStatus === 'subject'));

  if (!playerFaction) return null;
  if (playerFaction.diplomaticStatus !== 'subject') return null;
  if (!overview?.active) return null;

  const score = overview.standingScore;
  const status = recallStatus(overview);
  const tone = recallStageTone(overview);
  const filledSegments = recallStageSegments(overview);
  const showWarning = tone === 'danger' || tone === 'critical';
  const tooltip = buildTooltip(playerFaction, overview);
  const ringStyle = imperialRingStyle(tone, filledSegments);

  const openSubjectScreen = () => {
    if (!onOpenSubjectScreen) return;
    playSound('click');
    onOpenSubjectScreen();
  };

  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    openSubjectScreen();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openSubjectScreen();
  };

  const isInteractive = Boolean(onOpenSubjectScreen);

  return (
    <Tooltip content={tooltip} position="bottom" variant="sidebar" delay={200} disabled={tooltipDisabled} wrapperClassName="imperial-standing-wrapper">
      <div
        className={`imperial-standing-gauge imperial-standing-gauge--${tone}${isInteractive ? ' imperial-standing-gauge--interactive' : ''}`}
        aria-label={webUIText('ImperialStanding.AriaLabel', {
          Status: status.label,
          Score: formatNumber(score),
        })}
        role={isInteractive ? 'button' : 'img'}
        tabIndex={isInteractive ? 0 : undefined}
        onClick={handleMouseDown}
        onKeyDown={handleKeyDown}
      >
        <div className="imperial-standing-gauge-core" aria-hidden="true">
          <Portrait
            personId={overview.emperor.id}
            layers={overview.emperor.portraitLayers}
            src={overview.emperor.portrait}
            name={overview.emperor.name}
            size="sm"
            showBadge={false}
            showBorder={false}
            resolvePerson={false}
            className="imperial-standing-gauge-portrait"
          />
        </div>
        <div className="imperial-standing-gauge-ring" style={ringStyle} aria-hidden="true" />
        {showWarning && (
          <span className="imperial-standing-warning-slot" aria-hidden="true">
            <img
              src={IMPERIAL_WARNING_ICON_SRC}
              alt=""
              className="imperial-standing-warning-icon"
              draggable={false}
            />
          </span>
        )}
      </div>
    </Tooltip>
  );
};

export default React.memo(ImperialStandingIndicator);
