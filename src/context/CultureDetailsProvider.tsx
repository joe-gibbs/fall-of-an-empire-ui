import { useMemo, useState, type ReactNode } from 'react';
import { useCultureDevelopmentBridge } from '../bridge/culture/useCultureDevelopmentBridge';
import CultureDevelopmentModal from '../components/modals/culture/CultureDevelopmentModal';
import { CultureDetailsContext, type CultureDetailsActions } from './CultureDetailsContext';

function initialCultureId(): string | null {
  if (!import.meta.env.DEV) return null;
  return new URLSearchParams(window.location.search).get('culture');
}

export default function CultureDetailsProvider({ children }: { children: ReactNode }) {
  const [cultureId, setCultureId] = useState<string | null>(initialCultureId);
  const details = useCultureDevelopmentBridge(cultureId);
  const actions = useMemo<CultureDetailsActions>(() => ({
    openCulture: setCultureId,
    closeCulture: () => setCultureId(null),
  }), []);

  return (
    <CultureDetailsContext.Provider value={actions}>
      {children}
      <CultureDevelopmentModal
        open={cultureId !== null}
        details={details}
        onClose={actions.closeCulture}
      />
    </CultureDetailsContext.Provider>
  );
}
