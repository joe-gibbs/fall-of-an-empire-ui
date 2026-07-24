import { useMemo } from 'react';
import type {
  GetPersonalGuardResponse,
  PersonalGuardCompanyEntry,
  PersonalGuardRequirementEntry,
} from '../../../bridge-types.generated.ts';
import { useGameActions } from '../../../context/GameContext';
import { formatNumber } from '../../../utils/numberFormat';
import { WebkilnAssetPath } from '../../../utils/assets';
import { WebUIText, webUIText } from '../../../localization/WebUITextContext';
import GameButton from '../../common/buttons/GameButton';
import Tooltip from '../../common/tooltips/Tooltip';
import './PersonalGuardPanel.css';

const GUARD_ICON = '/assets/icons/FormationTemplates/I_Formation_Guard.png';
const SWORDS_ICON = '/assets/icons/I_Swords.png';
const COMPANY_ICON = '/assets/icons/I_ArmiesQuickButton.png';
const UPKEEP_ICON = '/assets/icons/Diplomacy/I_DemandGoldRecurring.png';
const LOCATION_ICON = '/assets/icons/I_City.png';
const CAPTAIN_ICON = '/assets/icons/I_Characters.png';
const WAR_BAND_ICON = '/assets/diplomatic-interactions/icons/RecruitBarbarianWarbandInteraction.png';

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
  const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  return numerals[slot - 1] ?? formatNumber(slot);
}

function Metric({
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
      <div className="personal-guard-metric">
        <img src={icon} alt="" draggable={false} />
        <span className="personal-guard-metric-label">{label}</span>
        <strong>{value}</strong>
      </div>
    </Tooltip>
  );
}

function requirementAmount(value: number): string {
  return formatNumber(value, { maximumFractionDigits: Math.abs(value) < 10 ? 1 : 0 });
}

function RequirementCard({
  requirement,
  showAvailability = true,
}: {
  requirement: PersonalGuardRequirementEntry;
  showAvailability?: boolean;
}) {
  const shortfall = Math.max(0, requirement.required - requirement.available);
  const status = requirement.met
    ? webUIText('Military.PersonalGuard.RequirementReady')
    : webUIText('Military.PersonalGuard.RequirementShortfall', { Amount: requirementAmount(shortfall) });
  const icon = WebkilnAssetPath(requirement.iconPath) || requirement.iconPath;

  return (
    <Tooltip content={{ title: requirement.name, body: requirement.description }}>
      <div className="card personal-guard-requirement">
        <img src={icon} alt="" draggable={false} />
        <div className="personal-guard-requirement-copy">
          <strong>{requirement.name}</strong>
          {showAvailability && (
            <span className={requirement.met ? 'is-ready' : 'is-missing'}>{status}</span>
          )}
          {!showAvailability && (
            <span>
              {requirement.context || <WebUIText textKey="Military.PersonalGuard.PerCompany" />}
            </span>
          )}
        </div>
        <div className="personal-guard-requirement-value">
          {showAvailability && (
            <>
              <strong>{requirementAmount(requirement.available)}</strong>
              <span>/ {requirementAmount(requirement.required)}</span>
            </>
          )}
          {!showAvailability && (
            <strong>{requirementAmount(requirement.required)}</strong>
          )}
        </div>
      </div>
    </Tooltip>
  );
}

function CompanyCard({
  company,
  slot,
}: {
  company: PersonalGuardCompanyEntry | null;
  slot: number;
}) {
  if (!company) {
    return (
      <div
        className="card personal-guard-company personal-guard-company--empty"
        aria-label={webUIText('Military.PersonalGuard.EmptySlot')}
      >
        <span className="personal-guard-company-number">{romanSlot(slot)}</span>
        <img src={COMPANY_ICON} alt="" draggable={false} />
      </div>
    );
  }

  const portrait = WebkilnAssetPath(company.portrait) || company.portrait || unitTypeIcon(company.type);
  const kind = company.isBarbarian
    ? webUIText('Military.PersonalGuard.BarbarianCompany')
    : webUIText('Military.PersonalGuard.HouseholdCompany');

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
      <div className={`card personal-guard-company${company.isBarbarian ? ' personal-guard-company--barbarian' : ''}`}>
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
          <strong>{formatNumber(company.strength)}</strong>
          <span>/ {formatNumber(company.maxStrength)}</span>
        </div>
      </div>
    </Tooltip>
  );
}

export function PersonalGuardPanel({ guard }: { guard: GetPersonalGuardResponse }) {
  const { openScreen, openSidebar } = useGameActions();
  const hasRequirements = guard.formationRequirements.length > 0
    || guard.companyEquipmentRequirements.length > 0;
  const isShowingFormationRequirements = guard.formationRequirements.length > 0;
  const companies = useMemo(() => {
    const bySlot = new Map(guard.companies.map(company => [company.slotNumber, company]));
    return Array.from({ length: guard.companyCapacity }, (_, index) => bySlot.get(index + 1) ?? null);
  }, [guard.companies, guard.companyCapacity]);

  const captain = guard.commanderName || webUIText('Military.PersonalGuard.CaptainVacant');
  const deployment = guard.isAbroad
    ? webUIText('Military.PersonalGuard.Abroad')
    : webUIText('Military.PersonalGuard.AtHome');
  const deploymentBody = guard.isAbroad
    ? webUIText('Military.PersonalGuard.AbroadBody')
    : webUIText('Military.PersonalGuard.AtHomeBody');

  return (
    <div className="personal-guard-view">
      <section className="panel personal-guard-banner">
        <div className="personal-guard-banner-title">
          <Tooltip content={{
            title: webUIText('Military.PersonalGuard.AuthorityTitle'),
            body: webUIText('Military.PersonalGuard.AuthorityBody'),
          }}>
            <img className="personal-guard-emblem" src={GUARD_ICON} alt="" draggable={false} />
          </Tooltip>
          <div>
            <h2>{guard.name || webUIText('Military.PersonalGuard.Title')}</h2>
            <p>{webUIText('Military.PersonalGuard.Subtitle', { Province: guard.provinceName })}</p>
          </div>
          <span className="personal-guard-standing">{guard.status}</span>
        </div>

        {guard.hasGuard && (
          <div className="personal-guard-metrics personal-guard-metrics--three">
            <Metric
              icon={SWORDS_ICON}
              label={webUIText('Military.PersonalGuard.Strength')}
              value={`${formatNumber(guard.strength)} / ${formatNumber(guard.maxStrength)}`}
              tooltip={webUIText('Military.PersonalGuard.StrengthTooltip')}
            />
            <Metric
              icon={UPKEEP_ICON}
              label={webUIText('Military.PersonalGuard.Upkeep')}
              value={formatNumber(guard.upkeep)}
              tooltip={webUIText('Military.PersonalGuard.UpkeepTooltip')}
            />
            <Metric
              icon={LOCATION_ICON}
              label={webUIText('Military.PersonalGuard.Location')}
              value={guard.location}
              tooltip={`${deployment} - ${deploymentBody}`}
            />
          </div>
        )}
      </section>

      {hasRequirements && (
        <section className="panel personal-guard-formation">
          <div className="panel-header personal-guard-section-header">
            <div>
              <h3>
                <WebUIText
                  textKey={isShowingFormationRequirements
                    ? 'Military.PersonalGuard.FormationRequirementsTitle'
                    : 'Military.PersonalGuard.CompanyRequirementsTitle'}
                />
              </h3>
              <p>
                <WebUIText
                  textKey={isShowingFormationRequirements
                    ? 'Military.PersonalGuard.FormationRequirementsBody'
                    : 'Military.PersonalGuard.CompanyRequirementsBody'}
                />
              </p>
            </div>
          </div>
          <div className="personal-guard-requirement-groups">
            {guard.formationRequirements.length > 0 && (
              <div>
                <h4><WebUIText textKey="Military.PersonalGuard.FirstCompanyRequirements" /></h4>
                <div className="personal-guard-requirement-grid">
                  {guard.formationRequirements.map(requirement => (
                    <RequirementCard key={requirement.id} requirement={requirement} />
                  ))}
                </div>
              </div>
            )}
            {guard.companyEquipmentRequirements.length > 0 && (
              <div>
                <h4><WebUIText textKey="Military.PersonalGuard.EquipmentRequirements" /></h4>
                <p><WebUIText textKey="Military.PersonalGuard.EquipmentRequirementsBody" /></p>
                <div className="personal-guard-requirement-grid">
                  {guard.companyEquipmentRequirements.map(requirement => (
                    <RequirementCard
                      key={requirement.id}
                      requirement={requirement}
                      showAvailability={false}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <div className="personal-guard-layout">
        <section className="panel personal-guard-roster">
          <div className="panel-header personal-guard-section-header">
            <div>
              <h3><WebUIText textKey="Military.PersonalGuard.RosterTitle" /></h3>
              <p><WebUIText textKey="Military.PersonalGuard.RosterBody" /></p>
            </div>
            {guard.hasGuard && guard.militaryId && (
              <Tooltip content={{
                title: webUIText('Military.PersonalGuard.OpenGuard'),
                body: webUIText('Military.PersonalGuard.OpenGuardTooltip'),
              }}>
                <GameButton
                  variant="outline"
                  icon={COMPANY_ICON}
                  onClick={() => openSidebar('military', guard.militaryId)}
                >
                  <WebUIText textKey="Military.PersonalGuard.OpenGuard" />
                </GameButton>
              </Tooltip>
            )}
          </div>
          <div className="personal-guard-company-grid">
            {companies.map((company, index) => (
              <CompanyCard key={index + 1} company={company} slot={index + 1} />
            ))}
          </div>
        </section>

        <aside className="personal-guard-side">
          {guard.hasGuard && (
            <section className="panel personal-guard-captain">
              <div className="personal-guard-side-heading">
                <img src={CAPTAIN_ICON} alt="" draggable={false} />
                <h3>{guard.commanderTitle || webUIText('Military.PersonalGuard.Captain')}</h3>
              </div>
              <strong>{captain}</strong>
              {!guard.commanderName && (
                <p><WebUIText textKey="Military.PersonalGuard.CaptainVacantBody" /></p>
              )}
            </section>
          )}

          <section className="panel personal-guard-warband">
            <div className="personal-guard-side-heading">
              <img src={WAR_BAND_ICON} alt="" draggable={false} />
              <h3><WebUIText textKey="Military.PersonalGuard.WarbandTitle" /></h3>
            </div>
            <p><WebUIText textKey="Military.PersonalGuard.WarbandBody" /></p>
            {guard.barbarianPopulation > 0 ? (
              <dl>
                <div>
                  <dt><WebUIText textKey="Military.PersonalGuard.BarbarianPopulation" /></dt>
                  <dd>{formatNumber(guard.barbarianPopulation)}</dd>
                </div>
                <div>
                  <dt><WebUIText textKey="Military.PersonalGuard.BarbarianCultures" /></dt>
                  <dd>{formatNumber(guard.barbarianCultureCount)}</dd>
                </div>
              </dl>
            ) : (
              <p className="personal-guard-no-barbarians">
                <WebUIText textKey="Military.PersonalGuard.NoBarbarianPopulation" />
              </p>
            )}
            <Tooltip content={{
              title: webUIText('Military.PersonalGuard.RecruitWarband'),
              body: webUIText('Military.PersonalGuard.RecruitWarbandTooltip'),
            }}>
              <GameButton
                variant="burgundy"
                fullWidth
                icon={WAR_BAND_ICON}
                onClick={() => openScreen('diplomacy', 'foreign')}
              >
                <WebUIText textKey="Military.PersonalGuard.RecruitWarband" />
              </GameButton>
            </Tooltip>
          </section>
        </aside>
      </div>
    </div>
  );
}
