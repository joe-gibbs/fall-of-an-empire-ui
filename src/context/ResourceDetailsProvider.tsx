import { useMemo, useState, type ReactNode } from 'react';
import { useEconomyOverviewBridge } from '../bridge/settlements-economy/useEconomyOverviewBridge';
import ResourceDetailsModal from '../components/screens/economy/ResourceDetailsModal';
import { ResourceDetailsContext, type ResourceDetailsActions } from './ResourceDetailsContext';

export default function ResourceDetailsProvider({ children }: { children: ReactNode }) {
  const [resourceId, setResourceId] = useState<string | null>(null);
  const economy = useEconomyOverviewBridge('resources', resourceId !== null);
  const resource = economy?.resources.find(row => row.id === resourceId) ?? null;
  const actions = useMemo<ResourceDetailsActions>(() => ({
    openResource: setResourceId,
    closeResource: () => setResourceId(null),
  }), []);

  return (
    <ResourceDetailsContext.Provider value={actions}>
      {children}
      <ResourceDetailsModal
        resource={resource}
        gold={economy?.gold ?? 0}
        autoBuyEnabled={economy?.autoBuyEnabled ?? false}
        onClose={actions.closeResource}
      />
    </ResourceDetailsContext.Provider>
  );
}
