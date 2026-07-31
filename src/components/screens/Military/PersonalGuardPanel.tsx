import { useMemo } from 'react';
import type {
  GetPersonalGuardResponse,
  PersonalGuardCompanyEntry,
} from '../../../bridge-types.generated.ts';
import { useGameActions } from '../../../context/GameContext';
import { formatNumber } from '../../../utils/numberFormat';
import { WebkilnAssetPath } from '../../../utils/assets';
import { WebUIText, webUIText } from '../../../localization/WebUITextContext';
import GameButton from '../../common/buttons/GameButton';
import Tooltip from '../../common/tooltips/Tooltip';
import './PersonalGuardPanel.css';

const COMPANY_ICON = '/assets/icons/I_ArmiesQuickButton.png';

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
  const { openSidebar } = useGameActions();
  const companies = useMemo(() => {
    const bySlot = new Map(guard.companies.map(company => [company.slotNumber, company]));
    return Array.from({ length: guard.companyCapacity }, (_, index) => bySlot.get(index + 1) ?? null);
  }, [guard.companies, guard.companyCapacity]);

  return (
    <div className="personal-guard-view">
      <section className="panel personal-guard-roster">
        {guard.hasGuard && guard.militaryId && (
          <div className="personal-guard-toolbar">
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
        <div className="personal-guard-company-grid">
          {companies.map((company, index) => (
            <CompanyCard key={index + 1} company={company} slot={index + 1} />
          ))}
        </div>
      </section>
    </div>
  );
}
