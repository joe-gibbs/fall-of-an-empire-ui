import { createContext, useContext } from 'react';

export interface CultureDetailsActions {
  openCulture: (cultureId: string) => void;
  closeCulture: () => void;
}

export const CultureDetailsContext = createContext<CultureDetailsActions | null>(null);

export function useOptionalCultureDetails(): CultureDetailsActions | null {
  return useContext(CultureDetailsContext);
}
