import { ModeRow, ModeRows } from '../shared/ModeLayout';
import type { ProvinceTooltipModeData } from '../shared/types';

function relationText(data: ProvinceTooltipModeData): string {
  if (data.warWithPlayer) return 'At war';
  if (data.faction.relation === 'own') return 'Own territory';
  if (data.faction.relation === 'ally') return 'Ally';
  if (data.faction.relation === 'enemy') return 'Enemy';
  return 'Neutral';
}

function relationTone(data: ProvinceTooltipModeData): 'positive' | 'negative' | 'muted' | 'warning' | undefined {
  if (data.warWithPlayer || data.faction.relation === 'enemy') return 'negative';
  if (data.faction.relation === 'own' || data.faction.relation === 'ally') return 'positive';
  return 'muted';
}

export default function DiplomaticStatusTooltip({ data }: { data: ProvinceTooltipModeData }) {
  return (
    <ModeRows>
      <ModeRow label="Status:" value={relationText(data)} tone={relationTone(data)} icon="/assets/icons/I_Peace.png" />
      <ModeRow label="Controller:" value={(data.occupier ?? data.faction).name} colour={(data.occupier ?? data.faction).colour} />
      <ModeRow label="Overlord:" value={data.independent ? 'Independent' : data.overlordName} tone={data.independent ? 'muted' : undefined} />
    </ModeRows>
  );
}
