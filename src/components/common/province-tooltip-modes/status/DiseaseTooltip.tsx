import { ModeRow, ModeRows } from '../shared/ModeLayout';
import { compactNumber, percentInteger, percentValue, riskTone } from '../shared/format';
import { webUIText } from '../../../../localization/WebUITextContext';
import type { ProvinceTooltipModeData } from '../shared/types';

export default function DiseaseTooltip({ data }: { data: ProvinceTooltipModeData }) {
  const disease = data.diseaseInfo;

  if (!disease.active) {
    if (data.starving || disease.foodShortage > 0) {
      return (
        <ModeRows>
          <ModeRow label={webUIText('ProvinceTooltip.StateLabel')} value={webUIText('ProvinceTooltip.Starvation')} tone="negative" />
          <ModeRow label={webUIText('ProvinceTooltip.FoodShortageLabel')} value={compactNumber(disease.foodShortage)} tone="negative" />
        </ModeRows>
      );
    }

    return (
      <ModeRows>
        <ModeRow label={webUIText('ProvinceTooltip.StateLabel')} value={webUIText('ProvinceTooltip.Healthy')} tone="positive" />
      </ModeRows>
    );
  }

  const effects = [
    disease.foodPenalty >= 0.01
      ? webUIText('ProvinceTooltip.Disease.FoodPenalty', { Percent: percentInteger(disease.foodPenalty) })
      : '',
    disease.resourcePenalty >= 0.01
      ? webUIText('ProvinceTooltip.Disease.ResourcePenalty', { Percent: percentInteger(disease.resourcePenalty) })
      : '',
    disease.taxPenalty >= 0.01
      ? webUIText('ProvinceTooltip.Disease.TaxPenalty', { Percent: percentInteger(disease.taxPenalty) })
      : '',
    disease.mortalityRate >= 0.001
      ? webUIText('ProvinceTooltip.Disease.DailyMortality', { Percent: percentValue(disease.mortalityRate) })
      : '',
    disease.severityReduction > 0
      ? webUIText('ProvinceTooltip.Disease.SeverityReduction', { Percent: percentInteger(disease.severityReduction) })
      : '',
  ].filter(Boolean).join(', ');

  return (
    <ModeRows>
      <ModeRow
        label={webUIText('ProvinceTooltip.DiseaseLabel')}
        value={disease.name || webUIText('ProvinceTooltip.Outbreak')}
        tone="negative"
      />
      <ModeRow
        label={webUIText('ProvinceTooltip.SeverityLabel')}
        value={`${disease.severityLabel || percentValue(disease.severity)} (${percentValue(disease.severity)})`}
        tone={riskTone(disease.severity)}
      />
      <ModeRow label={webUIText('ProvinceTooltip.DurationLabel')} value={disease.durationLabel} />
      {disease.totalDeaths > 0 && (
        <ModeRow label={webUIText('ProvinceTooltip.DeathsLabel')} value={compactNumber(disease.totalDeaths)} tone="negative" />
      )}
      {effects && <ModeRow label={webUIText('ProvinceTooltip.EffectsLabel')} value={effects} tone="muted" />}
      {(data.starving || disease.foodShortage > 0) && (
        <ModeRow label={webUIText('ProvinceTooltip.FoodShortageLabel')} value={compactNumber(disease.foodShortage)} tone="negative" />
      )}
    </ModeRows>
  );
}
