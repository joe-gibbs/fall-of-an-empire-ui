import { createContext, useContext } from 'react';

export interface ReligionDetailsActions {
  openReligion: (religionId: string) => void;
  closeReligion: () => void;
}

export const ReligionDetailsContext = createContext<ReligionDetailsActions | null>(null);

export function useOptionalReligionDetails(): ReligionDetailsActions | null {
  return useContext(ReligionDetailsContext);
}
