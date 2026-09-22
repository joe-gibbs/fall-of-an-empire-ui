import { useMemo, type ReactNode } from 'react';
import {
  ResourcePurchaseDestinationContext,
  type ResourcePurchaseDestination,
} from './resourcePurchaseDestinationContext';

export function ResourcePurchaseDestinationProvider({
  settlementId,
  personId,
  categoryRooms,
  children,
}: ResourcePurchaseDestination & { children: ReactNode }) {
  const value = useMemo(
    () => ({ settlementId, personId, categoryRooms }),
    [settlementId, personId, categoryRooms],
  );
  return (
    <ResourcePurchaseDestinationContext.Provider value={value}>
      {children}
    </ResourcePurchaseDestinationContext.Provider>
  );
}
