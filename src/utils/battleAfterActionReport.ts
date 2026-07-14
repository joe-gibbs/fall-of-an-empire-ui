import type { BattleAfterActionReportPayload } from '../bridge-types.generated.ts';
import { FoaeCefUIAssetPath } from './assets';

export function normaliseBattleAfterActionReport(
  report?: BattleAfterActionReportPayload,
): BattleAfterActionReportPayload | undefined {
  if (!report?.available) return undefined;
  return {
    ...report,
    headerImage: FoaeCefUIAssetPath(report.headerImage) ?? '',
    spoilsList: (report.spoilsList ?? []).map(spoil => ({
      ...spoil,
      iconPath: FoaeCefUIAssetPath(spoil.iconPath) ?? '',
    })),
    unitDamage: (report.unitDamage ?? []).map(unit => ({
      ...unit,
      iconPath: FoaeCefUIAssetPath(unit.iconPath) ?? '',
    })),
  };
}
