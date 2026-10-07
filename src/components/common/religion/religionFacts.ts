import type { ReligionInfo } from '../../../bridge-types.generated';
import { webUIText } from '../../../localization/WebUITextContext';
import { formatSignedNumber } from '../../../utils/numberFormat';
import type { TooltipLine } from '../tooltips/Tooltip';

interface EffectLine {
  label: string;
  value: number;
  format: 'integer' | 'percent';
  inverted?: boolean;
}

function collectEffects(info: ReligionInfo): EffectLine[] {
  const lines: EffectLine[] = [
    { label: webUIText('Religion.Tactics'), value: info.tacticsBonus, format: 'integer' },
    { label: webUIText('Religion.Authority'), value: info.authorityBonus, format: 'integer' },
    { label: webUIText('Religion.Cunning'), value: info.cunningBonus, format: 'integer' },
    { label: webUIText('Religion.Governance'), value: info.governanceBonus, format: 'integer' },
    { label: webUIText('Religion.ArmyMorale'), value: info.armyMoraleBonus, format: 'integer' },
    { label: webUIText('Religion.TaxEfficiency'), value: info.taxEfficiencyModifier, format: 'percent' },
    { label: webUIText('Religion.DevelopmentSpeed'), value: info.developmentSpeedModifier, format: 'percent' },
    { label: webUIText('Religion.RecruitmentSpeed'), value: info.recruitmentSpeedModifier, format: 'percent' },
    { label: webUIText('Religion.SettlementGrowth'), value: info.settlementGrowthModifier, format: 'percent' },
    { label: webUIText('Religion.Unrest'), value: info.unrestModifier, format: 'percent', inverted: true },
  ];
  return lines.filter(line => Math.abs(line.value) > 0.0001);
}

function formatEffect(line: EffectLine): string {
  if (line.format === 'percent') return `${formatSignedNumber(line.value * 100)}%`;
  return formatSignedNumber(line.value);
}

function effectColor(line: EffectLine): string {
  const good = line.inverted ? line.value < 0 : line.value > 0;
  return good ? 'var(--green)' : 'var(--red)';
}

function joined(values: string[]): string {
  return values.filter(value => value.trim().length > 0).join(', ');
}

export function religionFacts(info: ReligionInfo, { includeIdentity = true, includePantheon = true } = {}): TooltipLine[] {
  const lines: TooltipLine[] = includeIdentity && info.groupDisplayName ? [
    { label: webUIText('Religion.Group'), value: info.groupDisplayName },
  ] : [];
  if (info.isOrganised && info.clergyTitle) {
    lines.push({ label: webUIText('Religion.Clergy'), value: info.clergyTitle });
  } else {
    lines.push({
      label: webUIText('Religion.OrganisedClergy'),
      value: webUIText(info.isOrganised ? 'Common.Yes' : 'Common.No'),
      valueColor: info.isOrganised ? 'var(--green)' : 'var(--text-muted)',
    });
  }
  if (info.leaderTitle) {
    lines.push({ label: webUIText('Religion.ReligiousHead'), value: info.leaderTitle });
  }
  lines.push({
    label: webUIText('Religion.Charity'),
    value: webUIText(info.requiresCharity ? 'Common.Yes' : 'Common.No'),
  });
  if (includePantheon) {
    const major = joined(info.majorDeities ?? []);
    if (major) lines.push({ label: webUIText('Religion.MajorDeities'), value: major, stacked: true });
    const minor = joined(info.minorDeities ?? []);
    if (minor) lines.push({ label: webUIText('Religion.MinorDeities'), value: minor, stacked: true });
    const relics = joined(info.relics ?? []);
    if (relics) lines.push({ label: webUIText('Religion.Relics'), value: relics, stacked: true });
  }
  return lines;
}

export function religionEffectFacts(info: ReligionInfo): TooltipLine[] {
  return collectEffects(info).map(line => ({
    label: line.label,
    value: formatEffect(line),
    valueColor: effectColor(line),
  }));
}
