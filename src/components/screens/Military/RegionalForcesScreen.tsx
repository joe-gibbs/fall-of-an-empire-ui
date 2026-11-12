import { useState } from 'react';
import { bridgeCall, type RegionalForceEntry } from '../../../bridge-types.generated';
import { useBridgeQuery } from '../../../bridge/core/useBridgeQuery';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import { bridgeEvents } from '../../../bridge/core/bridgeEvents';
import { useRegionalForcesBridge, refreshMilitaryInstitutionViews } from '../../../bridge/military-map/useRegionalForcesBridge';
import { useGameActions } from '../../../context/GameContext';
import { useWebUIText } from '../../../localization/WebUITextContext';
import { formatNumber, formatSignedNumber } from '../../../utils/numberFormat';
import ScreenShell from '../../common/layout/shell/ScreenShell';
import StyledScrollArea from '../../common/layout/scrolling/StyledScrollArea';
import GameButton from '../../common/buttons/GameButton';
import GameCheckButton from '../../common/buttons/GameCheckButton';
import ConfirmDialog from '../../common/forms/ConfirmDialog';
import DropdownSelect from '../../common/forms/DropdownSelect';
import Tooltip from '../../common/tooltips/Tooltip';
import PersonTooltip from '../../common/tooltips/PersonTooltip';
import Portrait from '../../common/portraits/Portrait';
import FactionRoundel from '../../common/entities/FactionRoundel';
import { regionalOwnerFromScreenId } from './screenTokens';
import { regionalCapacityTooltip, regionalServiceTooltip } from './regionalForceTooltips';
import RegionGovernorAppointmentModal from '../../modals/characters/RegionGovernorAppointmentModal';
import { TemplateUnitSelectorModal } from './TemplateManagementPanel';
import './RegionalForcesScreen.css';

type RegionalCommand = 'muster' | 'dismiss' | 'grant' | 'summon' | 'recall' | 'recruit';

function RegionalMetric({ label, value, help }: { label: string; value: number; help: string }) {
  return <Tooltip content={{ title: label, body: help }}><div className="regional-metric"><span>{label}</span><strong>{formatNumber(value)}</strong></div></Tooltip>;
}

export default function RegionalForcesScreen({ onClose, screenId }: { onClose: () => void; screenId: string | null }) {
  const t = useWebUIText();
  const { openSidebar } = useGameActions();
  const data = useRegionalForcesBridge();
  const [actionRegionId, setActionRegionId] = useState('');
  const [settlementIds, setSettlementIds] = useState<Record<string, string>>({});
  const [recruiting, setRecruiting] = useState(false);
  const [appointing, setAppointing] = useState(false);
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState('');
  const [grant, setGrant] = useState<RegionalForceEntry | null>(null);
  const crownRegions = data?.regions.filter(region => region.crownLand) ?? [];
  // One row per subject ruler; their regions' troops are combined.
  const subjects = (data?.regions ?? []).reduce<RegionalForceEntry[]>((rows, region) => {
    if (region.crownLand) return rows;
    const index = rows.findIndex(row => row.ownerId === region.ownerId);
    if (index < 0) return [...rows, region];
    const row = rows[index];
    rows[index] = { ...row, available: row.available + region.available, deployed: row.deployed + region.deployed };
    return rows;
  }, []);
  const requestedOwner = regionalOwnerFromScreenId(screenId);
  const actionRegion = data?.regions.find(region => region.id === actionRegionId);
  const recruitmentSettlement = (region: RegionalForceEntry) => region.settlements.find(entry => entry.id === settlementIds[region.id]) ?? region.settlements[0];
  const settlement = actionRegion && recruitmentSettlement(actionRegion);
  const recruitment = useBridgeQuery({
    action: 'game.get_regional_recruitment', payload: recruiting && actionRegion?.crownLand && settlement ? { settlementId: settlement.id } : null,
    map: response => response, refreshOn: ['game.change_regional_forces', 'game.get_resources'],
  });
  const refresh = async () => {
    const response = await bridgeCall('game.get_regional_forces');
    bridgeEvents.dispatchEvent(new CustomEvent('game.get_regional_forces', { detail: response }));
  };
  const change = async (operation: RegionalCommand, region: RegionalForceEntry, unitId = '') => {
    if (changing) return;
    setChanging(true);
    setError('');
    try {
      await bridgeCall('game.change_regional_forces', { operation, ownerId: region.ownerId, regionId: region.regionId, settlementId: recruitmentSettlement(region)?.id ?? '', unitId });
      setRecruiting(false);
      await refreshMilitaryInstitutionViews();
    } catch (failure) {
      acknowledgeBridgeFailure(failure);
      setError(String(failure));
    } finally { setChanging(false); }
  };
  const toggleAutoAssign = async () => {
    if (!data || changing) return;
    setChanging(true);
    try {
      await bridgeCall('game.set_auto_assign_governors', { enabled: !data.autoAssignGovernorsEnabled });
      await refresh();
    } catch (failure) {
      acknowledgeBridgeFailure(failure);
      setError(String(failure));
    } finally { setChanging(false); }
  };
  const leader = (region: RegionalForceEntry) => region.governorId ? <PersonTooltip characterId={region.governorId}>
    <button type="button" className="regional-person-link" aria-label={region.governorName} onClick={() => openSidebar('character', region.governorId)}>
      <Portrait personId={region.governorId} name={region.governorName} size="md" showBorder showBadge={false} />
    </button>
  </PersonTooltip> : null;
  return <ScreenShell title={t('RegionalForces.Title')} onClose={onClose} className="screen--regional" contentClassName="regional-content"
    titleExtra={data && <Tooltip content={{ body: t('RegionalForces.DuchiesHelp') }}><span className="regional-grant-limit">
      {t('RegionalForces.Duchies', { Count: formatNumber(data.duchies), Maximum: formatNumber(data.maximumDuchies) })}
    </span></Tooltip>}>
    <StyledScrollArea className="regional-roster">
      {crownRegions.length > 0 && <section className="regional-crown">
        <div className="regional-section-heading">
          <h2>{t('RegionalForces.CrownLand')}</h2>
          {crownRegions.some(region => region.canAppointGovernor) && <GameCheckButton checked={data?.autoAssignGovernorsEnabled ?? false}
            label={t('Auto.Attr.ComponentsScreensInternalPoliticsScreen.824.8')} onToggle={() => { void toggleAutoAssign(); }}
            tooltip={{ title: t('Auto.Prop.ComponentsScreensInternalPoliticsScreen.826.9'), body: t('Auto.Prop.ComponentsScreensInternalPoliticsScreen.826.10') }} />}
        </div>
        {crownRegions.map(region => {
          const recruitAt = recruitmentSettlement(region);
          return <article key={region.id} className="regional-estate">
            <div className="regional-estate-main">
              <div className="regional-identity">
                {leader(region)}
                <div className="regional-region-name"><h3>{region.name}</h3><span>{region.governorName || t('RegionalForces.NoGovernor')}</span></div>
              </div>
              <div className="regional-metrics">
                <RegionalMetric label={t('RegionalForces.Available')} value={region.available} help={t('RegionalForces.AvailableHelp')} />
                <RegionalMetric label={t('RegionalForces.Deployed')} value={region.deployed} help={t('RegionalForces.DeployedHelp')} />
                <RegionalMetric label={t('RegionalForces.Recruiting')} value={region.recruiting} help={t('RegionalForces.RecruitingHelp')} />
                <Tooltip content={regionalCapacityTooltip(region)}><div className="regional-metric"><span>{t('RegionalForces.Capacity')}</span><strong>{formatNumber(region.capacity)}</strong></div></Tooltip>
              </div>
            </div>
            <div className="regional-settlements">{region.settlements.map(entry => <button key={entry.id} type="button" className="regional-settlement-link" onClick={() => openSidebar('settlement', entry.id)}>{entry.name}</button>)}</div>
            <div className="regional-estate-controls">
              <div className="regional-recruitment-controls">
                {recruitAt && <DropdownSelect id={`regional-recruitment-${region.id}`} label={t('RegionalForces.RecruitAt')} value={recruitAt.id}
                  options={region.settlements.map(entry => ({ value: entry.id, label: entry.name }))}
                  onChange={id => setSettlementIds(current => ({ ...current, [region.id]: id }))} />}
                <GameButton variant="burgundy" disabled={changing || !recruitAt} onClick={() => { setActionRegionId(region.id); setError(''); setRecruiting(true); }}>{t('RegionalForces.Recruit')}</GameButton>
                <Tooltip content={{ title: t('RegionalForces.Muster'), body: region.musterReason || t('RegionalForces.MusterHelp') }}><GameButton variant="outline" disabled={!region.canMuster || changing} onClick={() => { void change('muster', region); }}>{t('RegionalForces.Muster')}</GameButton></Tooltip>
                <Tooltip content={{ title: t('RegionalForces.Dismiss'), body: region.dismissReason || t('RegionalForces.DismissHelp') }}><GameButton variant="outline" disabled={!region.canDismiss || changing} onClick={() => { void change('dismiss', region); }}>{t('RegionalForces.Dismiss')}</GameButton></Tooltip>
              </div>
              <div className="regional-actions">
                {region.canAppointGovernor && <GameButton variant="outline" disabled={changing} onClick={() => { setActionRegionId(region.id); setAppointing(true); }}>{t('RegionalForces.AppointGovernor')}</GameButton>}
                <Tooltip content={{ title: t('RegionalForces.Grant'), body: region.grantReason || t('RegionalForces.GrantHelp', { Governor: region.governorName }),
                  lines: [{ label: t('Economy.Gold'), value: formatNumber(data?.grantCost) }] }}>
                  <GameButton variant="outline" disabled={!region.canGrant || changing} onClick={() => setGrant(region)}>{t('RegionalForces.Grant')}</GameButton>
                </Tooltip>
              </div>
            </div>
          </article>;
        })}
      </section>}
      {subjects.length > 0 && <section className="regional-subjects">
        <h2>{t(subjects.every(region => region.hereditary) ? 'RegionalForces.HereditaryDuchies' : 'RegionalForces.SubjectRegions')}</h2>
        <table className="regional-table">
          <thead><tr>
            <th scope="col">{t('RegionalForces.RulerTerritory')}</th>
            <th scope="col">{t('RegionalForces.Opinion')}</th>
            <th scope="col"><Tooltip content={t('RegionalForces.AvailableHelp')}>{t('RegionalForces.Available')}</Tooltip></th>
            <th scope="col"><Tooltip content={t('RegionalForces.DeployedHelp')}>{t('RegionalForces.Deployed')}</Tooltip></th>
            <th scope="col">{t('RegionalForces.Actions')}</th>
          </tr></thead>
          <tbody>{subjects.map(region => <tr key={region.ownerId} className={region.ownerId === requestedOwner ? 'regional-table-selected' : ''}>
            <td><div className="regional-identity">{leader(region)}
              <FactionRoundel factionId={region.ownerId} colour={region.colour} secondaryColour={region.secondaryColour} emblem={region.emblem}
                name={region.ownerName} resolveFaction={false} diplomaticStatus="subject" subjectSubtype={region.hereditary ? 'hereditary_vassal' : 'province'} size="md" />
              <button type="button" className="regional-region-link" onClick={() => openSidebar('diplomacy', region.ownerId)}>
                <strong>{region.ownerName}</strong><span>{region.governorName || t('RegionalForces.NoGovernor')}</span>
              </button>
            </div></td>
            <td><Tooltip content={{ title: t('RegionalForces.Opinion'),
              body: region.hereditary ? t('RegionalForces.ServiceRelationsHelp', { Minimum: formatNumber(region.minimumServiceOpinion) }) : t('RegionalForces.OpinionHelp'),
              lines: region.opinionBreakdown.map(modifier => ({ label: modifier.label, value: formatSignedNumber(modifier.value) })) }}>
              <span className={region.opinion < 0 ? 'regional-negative' : region.opinion > 0 ? 'regional-positive' : ''}>{formatSignedNumber(region.opinion)}</span>
            </Tooltip></td>
            <td><Tooltip content={{ title: t('RegionalForces.Available'), body: t('RegionalForces.SubjectReservesHelp') }}>{formatNumber(region.available)}</Tooltip></td>
            <td><Tooltip content={{ title: t('RegionalForces.Deployed'), body: t('RegionalForces.DeployedHelp') }}>{formatNumber(region.deployed)}</Tooltip></td>
            <td><div className="regional-actions">
              <Tooltip content={regionalServiceTooltip(region)} bubbleClassName="regional-service-tooltip"><GameButton variant="burgundy" disabled={changing || (region.summoned ? !region.canRecall : !region.canSummon)}
                onClick={() => { void change(region.summoned ? 'recall' : 'summon', region); }}>{t(region.summoned ? 'RegionalForces.Recall' : 'RegionalForces.Summon')}</GameButton></Tooltip>
              <GameButton variant="outline" onClick={() => openSidebar('diplomacy', region.ownerId)}>{t('RegionalForces.Diplomacy')}</GameButton>
            </div></td>
          </tr>)}</tbody>
        </table>
      </section>}
      {data && data.regions.length === 0 && <p className="regional-empty">{t('RegionalForces.Empty')}</p>}
    </StyledScrollArea>
    {error && <p className="regional-error" role="alert">{error}</p>}
    {actionRegion && settlement && <RegionGovernorAppointmentModal open={appointing} settlementId={settlement.id} settlementName={settlement.name}
      regionName={actionRegion.name} currentGovernorId={actionRegion.governorId} onClose={() => setAppointing(false)} onAppointed={() => { void refresh(); }} />}
    {recruiting && recruitment && actionRegion && <TemplateUnitSelectorModal mode="single" units={recruitment.options.map(option => option.unit)} currentCounts={{}}
      title={t('RegionalForces.Recruit')} showSettlementRecruitment={false}
      selectionReasons={Object.fromEntries(recruitment.options.map(option => [option.unit.id, changing ? t('RegionalForces.Recruit') : option.reason]))}
      recruitmentStrengths={Object.fromEntries(recruitment.options.map(option => [option.unit.id, option.unit.maxStrength]))}
      onAdd={unitId => { void change('recruit', actionRegion, unitId); }} onRemove={() => undefined} onClose={() => setRecruiting(false)}
      doneLabel={t('Common.Cancel')} onDone={() => setRecruiting(false)} statusMessage={error} />}
    <ConfirmDialog visible={grant !== null} title={t('RegionalForces.Grant')} variant="danger" confirmDisabled={changing}
      message={grant && <><p>{t('RegionalForces.GrantHelp', { Governor: grant.governorName })}</p><ul>
        <li>{t('RegionalForces.GrantLand', { Region: grant.name })}</li>
        <li>{t('RegionalForces.GrantCost', { Gold: formatNumber(data?.grantCost) })}</li>
      </ul></>}
      onConfirm={() => { if (grant) void change('grant', grant); }} onClosed={() => setGrant(null)} />
  </ScreenShell>;
}
