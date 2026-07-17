import type { BattleAfterActionReportPayload } from '../bridge-types.generated.ts';
import { WebkilnAssetPath } from './assets';

export function normaliseBattleAfterActionReport(
  report?: BattleAfterActionReportPayload,
): BattleAfterActionReportPayload | undefined {
  if (!report?.available) return undefined;
  return {
    ...report,
    headerImage: WebkilnAssetPath(report.headerImage) ?? '',
    spoilsList: (report.spoilsList ?? []).map(spoil => ({
      ...spoil,
      iconPath: WebkilnAssetPath(spoil.iconPath) ?? '',
    })),
    unitDamage: (report.unitDamage ?? []).map(unit => ({
      ...unit,
      iconPath: WebkilnAssetPath(unit.iconPath) ?? '',
    })),
  };
}
