import { clearBattleCache } from '../military-map/useBattleBridge';
import { clearBuildQueueCache } from '../settlements-economy/useBuildQueueBridge';
import { clearCharacterCaches } from '../characters/useCharactersBridge';
import { clearEconomyOverviewCache } from '../settlements-economy/useEconomyOverviewBridge';
import { clearFactionCaches } from '../diplomacy/useFactionBridge';
import { clearFormationTemplateCaches, clearFormationTemplateCatalogueCache } from '../military-map/useFormationTemplatesBridge';
import { clearLedgerOverviewCache } from '../settlements-economy/useLedgerOverviewBridge';
import { clearMilitaryCaches } from '../military-map/useMilitaryBridge';
import { clearPersonCaches } from '../characters/usePersonBridge';
import { clearPowerBlocCaches } from '../diplomacy/usePowerBlocsBridge';
import { clearVictoryConditionsCache } from '../app/useVictoryConditionsBridge';

export const GAMEPLAY_CONTEXT_RESET_EVENT = 'bridge:ui.gameplay_context_reset';

export function clearGameplayDataCaches(): void {
  clearBattleCache();
  clearBuildQueueCache();
  clearCharacterCaches();
  clearEconomyOverviewCache();
  clearFactionCaches();
  clearFormationTemplateCaches();
  clearFormationTemplateCatalogueCache();
  clearLedgerOverviewCache();
  clearMilitaryCaches();
  clearPersonCaches();
  clearPowerBlocCaches();
  clearVictoryConditionsCache();
}

export function dispatchGameplayContextReset(): void {
  window.dispatchEvent(new CustomEvent(GAMEPLAY_CONTEXT_RESET_EVENT));
}
