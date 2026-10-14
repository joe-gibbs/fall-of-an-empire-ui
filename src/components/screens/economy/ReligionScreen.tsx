import PaganReligionPanel from './PaganReligionPanel';
import { useCallback, useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import ScreenShell from '../../common/layout/shell/ScreenShell';
import Portrait from '../../common/portraits/Portrait';
import ReligionTooltip from '../../common/tooltips/ReligionTooltip';
import GameCheckButton from '../../common/buttons/GameCheckButton';
import IconStat from '../../common/data-display/stats/IconStat';
import GameButton from '../../common/buttons/GameButton';
import GameBar from '../../common/data-display/bars/GameBar';
import DataTable, { type DataTableColumn } from '../../common/layout/tables/DataTable';
import PaintedBar from '../../common/data-display/bars/PaintedBar';
import GrittyPieChart from '../charts/GrittyPieChart';
import Tooltip from '../../common/tooltips/Tooltip';
import BuildingEffects from '../../common/content/BuildingEffects';
import BishopAppointmentModal from '../../modals/provinces/BishopAppointmentModal';
import ReligionConversionModal from '../../modals/provinces/ReligionConversionModal';
import { useDioceses } from '../../../data-source/index';
import { setAutoAssignClergy, type DioceseView, type DiocesesResult } from '../../../bridge/settlements-economy/useDiocesesBridge';
import { usePaganWorship } from '../../../bridge/religion/usePaganWorshipBridge';
import { useSettlementBuildingsBridge } from '../../../bridge/settlements-economy/useSettlementBuildingsBridge';
import type { AvailableBuilding, Building } from '../../../data/types';
import { useReligionConversionBridge } from '../../../bridge/provinces/useReligionConversionBridge';
import { useGameActions } from '../../../context/GameContext';
import { formatNumber, formatPercent } from '../../../utils/numberFormat';
import { WebkilnAssetPath } from '../../../utils/assets';
import { registerScreen, registerTopbarButton } from '../../../registry/index';
import './ReligionScreen.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
const RELIGION_FALLBACK_ICON = '/assets/icons/I_Religions.png';

function selectedFollowerCount(dioceses: DiocesesResult): number {
  const selected = dioceses.religionDistribution.find(segment => segment.key === dioceses.religionKey);
  return Math.round(dioceses.totalRealmPopulation * (selected?.share ?? 0));
}

function isFaithHall(entry: { religionId?: string; requiredSettlementName?: string }, religionKey: string) {
  return entry.religionId === religionKey && Boolean(entry.requiredSettlementName);
}

function findFaithHall(religionKey: string, buildings: Building[], available: AvailableBuilding[]) {
  const built = buildings.find(entry => isFaithHall(entry, religionKey))
    ?? buildings.find(entry => entry.religionId === religionKey);
  if (built) {
    return { name: built.name, icon: built.icon, description: built.description, effectsText: built.effectsText, built: true, condition: built.condition };
  }
  const slot = available.find(entry => isFaithHall(entry, religionKey))
    ?? available.find(entry => entry.religionId === religionKey);
  if (!slot) return null;
  return { name: slot.name, icon: slot.icon, description: slot.description, effectsText: slot.effectsText, built: false, condition: undefined };
}

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

export default function ReligionScreen({ onClose }: { onClose: () => void }) {
  const [assignment, setAssignment] = useState<DioceseView | null>(null);
  const [conversionOpen, setConversionOpen] = useState(false);
  const dioceses = useDioceses('');
  const isOrganised = dioceses?.religionInfo?.isOrganised === true;
  const isPagan = dioceses?.religionInfo?.group === 'pagan';
  const pagan = usePaganWorship(isPagan ? (dioceses?.religionKey || '') : null);
  const capitalBuildings = useSettlementBuildingsBridge(isPagan ? (pagan?.capitalId || null) : null);
  const faithHall = useMemo(() => {
    if (!isPagan || !dioceses || !capitalBuildings) return null;
    return findFaithHall(dioceses.religionKey, capitalBuildings.buildings, capitalBuildings.availableBuildings);
  }, [isPagan, dioceses, capitalBuildings]);
  const conversion = useReligionConversionBridge();
  const { openRightSidebar, openSidebar } = useGameActions();
  const canConvert = Boolean(dioceses?.canManage && conversion && (conversion.state.active || conversion.options.length > 0));
  const pieSegments = useMemo(() => (dioceses?.religionDistribution ?? []).map(segment => ({
    label: segment.name,
    value: Math.round((dioceses?.totalRealmPopulation ?? 0) * segment.share),
    colour: segment.colour,
  })), [dioceses]);

  const handleClergyClick = useCallback((event: MouseEvent<HTMLButtonElement>, personId: string | null) => {
    event.stopPropagation();
    if (event.button !== 0 || !personId) return;
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
        onClick={(event) => handleClergyClick(event, diocese.bishopId)}
      >
        <Portrait personId={diocese.bishopId ?? undefined} name={diocese.bishopName} size="sm" />
        <span>{diocese.bishopName}</span>
      </button>
    ) : (
      <span className="rel-vacant-text"><WebUIText textKey="Auto.ComponentsScreensReligionScreen.95.1" /></span>
    ),
    authority: diocese.bishopName ? <span className="rel-authority-value">{formatNumber(diocese.authority)}</span> : '-',
    followers: <span className="rel-followers-value">{formatNumber(diocese.followers)}</span>,
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
  })), [dioceses, handleClergyClick]);

  return (
    <ScreenShell
      title={dioceses?.religionName || webUIText('Auto.Attr.ComponentsScreensReligionScreen.124.9')}
      onClose={onClose}
      advisorTopic="religionScreen"
      className="screen--religion"
      contentClassName="rel-screen-content"
      titleExtra={(
        <div className="rel-title-actions">
          <ReligionTooltip
            info={dioceses?.religionInfo}
            fallbackName={dioceses?.religionName}
            fallbackId={dioceses?.religionKey}
            interactive={false}
          >
            <img src={dioceses?.iconPath || RELIGION_FALLBACK_ICON} alt="" className="rel-title-icon" draggable={false} />
          </ReligionTooltip>
          {isOrganised && dioceses?.canManage && (
            <GameCheckButton
              checked={dioceses.autoAssignClergyEnabled}
              label={webUIText('Auto.Attr.ComponentsScreensReligionScreen.167.13')}
              onToggle={() => { void setAutoAssignClergy(!dioceses.autoAssignClergyEnabled, dioceses.religionKey); }}
              tooltip={{ title: webUIText('Auto.Prop.ComponentsScreensReligionScreen.169.14'), body: webUIText('Auto.Prop.ComponentsScreensReligionScreen.169.15') }}
            />
          )}
          {canConvert && (
            <GameButton variant="outline" onClick={() => setConversionOpen(true)}>
              {conversion?.state.active ? webUIText('ReligionConversion.ManageConversion') : webUIText('ReligionConversion.ConvertReligion')}
            </GameButton>
          )}
        </div>
      )}
      headerExtra={conversion?.state.active ? (
        <div className="rel-conversion">
          <span>{webUIText('ReligionConversion.ConvertingTo', { ReligionName: conversion.state.targetReligionName })}</span>
          <GameBar value={conversion.state.currentStageProgress * 100} max={100} colour="var(--gold)" size="sm" label={conversion.state.currentStageName} />
        </div>
      ) : undefined}
    >
      <div className="rel-wrap">
        {dioceses && (
          <div className="rel-identity">
            <GrittyPieChart segments={pieSegments} size={118} />
            {faithHall && pagan && (
              <Tooltip
                content={{
                  title: faithHall.name,
                  body: (
                    <>
                      {faithHall.description && <div>{faithHall.description}</div>}
                      <BuildingEffects text={faithHall.effectsText} />
                    </>
                  ),
                  lines: [
                    { label: webUIText('Pagan.FaithCapital'), value: pagan.capitalName },
                    ...(faithHall.built && faithHall.condition !== undefined
                      ? [{ label: webUIText('Auto.Prop.ComponentsSidebarsSettlementBuildingsPanel.261.4'), value: `${formatNumber(faithHall.condition)}%` }]
                      : []),
                  ],
                  footer: webUIText('Pagan.CapitalHelp'),
                }}
              >
                <button
                  type="button"
                  className={`rel-hall-card${faithHall.built ? '' : ' rel-hall-card--unbuilt'}`}
                  onClick={() => openSidebar('settlement', pagan.capitalId)}
                >
                  {faithHall.icon && <img src={faithHall.icon} alt="" draggable={false} />}
                  <span className="rel-hall-card-name">{faithHall.name}</span>
                </button>
              </Tooltip>
            )}
            <div className="rel-identity-copy">
              {dioceses.description && <p className="rel-identity-description">{dioceses.description}</p>}
              <div className="rel-identity-facts">
                <IconStat
                  className="rel-identity-stat"
                  icon={WebkilnAssetPath('/assets/icons/I_Population.png')}
                  value={formatNumber(selectedFollowerCount(dioceses))}
                  tooltip={{ title: webUIText('Auto.ComponentsScreensReligionScreen.179.3'), body: webUIText('ReligionScreen.FollowersHelp') }}
                />
                {isOrganised && (
                  <IconStat
                    className="rel-identity-stat"
                    icon={WebkilnAssetPath('/assets/icons/I_City.png')}
                    value={formatNumber(dioceses.dioceses.length)}
                    tooltip={{ title: webUIText('Auto.ComponentsScreensReligionScreen.184.4') }}
                  />
                )}
                {pagan && (
                  <IconStat
                    className="rel-identity-stat"
                    icon={WebkilnAssetPath('/assets/icons/I_Capital.png')}
                    value={(
                      <button className="rel-identity-link" type="button" onClick={() => openSidebar('settlement', pagan.capitalId)}>
                        {pagan.capitalName}
                      </button>
                    )}
                    tooltip={{ title: webUIText('Pagan.FaithCapital'), body: webUIText('Pagan.CapitalHelp') }}
                  />
                )}
              </div>
            </div>
          </div>
        )}
        {isPagan && pagan && <PaganReligionPanel data={pagan} />}

        {isOrganised && (rows.length === 0 ? (
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
        ))}

        <BishopAppointmentModal
          open={!!assignment}
          assignment={assignment}
          religionKey={dioceses?.religionKey ?? ''}
          religionName={dioceses?.religionName ?? ''}
          religionIcon={dioceses?.iconPath ?? RELIGION_FALLBACK_ICON}
          onClose={() => setAssignment(null)}
        />
        <ReligionConversionModal
          open={conversionOpen && !!dioceses?.canManage}
          conversion={conversion}
          onClose={() => setConversionOpen(false)}
          onChanged={() => undefined}
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
