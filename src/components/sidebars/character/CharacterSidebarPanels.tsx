import React from 'react';
import Portrait from '../../common/portraits/Portrait';
import PersonTooltip from '../../common/tooltips/PersonTooltip';
import Tooltip, { type TooltipContent } from '../../common/tooltips/Tooltip';
import type { ActivitySegment, CharacterHistoryEntry, CharacterRelationship } from '../../../data/types';
import { formatRelationshipType } from '../../../utils/displayLabels';
import { formatNumber } from '../../../utils/numberFormat';
import { relationshipBadgeForType, relationshipCardClass } from './FamilyGraphModel';
import { webUIText } from '../../../localization/WebUITextContext';

export function sidebarTypeForActivityLink(type: string): string | null {
  switch (type) {
    case 'settlement': return 'settlement';
    case 'character': return 'character';
    case 'faction': return 'diplomacy';
    case 'army':
    case 'military': return 'military';
    default: return null;
  }
}

/** Render activity text with clickable links */
function ActivityText({
  segments,
  onLinkClick,
}: {
  segments?: ActivitySegment[];
  onLinkClick: (type: string, id: string) => void;
}) {
  return (
    <span className="char-header-activity-rich">
      {(segments ?? []).map((seg, i) =>
        seg.linkType && seg.linkId ? (
          <span
            key={i}
            className="char-activity-link char-activity-link--clickable"
            onMouseDown={(e) => { e.stopPropagation(); onLinkClick(seg.linkType!, seg.linkId!); }}
          >
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </span>
  );
}

export function HeaderActivity({
  playerRelation,
  hasActivitySegments,
  segments,
  fallbackActivity,
  onLinkClick,
}: {
  playerRelation: string;
  hasActivitySegments: boolean;
  segments?: ActivitySegment[];
  fallbackActivity: string;
  onLinkClick: (type: string, id: string) => void;
}) {
  const hasActivity = hasActivitySegments || fallbackActivity.length > 0;
  return (
    <div className="char-header-living-status">
      {playerRelation && (
        <span className="char-header-player-relation">
          <img src="/assets/icons/I_Family.png" alt="" className="char-header-player-relation-icon" draggable={false} />
          <span>{playerRelation}</span>
        </span>
      )}
      {playerRelation && hasActivity && <span className="char-header-status-separator">,</span>}
      {hasActivitySegments ? (
        <ActivityText
          segments={segments}
          onLinkClick={onLinkClick}
        />
      ) : (
        <span>{fallbackActivity}</span>
      )}
    </div>
  );
}

function historyIconForType(type: string): string {
  switch (type) {
    case 'RulingFaction':
    case 'InCourt':
      return '/assets/icons/I_Domain.png';
    case 'MilitaryCommand':
      return '/assets/icons/I_ArmiesQuickButton.png';
    case 'Diplomat':
      return '/assets/icons/I_Diplomacy.png';
    case 'Spy':
      return '/assets/icons/I_Spy.png';
    case 'Imprisoned':
      return '/assets/person-interactions/icons/ImprisonCharacter.png';
    case 'Governorship':
      return '/assets/icons/I_GovernorMission.png';
    default:
      return '/assets/icons/I_Domain.png';
  }
}

function formatHistoryRange(entry: CharacterHistoryEntry): string {
  const end = entry.isActive ? webUIText('Common.Current') : entry.endDate;
  if (entry.startDate && end) return `${entry.startDate} - ${end}`;
  return entry.startDate || end || '';
}

function sidebarTypeForHistoryTarget(entry: CharacterHistoryEntry): string | null {
  return sidebarTypeForActivityLink(entry.targetType ?? '');
}

export function CharacterHistoryList({
  history,
  onOpenTarget,
}: {
  history: CharacterHistoryEntry[];
  onOpenTarget: (sidebarType: string, id: string) => void;
}) {
  const ordered = React.useMemo(() => history.slice().sort((a, b) => {
    const startDiff = (b.startDay ?? 0) - (a.startDay ?? 0);
    if (startDiff !== 0) return startDiff;
    return (b.endDay ?? 0) - (a.endDay ?? 0);
  }), [history]);

  return (
    <div className="char-history-list">
      {ordered.map((entry, index) => {
        const sidebarType = sidebarTypeForHistoryTarget(entry);
        const canOpen = Boolean(sidebarType && entry.targetId);
        const targetName = entry.targetName || entry.secondaryTargetName || entry.label;
        const dateRange = formatHistoryRange(entry);

        return (
          <div className="char-history-entry" key={`${entry.type}:${entry.targetId ?? entry.targetName}:${entry.startDay}:${index}`}>
            <img src={historyIconForType(entry.type)} alt="" className="char-history-icon" draggable={false} />
            <div className="char-history-body">
              <div className="char-history-head">
                <span className="char-history-title">{entry.label}</span>
                {dateRange && <span className="char-history-date">{dateRange}</span>}
              </div>
              {canOpen && sidebarType && entry.targetId ? (
                <button
                  type="button"
                  className="char-history-target char-history-target--link"
                  onMouseDown={(event) => {
                    event.stopPropagation();
                    onOpenTarget(sidebarType, entry.targetId!);
                  }}
                >
                  {targetName}
                </button>
              ) : (
                <span className="char-history-target">{targetName}</span>
              )}
              {entry.secondaryTargetName && <span className="char-history-detail">{entry.secondaryTargetName}</span>}
              {entry.detail && <span className="char-history-detail">{entry.detail}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function RelationshipOverviewCard({
  rel,
  onOpen,
}: {
  rel: CharacterRelationship;
  onOpen: (id: string) => void;
}) {
  const displayName = rel.characterName;
  const detail = formatRelationshipType(rel.type);
  const status = rel.age && rel.age > 0 ? webUIText('AgentSelect.CandidateAge', { Age: formatNumber(rel.age) }) : '';
  const isAlive = rel.isAlive;
  const isImprisoned = false;
  const badge = relationshipBadgeForType(rel.type, null);
  const canOpen = Boolean(rel.characterId);
  const activity = 'InCourt';
  const isRuler = rel.type === 'Ruler';
  const isHeir = rel.type === 'Heir';
  const isDesignatedHeir = rel.type === 'Designated Heir';

  return (
    <button
      type="button"
      className={`${relationshipCardClass(rel.type, canOpen)}${isAlive === false ? ' char-rel-card--dead' : ''}${isImprisoned && isAlive !== false ? ' char-rel-card--imprisoned' : ''}`}
      onMouseDown={canOpen ? () => onOpen(rel.characterId) : undefined}
      aria-label={displayName}
    >
      <PersonTooltip characterId={rel.characterId} position="left" delay={150}>
        <span className="char-rel-card-portrait">
          <Portrait
            personId={rel.characterId}
            resolvePerson={false}
            src={rel.portrait}
            layers={rel.portraitLayers}
            isImprisoned={false}
            isAlive={isAlive}
            badge={badge}
            name={displayName}
            size="lg"
            shape="rect"
            showBorder
            activity={activity}
            isRuler={isRuler}
            isHeir={isHeir}
            isDesignatedHeir={isDesignatedHeir}
          />
          {isAlive === false && <span className="char-rel-state-badge char-rel-state-badge--dead"><img src="/assets/icons/I_Skull.png" alt="" draggable={false} /></span>}
          {isImprisoned && isAlive !== false && <span className="char-rel-state-badge char-rel-state-badge--imprisoned"><img src="/assets/person-interactions/icons/ImprisonCharacter.png" alt="" draggable={false} /></span>}
        </span>
      </PersonTooltip>
      <span className="char-rel-card-copy">
        <span className="char-rel-card-name">{displayName}</span>
        <span className="char-rel-card-role">{detail}</span>
        {status && <span className="char-rel-card-status">{status}</span>}
      </span>
    </button>
  );
}

export function CharacterDutyRow({
  icon,
  label,
  value,
  detail,
  tooltip,
  onOpen,
}: {
  icon: string;
  label: string;
  value: string;
  detail?: string;
  tooltip: TooltipContent;
  onOpen: () => void;
}) {
  return (
    <Tooltip content={tooltip} position="bottom" delay={160}>
      <button
        type="button"
        className="char-duty-row"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpen();
        }}
      >
        <img src={icon} alt="" className="char-duty-icon" draggable={false} />
        <span className="char-duty-label">{label}</span>
        <span className="char-duty-value">{value}</span>
        {detail && <span className="char-duty-detail">{detail}</span>}
      </button>
    </Tooltip>
  );
}
