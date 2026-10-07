import { useCallback } from 'react';
import { sidebarTypeForEntity } from '../components/common/entities/entityLinkUtils';
import { useOptionalCultureDetails } from '../context/CultureDetailsContext';
import { useGameActions } from '../context/GameContext';
import { useOptionalReligionDetails } from '../context/ReligionDetailsContext';
import { usePlayerFactionSummary } from '../data-source/index';
import { getScreenByBridgeName } from '../registry/screens';
import { isProvinceSubjectMode } from '../registry/factionMode';

export function useEntityLinkClick() {
  const { openSidebar, openScreen } = useGameActions();
  const culture = useOptionalCultureDetails();
  const religion = useOptionalReligionDetails();
  const playerFaction = usePlayerFactionSummary();
  const subjectMode = isProvinceSubjectMode(playerFaction);

  return useCallback((type: string, id: string) => {
    if (!id) return;
    const key = type.trim().toLowerCase();
    if (key === 'culture') {
      culture?.openCulture(id);
      return;
    }
    if (key === 'religion') {
      religion?.openReligion(id);
      return;
    }
    if (key === 'screen') {
      const separatorIndex = id.indexOf(':');
      const screenName = separatorIndex >= 0 ? id.slice(0, separatorIndex) : id;
      const screenId = separatorIndex >= 0 ? id.slice(separatorIndex + 1) : undefined;
      const target = getScreenByBridgeName(screenName, subjectMode);
      if (target) openScreen(target.id, screenId);
      return;
    }
    const sidebarType = sidebarTypeForEntity(key);
    if (sidebarType) openSidebar(sidebarType, id);
  }, [culture, openScreen, openSidebar, religion, subjectMode]);
}
