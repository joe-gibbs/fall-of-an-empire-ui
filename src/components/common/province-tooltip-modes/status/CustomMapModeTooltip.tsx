import { ModeRow, ModeRows } from '../shared/ModeLayout';
import type { ProvinceTooltipModeData } from '../shared/types';

export default function CustomMapModeTooltip({ data }: { data: ProvinceTooltipModeData }) {
  if (data.mapModeEntries.length === 0) {
    const controller = data.occupier ?? data.faction;
    return (
      <ModeRows>
        <ModeRow label={`${data.mapModeLabel}:`} value={controller.name} colour={controller.colour} />
      </ModeRows>
    );
  }

  return (
    <ModeRows>
      {data.mapModeEntries.map((entry, index) => (
        <ModeRow
          key={`${entry.label}:${String(index)}`}
          label={index === 0 ? `${data.mapModeLabel}:` : ''}
          value={entry.label}
          colour={entry.colour}
        />
      ))}
    </ModeRows>
  );
}
