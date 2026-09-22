import { createContext } from 'react';

export interface ResourcePurchaseDestination {
  settlementId?: string;
  personId?: string;
  /** Free warehouse space by resource category. Absent categories use the realm warehouse. */
  categoryRooms?: Readonly<Record<string, number>>;
}

export function settlementPurchaseDestination(settlement: {
  id: string;
  factionIsPlayer?: boolean;
  isCapital?: boolean;
  resourceCategories?: Array<{ id: string; isCapitalStockpile: boolean; stockpileCap: number; stockpile: number }>;
}): ResourcePurchaseDestination {
  if (!settlement.factionIsPlayer) return {};
  if (settlement.isCapital) return { settlementId: settlement.id };
  const categoryRooms: Record<string, number> = {};
  for (const category of settlement.resourceCategories ?? []) {
    if (category.isCapitalStockpile || category.stockpileCap <= 0) continue;
    categoryRooms[category.id] = Math.max(0, category.stockpileCap - category.stockpile);
  }
  return { settlementId: settlement.id, categoryRooms };
}

export const ResourcePurchaseDestinationContext = createContext<ResourcePurchaseDestination>({});
