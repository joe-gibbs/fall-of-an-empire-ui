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
import { TemplateUnitSelectorModal } from './TemplateManagementPanel';
import './PersonalGuardPanel.css';

const COMPANY_ICON = '/assets/icons/I_ArmiesQuickButton.png';
const SWORDS_ICON = '/assets/icons/I_Swords.png';
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
  canEdit,
  onEdit,
}: {
  company: PersonalGuardCompanyEntry | null;
  slot: number;
  canEdit: boolean;
  onEdit?: () => void;
}) {
  if (!company) {
    const emptyBody = (
      <div
        className={`card personal-guard-company personal-guard-company--empty${canEdit ? ' personal-guard-company--addable' : ''}`}
        aria-label={webUIText('Military.PersonalGuard.EmptySlot')}
      >
        <span className="personal-guard-company-number">{romanSlot(slot)}</span>
        <img src={COMPANY_ICON} alt="" draggable={false} />
        {canEdit && (
          <span className="personal-guard-company-empty-label">
            {webUIText('Military.PersonalGuard.ChooseCompany')}
          </span>
        )}
      </div>
    );

    if (!canEdit) {
      return emptyBody;
    }

    return (
      <Tooltip content={{
        title: webUIText('Military.PersonalGuard.ChooseCompany'),
        body: webUIText('Military.PersonalGuard.EmptySlot'),
      }}>
        <button
          type="button"
          className="personal-guard-company-button"
          onMouseDown={() => onEdit?.()}
        >
          {emptyBody}
        </button>
      </Tooltip>
    );
  }

  const portrait = WebkilnAssetPath(company.portrait) || company.portrait || unitTypeIcon(company.type);
  const kind = company.isBarbarian
    ? webUIText('Military.PersonalGuard.BarbarianCompany')
    : webUIText('Military.PersonalGuard.HouseholdCompany');
  const isRecruiting = Boolean(company.isRecruiting);
  const progress = Math.max(0, Math.min(1, company.progress ?? 0));
  const remainingDays = company.remainingDays ?? 0;

  const body = (
    <div className={`card personal-guard-company${company.isBarbarian ? ' personal-guard-company--barbarian' : ''}${canEdit ? ' personal-guard-company--replaceable' : ''}${isRecruiting ? ' personal-guard-company--recruiting' : ''}`}>
      {isRecruiting && (
        <div className="personal-guard-company-progress">
          <div
            className="personal-guard-company-progress-fill"
            style={{ transform: `scaleX(${progress.toFixed(4)})` }}
          />
        </div>
      )}
      <span className="personal-guard-company-number">{romanSlot(slot)}</span>
      <div className="personal-guard-company-portrait">
        <img src={portrait} alt="" draggable={false} />
        <img className="personal-guard-company-type" src={unitTypeIcon(company.type)} alt="" draggable={false} />
      </div>
      <div className="personal-guard-company-copy">
        <strong>{company.name}</strong>
        <span>{company.cultureName} - {company.typeLabel}</span>
        <span className="personal-guard-company-status">
          {isRecruiting && remainingDays > 0
            ? webUIText('Common.DayCount', {
              Days: formatNumber(remainingDays),
              Unit: remainingDays === 1 ? webUIText('Common.Day') : webUIText('Common.Days'),
            })
            : company.status}
        </span>
      </div>
      <div className="personal-guard-company-strength">
        <strong>{formatNumber(company.strength)}</strong>
        <span>/ {formatNumber(company.maxStrength)}</span>
      </div>
    </div>
  );

  const card = (
    <Tooltip content={{
      title: company.name,
      body: company.description,
      lines: [
        { label: kind, value: company.cultureName },
        { label: webUIText('Military.PersonalGuard.CompanyStrength'), value: `${formatNumber(company.strength)} / ${formatNumber(company.maxStrength)}` },
        { label: webUIText('Military.PersonalGuard.CompanyUpkeep'), value: formatNumber(company.upkeep) },
      ],
    }}>
      {canEdit ? (
        <button
          type="button"
          className="personal-guard-company-button"
          onMouseDown={() => onEdit?.()}
        >
          {body}
        </button>
      ) : body}
    </Tooltip>
  );

  return card;
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
  const [replaceBusy, setReplaceBusy] = useState(false);
  const [commanderModalOpen, setCommanderModalOpen] = useState(false);
  const [establishOpen, setEstablishOpen] = useState(false);
  const [draftUnitIds, setDraftUnitIds] = useState<string[]>([]);
  const [formError, setFormError] = useState('');
  const [replaceSlot, setReplaceSlot] = useState<number | null>(null);

  const companies = useMemo(() => {
    const bySlot = new Map(guard.companies.map(company => [company.slotNumber, company]));
    const length = Math.max(guard.companyCapacity, guard.companies.length);
    return Array.from({ length }, (_, index) => bySlot.get(index + 1) ?? null);
  }, [guard.companies, guard.companyCapacity]);

  const eligibleUnits = useMemo(
    () => (guard.eligibleUnits ?? []) as FormationTemplateUnitEntry[],
    [guard.eligibleUnits],
  );
  const unitById = useMemo(() => {
    const map = new Map<string, FormationTemplateUnitEntry>();
    for (const unit of eligibleUnits) map.set(unit.id, unit);
    return map;
  }, [eligibleUnits]);

  const draftCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const unitId of draftUnitIds) {
      counts[unitId] = (counts[unitId] ?? 0) + 1;
    }
    return counts;
  }, [draftUnitIds]);

  const draftCost = useMemo(() => {
    return draftUnitIds.reduce((sum, unitId) => sum + (unitById.get(unitId)?.price ?? 0), 0);
  }, [draftUnitIds, unitById]);

  const commanderPortrait = mapPortraitPath(guard.commanderPortrait);
  const commanderLayers = mapPortraitLayers(guard.commanderPortraitLayers);
  const commanderTitle = guard.commanderTitle || webUIText('Military.PersonalGuard.Captain');
  const commanderName = guard.commanderName || webUIText('Military.PersonalGuard.CaptainVacant');
  const canAppointCommander = Boolean(guard.militaryId);
  const canEstablish = !guard.hasGuard && !guard.isForming;
  const canEditCompanies = Boolean(guard.hasGuard || guard.isForming);

  const replaceCompany = replaceSlot != null
    ? guard.companies.find(company => company.slotNumber === replaceSlot) ?? null
    : null;
  const isAddingCompany = replaceSlot != null && !replaceCompany;
  const compareUnit = replaceCompany
    ? unitById.get(replaceCompany.unitId) ?? {
      id: replaceCompany.unitId,
      name: replaceCompany.name,
      description: replaceCompany.description,
      portrait: replaceCompany.portrait,
      includesCore: false,
      type: replaceCompany.type,
      unitTypeLabel: replaceCompany.typeLabel,
      category: replaceCompany.type,
      battleRole: '',
      cultureId: '',
      cultureName: replaceCompany.cultureName,
      cultureColour: '',
      tier: 1,
      count: 1,
      maxStrength: replaceCompany.maxStrength,
      price: 0,
      buildTimeDays: 0,
      upkeep: replaceCompany.upkeep,
      foodConsumption: 0,
      resourceCost: [],
      monthlyConsumption: [],
      speed: 0,
      attackSpeed: 0,
      range: 0,
      siegePower: 0,
      pierceDamage: 0,
      crushDamage: 0,
      slashDamage: 0,
      pierceArmour: 0,
      crushArmour: 0,
      slashArmour: 0,
      immuneToWinterAttrition: false,
      immuneToDesertAttrition: false,
      canAttackWhileMoving: false,
      availableSettlementCount: 0,
      availableSettlements: [],
      availableManpower: 0,
      upgradeUnitId: '',
      downgradeUnitId: '',
    } as FormationTemplateUnitEntry
    : null;

  const openEstablish = () => {
    // After destruction the household template keeps its roster; offer it again so
    // re-establishment does not force re-picking every company from scratch.
    const existingRoster = guard.companies
      .slice()
      .sort((a, b) => a.slotNumber - b.slotNumber)
      .map(company => company.unitId)
      .filter((unitId): unitId is string => Boolean(unitId));
    setDraftUnitIds(existingRoster);
    setFormError('');
    setEstablishOpen(true);
  };

  const handleAddDraft = (unitId: string, amount = 1) => {
    setFormError('');
    setDraftUnitIds(current => {
      const unit = unitById.get(unitId);
      if (!unit) return current;

      const room = Math.max(0, guard.companyCapacity - current.length);
      let toAdd = Math.min(Math.max(0, amount), room);
      if (toAdd <= 0) return current;

      const cultureKey = unit.cultureId || unit.cultureName || unit.id;
      const usedManpower = current.reduce((sum, id) => {
        const draftUnit = unitById.get(id);
        if (!draftUnit) return sum;
        const draftCulture = draftUnit.cultureId || draftUnit.cultureName || draftUnit.id;
        if (draftCulture !== cultureKey) return sum;
        return sum + Math.max(0, draftUnit.maxStrength || 0);
      }, 0);
      const availableManpower = Math.max(0, unit.availableManpower ?? 0);
      const unitStrength = Math.max(0, unit.maxStrength || 0);
      // availableManpower 0 means the host has not reported a culture pool yet.
      if (unitStrength > 0 && availableManpower > 0) {
        const remainingManpower = Math.max(0, availableManpower - usedManpower);
        toAdd = Math.min(toAdd, Math.floor(remainingManpower / unitStrength));
      }
      if (toAdd <= 0) return current;

      const next = current.slice();
      for (let index = 0; index < toAdd; index += 1) next.push(unitId);
      return next;
    });
  };

  const handleRemoveDraft = (unitId: string, amount = 1) => {
    setFormError('');
    setDraftUnitIds(current => {
      let remaining = Math.max(0, amount);
      if (remaining <= 0) return current;
      const next = current.slice();
      for (let index = next.length - 1; index >= 0 && remaining > 0; index -= 1) {
        if (next[index] !== unitId) continue;
        next.splice(index, 1);
        remaining -= 1;
      }
      return next;
    });
  };

  const handleEstablishDone = () => {
    if (formBusy || draftUnitIds.length === 0) return;
    setFormBusy(true);
    setFormError('');
    void bridgeCall('game.form_personal_guard', { unitIds: draftUnitIds })
      .then((response) => {
        if (!response.success) {
          const message = response.message || webUIText('Military.PersonalGuard.FormUnavailable');
          setFormError(message);
          acknowledgeBridgeFailure(message, 'game.form_personal_guard');
          return;
        }
        setEstablishOpen(false);
        setDraftUnitIds([]);
        setFormError('');
        return refreshGuardAndMilitary();
      })
      .catch((error: unknown) => {
        setFormError(webUIText('Military.PersonalGuard.FormUnavailable'));
        acknowledgeBridgeFailure(error, 'game.form_personal_guard');
      })
      .finally(() => setFormBusy(false));
  };

  const handleReplace = (unitId: string) => {
    if (replaceBusy || replaceSlot == null) return;
    setReplaceBusy(true);
    void bridgeCall('game.replace_personal_guard_company', {
      slotNumber: replaceSlot,
      unitId,
    })
      .then((response) => {
        if (!response.success) {
          acknowledgeBridgeFailure(response.message || 'game.replace_personal_guard_company failed', 'game.replace_personal_guard_company');
          return;
        }
        setReplaceSlot(null);
        return refreshGuardAndMilitary();
      })
      .catch((error: unknown) => acknowledgeBridgeFailure(error, 'game.replace_personal_guard_company'))
      .finally(() => setReplaceBusy(false));
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
              {canAppointCommander && (
                <span className="personal-guard-captain-action">
                  {webUIText(guard.commanderId ? 'Military.PersonalGuard.ReplaceCaptain' : 'Military.PersonalGuard.AppointCaptain')}
                </span>
              )}
            </button>
          </Tooltip>

          <div className="personal-guard-spend">
            {(guard.hasGuard || guard.upkeep > 0) && (
              <Tooltip content={{
                title: webUIText('Military.PersonalGuard.Upkeep'),
                body: webUIText('Military.PersonalGuard.UpkeepTooltip'),
              }}>
                <div className="personal-guard-spend-metric">
                  <img src={UPKEEP_ICON} alt="" draggable={false} />
                  <div>
                    <span>{webUIText('Military.PersonalGuard.Upkeep')}</span>
                    <strong>{formatNumber(guard.upkeep)}</strong>
                  </div>
                </div>
              </Tooltip>
            )}
            {guard.hasGuard && (
              <Tooltip content={{
                title: webUIText('Military.PersonalGuard.Strength'),
                body: webUIText('Military.PersonalGuard.StrengthTooltip'),
              }}>
                <div className="personal-guard-spend-metric">
                  <img src={SWORDS_ICON} alt="" draggable={false} />
                  <div>
                    <span>{webUIText('Military.PersonalGuard.Strength')}</span>
                    <strong>{`${formatNumber(guard.strength)} / ${formatNumber(guard.maxStrength)}`}</strong>
                  </div>
                </div>
              </Tooltip>
            )}
          </div>
        </div>

        {canEstablish && (
          <div className="personal-guard-establish">
            <InteractionCard
              title={webUIText('Military.PersonalGuard.Form')}
              description={webUIText('Military.PersonalGuard.FormOpenCatalogue')}
              image={SWORDS_ICON}
              bgImage={ESTABLISH_BG}
              onClick={openEstablish}
              tutorialTarget="FormPersonalGuardButton"
            />
          </div>
        )}

        {guard.hasGuard && guard.militaryId && (
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
              canEdit={canEditCompanies}
              onEdit={() => setReplaceSlot(index + 1)}
            />
          ))}
        </div>
      </section>

      {establishOpen && canEstablish && (
        <TemplateUnitSelectorModal
          units={eligibleUnits}
          currentCounts={draftCounts}
          onAdd={handleAddDraft}
          onRemove={handleRemoveDraft}
          onClose={() => {
            setEstablishOpen(false);
            setDraftUnitIds([]);
            setFormError('');
          }}
          title={webUIText('Military.PersonalGuard.Form')}
          doneLabel={webUIText('Military.PersonalGuard.Form')}
          doneTutorialTarget="ConfirmPersonalGuardButton"
          totalCost={draftCost}
          maxUnits={guard.companyCapacity}
          enforceAvailableManpower
          doneDisabled={formBusy || draftUnitIds.length === 0}
          statusMessage={formError}
          onDone={handleEstablishDone}
        />
      )}

      {replaceSlot != null && canEditCompanies && (
        <TemplateUnitSelectorModal
          mode="single"
          units={eligibleUnits}
          currentCounts={compareUnit ? { [compareUnit.id]: 1 } : {}}
          onAdd={(unitId) => handleReplace(unitId)}
          onRemove={() => undefined}
          onClose={() => setReplaceSlot(null)}
          title={webUIText(
            isAddingCompany
              ? 'Military.PersonalGuard.ChooseCompany'
              : 'Military.PersonalGuard.ReplaceCompany',
          )}
          compareUnit={compareUnit}
          doneLabel={webUIText('Common.Cancel')}
          onDone={() => setReplaceSlot(null)}
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
