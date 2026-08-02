import { ModeRow, ModeRows } from '../shared/ModeLayout';
import { webUIText } from '../../../../localization/WebUITextContext';
import type { ProvinceTooltipModeData } from '../shared/types';

function relationText(data: ProvinceTooltipModeData): string {
  if (data.warWithPlayer) return webUIText('ProvinceTooltip.Relation.AtWar');
  if (data.faction.relation === 'own') return webUIText('ProvinceTooltip.Relation.OwnTerritory');
  if (data.faction.relation === 'subject') return webUIText('ProvinceTooltip.Relation.SubjectTerritory');
  if (data.faction.relation === 'ally') return webUIText('ProvinceTooltip.Relation.Ally');
  if (data.faction.relation === 'enemy') return webUIText('ProvinceTooltip.Relation.Enemy');
  return webUIText('ProvinceTooltip.Relation.Neutral');
}

function relationTone(data: ProvinceTooltipModeData): 'positive' | 'negative' | 'muted' | 'warning' | undefined {
  if (data.warWithPlayer || data.faction.relation === 'enemy') return 'negative';
  if (data.faction.relation === 'own' || data.faction.relation === 'subject' || data.faction.relation === 'ally') return 'positive';
  return 'muted';
}

export default function DiplomaticStatusTooltip({ data }: { data: ProvinceTooltipModeData }) {
  return (
    <ModeRows>
      <ModeRow
        label={webUIText('ProvinceTooltip.StatusLabel')}
        value={relationText(data)}
        tone={relationTone(data)}
        icon="/assets/icons/I_Peace.png"
      />
      <ModeRow
        label={webUIText('ProvinceTooltip.ControllerLabel')}
        value={(data.occupier ?? data.faction).name}
        colour={(data.occupier ?? data.faction).colour}
      />
      <ModeRow
        label={webUIText('ProvinceTooltip.OverlordLabel')}
        value={data.independent ? webUIText('ProvinceTooltip.Independent') : data.overlordName}
        tone={data.independent ? 'muted' : undefined}
      />
    </ModeRows>
  );
}
