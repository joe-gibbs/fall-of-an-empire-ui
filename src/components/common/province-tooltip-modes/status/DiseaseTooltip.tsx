import { ModeRow, ModeRows } from '../shared/ModeLayout';
import { compactNumber, percentInteger, percentValue, riskTone } from '../shared/format';
import type { ProvinceTooltipModeData } from '../shared/types';

export default function DiseaseTooltip({ data }: { data: ProvinceTooltipModeData }) {
  const disease = data.diseaseInfo;

  if (!disease.active) {
    if (data.starving || disease.foodShortage > 0) {
      return (
        <ModeRows>
          <ModeRow label="State:" value="Starvation" tone="negative" />
          <ModeRow label="Food shortage:" value={compactNumber(disease.foodShortage)} tone="negative" />
        </ModeRows>
      );
    }

    return (
      <ModeRows>
        <ModeRow label="State:" value="Healthy" tone="positive" />
      </ModeRows>
    );
  }

  const effects = [
    disease.foodPenalty >= 0.01 ? `-${percentInteger(disease.foodPenalty)} food` : '',
    disease.resourcePenalty >= 0.01 ? `-${percentInteger(disease.resourcePenalty)} resources` : '',
    disease.taxPenalty >= 0.01 ? `-${percentInteger(disease.taxPenalty)} tax` : '',
    disease.mortalityRate >= 0.001 ? `${percentValue(disease.mortalityRate)} daily mortality` : '',
    disease.severityReduction > 0 ? `-${percentInteger(disease.severityReduction)} severity from buildings` : '',
  ].filter(Boolean).join(', ');

  return (
    <ModeRows>
      <ModeRow label="Disease:" value={disease.name || 'Outbreak'} tone="negative" />
      <ModeRow label="Severity:" value={`${disease.severityLabel || percentValue(disease.severity)} (${percentValue(disease.severity)})`} tone={riskTone(disease.severity)} />
      <ModeRow label="Duration:" value={disease.durationLabel} />
      {disease.totalDeaths > 0 && <ModeRow label="Deaths:" value={compactNumber(disease.totalDeaths)} tone="negative" />}
      {effects && <ModeRow label="Effects:" value={effects} tone="muted" />}
      {(data.starving || disease.foodShortage > 0) && <ModeRow label="Food shortage:" value={compactNumber(disease.foodShortage)} tone="negative" />}
    </ModeRows>
  );
}
