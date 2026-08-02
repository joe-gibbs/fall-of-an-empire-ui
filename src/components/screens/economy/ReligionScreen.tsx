import { useCallback, useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import ScreenShell from '../../common/layout/shell/ScreenShell';
import Portrait from '../../common/portraits/Portrait';
import ReligionTooltip from '../../common/tooltips/ReligionTooltip';
import GameCheckButton from '../../common/buttons/GameCheckButton';
import GameButton from '../../common/buttons/GameButton';
import GameBar from '../../common/data-display/bars/GameBar';
import DataTable, { type DataTableColumn } from '../../common/layout/tables/DataTable';
import PaintedBar from '../../common/data-display/bars/PaintedBar';
import CourtOfficeSummary from '../../common/entities/CourtOfficeSummary';
import BishopAppointmentModal from '../../modals/provinces/BishopAppointmentModal';
import CourtAppointmentModal from '../../modals/characters/CourtAppointmentModal';
import ReligionConversionModal from '../../modals/provinces/ReligionConversionModal';
import GrittyPieChart from '../charts/GrittyPieChart';
import { useCourtPositions, useDioceses } from '../../../data-source/index';
import { setAutoAssignClergy, type DioceseView, type DiocesesResult } from '../../../bridge/settlements-economy/useDiocesesBridge';
import type { CourtPositionView } from '../../../bridge/characters/useCourtPositionsBridge';
import { useReligionConversionBridge } from '../../../bridge/provinces/useReligionConversionBridge';
import { useGameActions } from '../../../context/GameContext';
import { formatNumber, formatPercent } from '../../../utils/numberFormat';
import { registerScreen, registerTopbarButton } from '../../../registry/index';
import './ReligionScreen.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
const RELIGION_FALLBACK_ICON = '/assets/icons/I_Religions.png';

type ReligionRow = {
  land: ReactNode;
  clergy: ReactNode;
  authority: ReactNode;
  followers: ReactNode;
  distribution: ReactNode;
  sortLand: string;
  sortClergy: string;
  sortAuthority: number;
  sortFollowers: number;
  sortDistribution: number;
  assignment: DioceseView;
};

function fmtNum(value: number | undefined): string {
  return formatNumber(value);
}

function fmtFull(value: number | undefined): string {
  return formatNumber(value);
}

function religionSegments(dioceses: DiocesesResult | null) {
  if (!dioceses) return [];

  const segments = dioceses.religionDistribution.map(segment => ({
    label: segment.name,
    value: segment.share,
    colour: segment.colour || 'var(--gold)',
    tooltipLines: [{
      label: webUIText('Auto.Prop.ComponentsScreensReligionScreen.38.1'),
      value: fmtNum(Math.round(dioceses.totalRealmPopulation * segment.share)),
      valueColor: segment.colour || 'var(--gold)',
    }],
  }));

  const representedShare = dioceses.religionDistribution.reduce((sum, segment) => sum + segment.share, 0);
  const otherShare = Math.max(0, 1 - representedShare);
  if (otherShare > 0.005) {
    segments.push({
      label: webUIText('Auto.Prop.ComponentsScreensReligionScreen.48.2'),
      value: otherShare,
      colour: 'var(--text-dark)',
      tooltipLines: [{
        label: webUIText('Auto.Prop.ComponentsScreensReligionScreen.52.3'),
        value: fmtNum(Math.round(dioceses.totalRealmPopulation * otherShare)),
        valueColor: 'var(--text-muted)',
      }],
    });
  }

  return segments;
}

function selectedFollowerCount(dioceses: DiocesesResult | null): number {
  if (!dioceses) return 0;
  const selected = dioceses.religionDistribution.find(segment => segment.key === dioceses.religionKey);
  return Math.round(dioceses.totalRealmPopulation * (selected?.share ?? 0));
}

export default function ReligionScreen({ onClose }: { onClose: () => void }) {
  const [selectedReligion, setSelectedReligion] = useState('');
  const [assignment, setAssignment] = useState<DioceseView | null>(null);
  const [courtPosition, setCourtPosition] = useState<CourtPositionView | null>(null);
  const [conversionOpen, setConversionOpen] = useState(false);
  const dioceses = useDioceses(selectedReligion);
  const court = useCourtPositions(true);
  const conversion = useReligionConversionBridge();
  const { openRightSidebar } = useGameActions();

  const handleClergyMouseDown = useCallback((event: MouseEvent<HTMLButtonElement>, personId: string | null) => {
    event.stopPropagation();
    if (event.button !== 0 || !personId) return;
    openRightSidebar('character', personId);
  }, [openRightSidebar]);

  const handleClergyClick = useCallback((event: MouseEvent<HTMLButtonElement>, personId: string | null) => {
    event.stopPropagation();
    if (event.detail !== 0 || !personId) return;
    openRightSidebar('character', personId);
  }, [openRightSidebar]);

  const columns: Array<DataTableColumn<ReligionRow>> = [
    {
      id: 'land',
      label: webUIText('Auto.Prop.ComponentsScreensReligionScreen.76.4'),
      sortable: true,
      render: row => row.land,
      sortValue: row => row.sortLand,
    },
    {
      id: 'clergy',
      label: webUIText('Auto.Prop.ComponentsScreensReligionScreen.77.5'),
      sortable: true,
      render: row => row.clergy,
      sortValue: row => row.sortClergy,
    },
    {
      id: 'authority',
      label: webUIText('Auto.Prop.ComponentsScreensReligionScreen.78.6'),
      sortable: true,
      width: '7.5rem',
      render: row => row.authority,
      sortValue: row => row.sortAuthority,
    },
    {
      id: 'followers',
      label: webUIText('Auto.Prop.ComponentsScreensReligionScreen.79.7'),
      sortable: true,
      width: '7.5rem',
      render: row => row.followers,
      sortValue: row => row.sortFollowers,
    },
    {
      id: 'distribution',
      label: webUIText('Auto.Prop.ComponentsScreensReligionScreen.80.8'),
      sortable: true,
      width: '9.25rem',
      render: row => row.distribution,
      sortValue: row => row.sortDistribution,
    },
  ];

  const rows = useMemo(() => (dioceses?.dioceses ?? []).map(diocese => ({
    land: (
      <div className="rel-cell-diocese">
        <img className="rel-cell-icon" src={dioceses?.iconPath || RELIGION_FALLBACK_ICON} alt="" draggable={false} />
        <span>{diocese.landName}</span>
      </div>
    ),
    clergy: diocese.bishopName ? (
      <button
        type="button"
        className="rel-cell-character rel-cell-character-button"
        onMouseDown={(event) => handleClergyMouseDown(event, diocese.bishopId)}
        onClick={(event) => handleClergyClick(event, diocese.bishopId)}
      >
        <Portrait personId={diocese.bishopId ?? undefined} name={diocese.bishopName} size="sm" />
        <span>{diocese.bishopName}</span>
      </button>
    ) : (
      <span className="rel-vacant-text"><WebUIText textKey="Auto.ComponentsScreensReligionScreen.95.1" /></span>
    ),
    authority: diocese.bishopName ? <span className="rel-authority-value">{fmtFull(diocese.authority)}</span> : '-',
    followers: <span className="rel-followers-value">{fmtNum(diocese.followers)}</span>,
    distribution: (
      <div className="rel-bar-cell">
        <div className="rel-bar-track">
          <PaintedBar percent={diocese.followerPercent * 100} color="gold" />
        </div>
        <span className="rel-percent-value">{formatPercent(diocese.followerPercent * 100)}</span>
      </div>
    ),
    sortLand: diocese.landName,
    sortClergy: diocese.bishopName ?? '',
    sortAuthority: diocese.authority,
    sortFollowers: diocese.followers,
    sortDistribution: diocese.followerPercent,
    assignment: diocese,
  })), [dioceses, handleClergyClick, handleClergyMouseDown]);

  const activeReligionKey = dioceses?.religionKey ?? selectedReligion;
  const religionOffice = useMemo(
    () => court?.positions.find(position => position.key === 'masterofreligion') ?? null,
    [court],
  );

  return (
    <ScreenShell
      title={webUIText('Auto.Attr.ComponentsScreensReligionScreen.124.9')}
      onClose={onClose}
      advisorTopic="religionScreen"
      className="screen--religion"
      contentClassName="rel-screen-content"
    >
      <div className="rel-wrap">
        <div className="rel-selector-row">
          {(dioceses?.organisedReligions ?? []).map(religion => (
            <ReligionTooltip
              key={religion.key}
              info={religion.info}
              delay={200}
              extraLines={[
                { label: webUIText('Auto.Prop.ComponentsScreensReligionScreen.134.10'), value: religion.clergyTitle },
                { label: webUIText('Auto.Prop.ComponentsScreensReligionScreen.135.11'), get value() { return religion.leadingFactionName || webUIText("Common.None"); } },
                { label: webUIText('Auto.Prop.ComponentsScreensReligionScreen.136.12'), get value() { return religion.canManage ? webUIText("ReligionScreen.Manageable") : webUIText("ReligionScreen.ForeignLed"); }, valueColor: religion.canManage ? 'var(--green)' : 'var(--text-muted)' },
              ]}
            >
              <button
                type="button"
                className={`rel-religion-button${religion.key === activeReligionKey ? ' rel-religion-button--active' : ''}${religion.isPlayerReligion ? ' rel-religion-button--state' : ''}`}
                onMouseDown={() => setSelectedReligion(religion.key)}
              >
                <span className="rel-religion-icon-frame">
                  <img src={religion.iconPath || RELIGION_FALLBACK_ICON} alt="" className="rel-religion-icon" draggable={false} />
                </span>
                <span className="rel-religion-name">{religion.name}</span>
              </button>
            </ReligionTooltip>
          ))}
        </div>

        <div className="rel-summary">
          <div className="rel-summary-pie">
            <GrittyPieChart segments={religionSegments(dioceses)} size={124} />
          </div>
          <div className="rel-summary-main">
            <div className="rel-summary-title-row">
              <ReligionTooltip
                info={dioceses?.religionInfo}
                fallbackName={dioceses?.religionName}
                fallbackId={dioceses?.religionKey}
                wrapperClassName="rel-summary-religion-tooltip"
              >
                <div className="rel-summary-title-main">
                  <img src={dioceses?.iconPath || RELIGION_FALLBACK_ICON} alt="" className="rel-cell-icon" draggable={false} />
                  <span className="rel-summary-title">{dioceses?.religionName || webUIText("ReligionScreen.NoOrganisedReligion")}</span>
                  {dioceses?.canManage && <span className="rel-summary-state-mark"><WebUIText textKey="Auto.ComponentsScreensReligionScreen.161.2" /></span>}
                </div>
              </ReligionTooltip>
              {dioceses?.canManage && (
                <GameCheckButton
                  checked={dioceses.autoAssignClergyEnabled}
                  label={webUIText('Auto.Attr.ComponentsScreensReligionScreen.167.13')}
                  onToggle={() => { void setAutoAssignClergy(!dioceses.autoAssignClergyEnabled, activeReligionKey); }}
                  tooltip={{ title: webUIText('Auto.Prop.ComponentsScreensReligionScreen.169.14'), body: webUIText('Auto.Prop.ComponentsScreensReligionScreen.169.15') }}
                />
              )}
            </div>
            {dioceses?.description && (
              <div className="rel-summary-description">{dioceses.description}</div>
            )}
            <div className="rel-summary-lower">
              <div className="rel-summary-stats">
                <div className="rel-summary-stat">
                  <span className="rel-summary-stat-value">{fmtNum(selectedFollowerCount(dioceses))}</span>
                  <span className="rel-summary-stat-label"><WebUIText textKey="Auto.ComponentsScreensReligionScreen.179.3" /></span>
                </div>
                <div className="rel-summary-separator" />
                <div className="rel-summary-stat">
                  <span className="rel-summary-stat-value">{fmtFull(dioceses?.dioceses.length)}</span>
                  <span className="rel-summary-stat-label"><WebUIText textKey="Auto.ComponentsScreensReligionScreen.184.4" /></span>
                </div>
                <div className="rel-summary-separator" />
                <div className="rel-summary-stat">
                  <span className="rel-summary-stat-value">{dioceses?.leadingFactionName || webUIText("Common.None")}</span>
                  <span className="rel-summary-stat-label"><WebUIText textKey="Auto.ComponentsScreensReligionScreen.189.5" /></span>
                </div>
              </div>
              {religionOffice && (
                <div className="rel-summary-office">
                  <CourtOfficeSummary
                    position={religionOffice}
                    onOpen={dioceses?.canManage ? setCourtPosition : undefined}
                    onOpenCharacter={(id) => openRightSidebar('character', id)}
                    readOnly={!dioceses?.canManage}
                  />
                </div>
              )}
            </div>
            <div className="rel-conversion-row">
              <div className="rel-conversion-status">
                <span className="rel-conversion-label">
                  {conversion?.state.active ? webUIText('ReligionConversion.ActiveConversion') : webUIText('ReligionConversion.NoConversion')}
                </span>
                <span className="rel-conversion-value">
                  {conversion?.state.active
                    ? webUIText('ReligionConversion.ConvertingTo', { ReligionName: conversion.state.targetReligionName })
                    : webUIText('ReligionConversion.NoConversionBody')}
                </span>
                {conversion?.state.active && (
                  <div className="rel-conversion-progress">
                    <GameBar value={conversion.state.currentStageProgress * 100} max={100} colour="var(--gold)" size="sm" label={conversion.state.currentStageName} />
                  </div>
                )}
              </div>
              {dioceses?.canManage && (
                <GameButton variant="outline" onClick={() => setConversionOpen(true)}>
                  {conversion?.state.active ? webUIText('ReligionConversion.ManageConversion') : webUIText('ReligionConversion.ConvertReligion')}
                </GameButton>
              )}
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="rel-empty-state"><WebUIText textKey="Auto.ComponentsScreensReligionScreen.205.6" /></div>
        ) : (
          <DataTable
            className="rel-table-block"
            columns={columns}
            rows={rows}
            rowKey={(row) => row.assignment.id}
            rowTutorialTarget={(row) => `Bishopric:${row.assignment.id}`}
            wrapperClassName="rel-table-wrap"
            tableClassName="rel-table"
            headerRowClassName="rel-header-row"
            bodyScrollFrameClassName="rel-body-scroll"
            bodyClassName="rel-body"
            headerCellClassName="rel-header-cell"
            bodyCellClassName="rel-body-cell"
            headerContentClassName="rel-header-label"
            activeHeaderClassName="rel-header-cell--active"
            rowClassName={(_row, index) => `rel-row rel-row--${index % 2 === 0 ? 'even' : 'odd'}`}
            defaultSortKey="land"
            styledScrollbar
            virtualized
            virtualizeThreshold={24}
            virtualRowHeightRem={3.75}
            virtualOverscan={8}
            onRowClick={(row) => {
              if (!dioceses?.canManage) return;
              setAssignment(row.assignment);
            }}
          />
        )}

        <BishopAppointmentModal
          open={!!assignment}
          assignment={assignment}
          religionKey={dioceses?.religionKey ?? selectedReligion}
          religionName={dioceses?.religionName ?? ''}
          religionIcon={dioceses?.iconPath ?? RELIGION_FALLBACK_ICON}
          onClose={() => setAssignment(null)}
        />
        <CourtAppointmentModal
          open={!!courtPosition && !!dioceses?.canManage}
          position={courtPosition}
          onClose={() => setCourtPosition(null)}
        />
        <ReligionConversionModal
          open={conversionOpen && !!dioceses?.canManage}
          conversion={conversion}
          onClose={() => setConversionOpen(false)}
          onChanged={() => setSelectedReligion('')}
        />
      </div>
    </ScreenShell>
  );
}

registerTopbarButton({
  id: 'religion',
  get label() { return webUIText('Auto.TopProp.ComponentsScreensReligionScreen.242.1'); },
  icon: RELIGION_FALLBACK_ICON,
  tooltip: {
    get title() { return webUIText('Auto.TopProp.ComponentsScreensReligionScreen.245.2'); },
    get body() { return webUIText('Auto.TopProp.ComponentsScreensReligionScreen.246.3'); },
    lines: [
      { get label() { return webUIText('Auto.TopProp.ComponentsScreensReligionScreen.248.4'); } },
      { get label() { return webUIText('Auto.TopProp.ComponentsScreensReligionScreen.249.5'); } },
    ],
  },
  order: 12,
  factionMode: 'all',
});

registerScreen({
  id: 'religion',
  render: ({ onClose }) => <ReligionScreen onClose={onClose} />,
  topbarId: 'religion',
  advisorTopic: 'religionScreen',
  bridgeNames: ['religion', 'religions'],
  factionMode: 'all',
});
