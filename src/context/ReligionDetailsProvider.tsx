import { useMemo, useState, type ReactNode } from 'react';
import { useReligionDetailsBridge } from '../bridge/religion/useReligionDetailsBridge';
import ReligionDetailsModal from '../components/modals/religion/ReligionDetailsModal';
import { ReligionDetailsContext, type ReligionDetailsActions } from './ReligionDetailsContext';

export default function ReligionDetailsProvider({ children }: { children: ReactNode }) {
  const [religionId, setReligionId] = useState<string | null>(null);
  const details = useReligionDetailsBridge(religionId);
  const actions = useMemo<ReligionDetailsActions>(() => ({
    openReligion: setReligionId,
    closeReligion: () => setReligionId(null),
  }), []);

  return (
    <ReligionDetailsContext.Provider value={actions}>
      {children}
      <ReligionDetailsModal
        open={religionId !== null}
        details={details}
        onClose={actions.closeReligion}
      />
    </ReligionDetailsContext.Provider>
  );
}
