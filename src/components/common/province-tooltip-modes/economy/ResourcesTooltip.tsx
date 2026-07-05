import { ModeRow, ModeRows } from '../shared/ModeLayout';
import { oneDecimal } from '../shared/format';
import type { ProvinceTooltipModeData } from '../shared/types';

export default function ResourcesTooltip({ data }: { data: ProvinceTooltipModeData }) {
  const resources = data.resourceProduction.length > 0
    ? data.resourceProduction
    : data.resources.map((resource) => ({ icon: resource.icon, label: resource.label, amount: resource.stock }));

  if (resources.length === 0) {
    return (
      <ModeRows>
        <ModeRow label="Resources:" value="None" tone="muted" />
      </ModeRows>
    );
  }

  return (
    <ModeRows>
      {resources.map((resource) => (
        <ModeRow
          key={resource.label}
          label={resource.label}
          value={oneDecimal(resource.amount)}
          icon={resource.icon}
        />
      ))}
    </ModeRows>
  );
}
