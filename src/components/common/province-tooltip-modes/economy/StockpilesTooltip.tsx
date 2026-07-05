import { ModeRow, ModeRows } from '../shared/ModeLayout';
import { oneDecimal } from '../shared/format';
import type { ProvinceTooltipModeData } from '../shared/types';

export default function StockpilesTooltip({ data }: { data: ProvinceTooltipModeData }) {
  const stockpiles = data.stockpiles.length > 0
    ? data.stockpiles
    : data.resources.map((resource) => ({ icon: resource.icon, label: resource.label, amount: resource.stock }));
  const total = stockpiles.reduce((sum, resource) => sum + resource.amount, 0);

  if (stockpiles.length === 0) {
    return (
      <ModeRows>
        <ModeRow label="Stockpiles:" value="None" tone="muted" />
      </ModeRows>
    );
  }

  return (
    <ModeRows>
      {stockpiles.map((resource) => (
        <ModeRow key={resource.label} label={resource.label} value={oneDecimal(resource.amount)} icon={resource.icon} />
      ))}
      <ModeRow label="Total:" value={oneDecimal(total)} />
    </ModeRows>
  );
}
