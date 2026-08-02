import { useMemo, useState } from 'react';
import type {
  FormationTemplateUnitEntry,
  GetPersonalGuardResponse,
  PersonalGuardCompanyEntry,
} from '../../../bridge-types.generated.ts';
import { bridgeCall } from '../../../bridge-types.generated.ts';
import { useGameActions } from '../../../context/GameContext';
import { formatNumber } from '../../../utils/numberFormat';
import { WebkilnAssetPath } from '../../../utils/assets';
import { WebUIText, webUIText } from '../../../localization/WebUITextContext';
import GameButton from '../../common/buttons/GameButton';
import Tooltip from '../../common/tooltips/Tooltip';
import Portrait from '../../common/portraits/Portrait';
import InteractionCard from '../../common/interactions/InteractionCard';
import MilitaryCommanderAssignmentModal from '../../modals/characters/MilitaryCommanderAssignmentModal';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import { bridgeEvents } from '../../../bridge/core/bridgeEvents';
import { mapPortraitLayers, mapPortraitPath } from '../../../bridge/characters/portraitMapping';
import { refreshPersonalGuard } from '../../../bridge/military-map/usePersonalGuardBridge';
import { TemplateUnitSelectorModal } from './TemplateManagementPanel';
import './PersonalGuardPanel.css';

const COMPANY_ICON = '/assets/icons/I_ArmiesQuickButton.png';
const SWORDS_ICON = '/assets/icons/I_Swords.png';
const GOLD_ICON = '/assets/icons/I_Coins.png';
const CAPTAIN_ICON = '/assets/icons/I_Characters.png';
const TACTICS_ICON = '/assets/icons/StatIcons/I_Tactics.png';
const UPKEEP_ICON = '/assets/icons/Diplomacy/I_DemandGoldRecurring.png';
const ESTABLISH_BG = '/assets/events/military-chain-of-command.png';

const UNIT_TYPE_ICONS: Record<string, string> = {
  infantry: '/assets/icons/UnitTypes/I_ArmyInfantry.png',
  cavalry: '/assets/icons/UnitTypes/I_ArmyCavalry.png',
  ranged: '/assets/icons/UnitTypes/I_ArmyRanged.png',
  siege: '/assets/icons/UnitTypes/I_ArmySiege.png',
  special: '/assets/icons/UnitTypes/I_ArmySpecial.png',
};

function unitTypeIcon(type: string): string {
  return UNIT_TYPE_ICONS[type] ?? UNIT_TYPE_ICONS.special;
}

function romanSlot(slot: number): string {
  const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
    'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
  return numerals[slot - 1] ?? formatNumber(slot);
}

function CompanyCard({
  company,
  slot,
  editable,
  onOpenCatalogue,
  onClear,
}: {
  company: PersonalGuardCompanyEntry | null;
  slot: number;
  editable: boolean;
  onOpenCatalogue: () => void;
  onClear?: () => void;
}) {
  if (!company) {
    return (
      <button
        type="button"
        className={`card personal-guard-company personal-guard-company--empty${editable ? ' personal-guard-company--pick' : ''}`}
        aria-label={webUIText('Military.PersonalGuard.EmptySlot')}
        disabled={!editable}
        onMouseDown={() => {
          if (editable) onOpenCatalogue();
        }}
      >
        <span className="personal-guard-company-number">{romanSlot(slot)}</span>
        <img src={COMPANY_ICON} alt="" draggable={false} />
        {editable && (
          <span className="personal-guard-company-pick-label">
            <WebUIText textKey="Military.PersonalGuard.ChooseCompany" />
          </span>
        )}
      </button>
    );
  }

  const portrait = WebkilnAssetPath(company.portrait) || company.portrait || unitTypeIcon(company.type);
  const kind = company.isBarbarian
    ? webUIText('Military.PersonalGuard.BarbarianCompany')
    : webUIText('Military.PersonalGuard.HouseholdCompany');

  const body = (
    <div className={`card personal-guard-company${company.isBarbarian ? ' personal-guard-company--barbarian' : ''}${editable ? ' personal-guard-company--draft' : ''}`}>
      <span className="personal-guard-company-number">{romanSlot(slot)}</span>
      <div className="personal-guard-company-portrait">
        <img src={portrait} alt="" draggable={false} />
        <img className="personal-guard-company-type" src={unitTypeIcon(company.type)} alt="" draggable={false} />
      </div>
      <div className="personal-guard-company-copy">
        <strong>{company.name}</strong>
        <span>{company.cultureName} - {company.typeLabel}</span>
        <span className="personal-guard-company-status">{company.status}</span>
      </div>
      <div className="personal-guard-company-strength">
        {editable && onClear ? (
          <button
            type="button"
            className="personal-guard-company-remove"
            aria-label={webUIText('Military.PersonalGuard.RemoveCompany')}
            onMouseDown={event => {
              event.preventDefault();
              event.stopPropagation();
              onClear();
            }}
          >
            <img src="/assets/icons/I_Close.png" alt="" draggable={false} />
          </button>
        ) : (
          <>
            <strong>{formatNumber(company.strength)}</strong>
            <span>/ {formatNumber(company.maxStrength)}</span>
          </>
        )}
      </div>
    </div>
  );

  return (
    <Tooltip content={{
      title: company.name,
      body: company.description,
      lines: [
        { label: kind, value: company.cultureName },
        { label: webUIText('Military.PersonalGuard.CompanyStrength'), value: `${formatNumber(company.strength)} / ${formatNumber(company.maxStrength)}` },
        { label: webUIText('Military.PersonalGuard.CompanyUpkeep'), value: formatNumber(company.upkeep) },
      ],
    }}>
      {editable ? (
        <button
          type="button"
          className="personal-guard-company-button"
          onMouseDown={() => onOpenCatalogue()}
        >
          {body}
        </button>
      ) : body}
    </Tooltip>
  );
}

function SpendMetric({
  icon,
  label,
  value,
  tooltip,
}: {
  icon: string;
  label: string;
  value: string;
  tooltip: string;
}) {
  return (
    <Tooltip content={{ title: label, body: tooltip }}>
      <div className="personal-guard-spend-metric">
        <img src={icon} alt="" draggable={false} />
        <div>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      </div>
    </Tooltip>
  );
}

async function refreshGuardAndMilitary(): Promise<void> {
  await bridgeCall('game.get_personal_guard').then((status) => {
    bridgeEvents.dispatchEvent(new CustomEvent('game.get_personal_guard', { detail: status }));
  });
  await bridgeCall('game.get_military_overview').then((overview) => {
    bridgeEvents.dispatchEvent(new CustomEvent('game.get_military_overview', { detail: overview }));
  });
}

export function PersonalGuardPanel({ guard }: { guard: GetPersonalGuardResponse }) {
  const { openSidebar, openRightSidebar } = useGameActions();
  const [formBusy, setFormBusy] = useState(false);
  const [compositionBusy, setCompositionBusy] = useState(false);
  const [commanderModalOpen, setCommanderModalOpen] = useState(false);
  const [catalogueOpen, setCatalogueOpen] = useState(false);

  const canEditComposition = Boolean(guard.canEditComposition);
  const companies = useMemo(() => {
    const bySlot = new Map(guard.companies.map(company => [company.slotNumber, company]));
    return Array.from({ length: guard.companyCapacity }, (_, index) => bySlot.get(index + 1) ?? null);
  }, [guard.companies, guard.companyCapacity]);

  const selectedUnitIds = useMemo(
    () => guard.companies.map(company => company.unitId).filter(Boolean),
    [guard.companies],
  );

  const currentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const unitId of selectedUnitIds) {
      counts[unitId] = (counts[unitId] ?? 0) + 1;
    }
    return counts;
  }, [selectedUnitIds]);

  const eligibleUnits = (guard.eligibleUnits ?? []) as FormationTemplateUnitEntry[];

  const commanderPortrait = mapPortraitPath(guard.commanderPortrait);
  const commanderLayers = mapPortraitLayers(guard.commanderPortraitLayers);
  const commanderTitle = guard.commanderTitle || webUIText('Military.PersonalGuard.Captain');
  const commanderName = guard.commanderName || webUIText('Military.PersonalGuard.CaptainVacant');
  const canAppointCommander = Boolean(guard.militaryId);
  const showEstablishCard = !guard.hasGuard || guard.isForming;
  const formGoldSpent = guard.formGoldSpent ?? 0;
  const formDurationDays = guard.formDurationDays ?? 0;
  const formRemainingDays = guard.formRemainingDays ?? 0;

  const formTooltip = guard.canForm
    ? webUIText('Military.PersonalGuard.FormTooltipReady')
    : (guard.formBlockReason || webUIText('Military.PersonalGuard.FormUnavailable'));

  const setComposition = (unitIds: string[]) => {
    if (compositionBusy || !canEditComposition) return;
    setCompositionBusy(true);
    void bridgeCall('game.set_personal_guard_composition', { unitIds })
      .then((response) => {
        if (!response.success) {
          acknowledgeBridgeFailure(response.message || 'game.set_personal_guard_composition failed', 'game.set_personal_guard_composition');
        }
        refreshPersonalGuard();
      })
      .catch((error: unknown) => acknowledgeBridgeFailure(error, 'game.set_personal_guard_composition'))
      .finally(() => setCompositionBusy(false));
  };

  const handleAddUnit = (unitId: string) => {
    if (selectedUnitIds.length >= guard.companyCapacity) return;
    setComposition([...selectedUnitIds, unitId]);
  };

  const handleRemoveUnit = (unitId: string) => {
    const index = selectedUnitIds.lastIndexOf(unitId);
    if (index < 0) return;
    const next = selectedUnitIds.slice();
    next.splice(index, 1);
    setComposition(next);
  };

  const handleClearSlot = (slotIndex: number) => {
    const next = selectedUnitIds.slice();
    if (slotIndex < 0 || slotIndex >= next.length) return;
    next.splice(slotIndex, 1);
    setComposition(next);
  };

  const handleFormGuard = () => {
    if (formBusy || !guard.canForm || guard.isForming) {
      return;
    }
    setFormBusy(true);
    void bridgeCall('game.form_personal_guard')
      .then((response) => {
        if (!response.success) {
          acknowledgeBridgeFailure(response.message || 'game.form_personal_guard failed', 'game.form_personal_guard');
        }
        return refreshGuardAndMilitary();
      })
      .catch((error: unknown) => acknowledgeBridgeFailure(error, 'game.form_personal_guard'))
      .finally(() => setFormBusy(false));
  };

  return (
    <div className="personal-guard-view">
      <section className="panel personal-guard-header">
        <div className="personal-guard-header-main">
          <Tooltip content={{
            title: commanderTitle,
            body: canAppointCommander
              ? webUIText('Military.PersonalGuard.CaptainAppointBody')
              : webUIText('Military.PersonalGuard.CaptainVacantBody'),
            lines: guard.commanderName
              ? [{ label: webUIText('Common.Name'), value: guard.commanderName }]
              : undefined,
          }}>
            <button
              type="button"
              className={`personal-guard-captain${guard.commanderId ? '' : ' personal-guard-captain--vacant'}`}
              disabled={!canAppointCommander}
              onMouseDown={() => {
                if (canAppointCommander) setCommanderModalOpen(true);
              }}
            >
              <span
                className={`personal-guard-captain-portrait${guard.commanderId ? ' personal-guard-captain-portrait--clickable' : ''}`}
                onMouseDown={event => {
                  if (!guard.commanderId) return;
                  event.stopPropagation();
                  openRightSidebar('character', guard.commanderId);
                }}
              >
                {guard.commanderId ? (
                  <Portrait
                    personId={guard.commanderId}
                    layers={commanderLayers}
                    src={commanderPortrait || undefined}
                    name={guard.commanderName}
                    size="sm"
                    resolvePerson={false}
                  />
                ) : (
                  <span className="personal-guard-captain-vacant-mark">
                    <img src={CAPTAIN_ICON} alt="" draggable={false} />
                  </span>
                )}
              </span>
              <span className="personal-guard-captain-main">
                <span className="personal-guard-captain-title-row">
                  <img src={TACTICS_ICON} alt="" draggable={false} />
                  <span className="personal-guard-captain-title">{commanderTitle}</span>
                </span>
                <span className="personal-guard-captain-name">{commanderName}</span>
              </span>
              <span className="personal-guard-captain-action">
                {canAppointCommander
                  ? webUIText(guard.commanderId ? 'Military.PersonalGuard.ReplaceCaptain' : 'Military.PersonalGuard.AppointCaptain')
                  : webUIText('Military.PersonalGuard.CaptainPending')}
              </span>
            </button>
          </Tooltip>

          <div className="personal-guard-spend">
            <SpendMetric
              icon={GOLD_ICON}
              label={webUIText('Military.PersonalGuard.Spending')}
              value={formatNumber(formGoldSpent)}
              tooltip={webUIText('Military.PersonalGuard.SpendingTooltipSpent', { Amount: formatNumber(formGoldSpent) })}
            />
            {(guard.hasGuard || guard.upkeep > 0) && (
              <SpendMetric
                icon={UPKEEP_ICON}
                label={webUIText('Military.PersonalGuard.Upkeep')}
                value={formatNumber(guard.upkeep)}
                tooltip={webUIText('Military.PersonalGuard.UpkeepTooltip')}
              />
            )}
            {guard.hasGuard && (
              <SpendMetric
                icon={SWORDS_ICON}
                label={webUIText('Military.PersonalGuard.Strength')}
                value={`${formatNumber(guard.strength)} / ${formatNumber(guard.maxStrength)}`}
                tooltip={webUIText('Military.PersonalGuard.StrengthTooltip')}
              />
            )}
          </div>
        </div>

        {showEstablishCard && (
          <div className="personal-guard-establish">
            <InteractionCard
              title={webUIText('Military.PersonalGuard.Form')}
              description={formTooltip}
              image={SWORDS_ICON}
              bgImage={ESTABLISH_BG}
              durationDays={formDurationDays}
              remainingDays={formRemainingDays}
              inProgress={guard.isForming}
              onClick={guard.canForm && !formBusy ? handleFormGuard : undefined}
              tutorialTarget="FormPersonalGuardButton"
            />
          </div>
        )}

        {guard.hasGuard && guard.militaryId && !guard.isForming && (
          <div className="personal-guard-toolbar">
            {guard.status && <span className="personal-guard-standing">{guard.status}</span>}
            <Tooltip content={{
              title: webUIText('Military.PersonalGuard.OpenGuard'),
              body: webUIText('Military.PersonalGuard.OpenGuardTooltip'),
            }}>
              <GameButton
                variant="outline"
                icon={COMPANY_ICON}
                tutorialTarget="OpenPersonalGuardButton"
                onClick={() => openSidebar('military', guard.militaryId)}
              >
                <WebUIText textKey="Military.PersonalGuard.OpenGuard" />
              </GameButton>
            </Tooltip>
          </div>
        )}
      </section>

      <section className="panel personal-guard-roster">
        <div className="personal-guard-company-grid">
          {companies.map((company, index) => (
            <CompanyCard
              key={index + 1}
              company={company}
              slot={index + 1}
              editable={canEditComposition}
              onOpenCatalogue={() => setCatalogueOpen(true)}
              onClear={company ? () => handleClearSlot(index) : undefined}
            />
          ))}
        </div>
      </section>

      {catalogueOpen && canEditComposition && (
        <TemplateUnitSelectorModal
          units={eligibleUnits}
          currentCounts={currentCounts}
          onAdd={handleAddUnit}
          onRemove={handleRemoveUnit}
          onClose={() => setCatalogueOpen(false)}
        />
      )}

      {guard.militaryId && (
        <MilitaryCommanderAssignmentModal
          open={commanderModalOpen}
          militaryId={guard.militaryId}
          militaryName={guard.name || webUIText('Military.PersonalGuard.Title')}
          currentCommanderId={guard.commanderId || undefined}
          onClose={() => {
            setCommanderModalOpen(false);
            void refreshGuardAndMilitary().catch(error => acknowledgeBridgeFailure(error, 'game.get_personal_guard'));
          }}
        />
      )}
    </div>
  );
}
