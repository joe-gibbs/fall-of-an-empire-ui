/**
 * Imports every built-in screen, sidebar, and topbar button module for its
 * side-effect registration. `main.tsx` imports this file once, before
 * <App /> mounts, so every base-game entry is live in the registry on first
 * render.
 *
 * Each UI module calls `registerScreen` / `registerSidebar` /
 * `registerTopbarButton` at its bottom, the same pattern a mod would use
 * from its own entry file. The whole HUD is a set of self-registering
 * modules - App.tsx just consumes the registry.
 */

// Screens - each file registers its screen entry and (where applicable)
// its topbar button.
import '../components/screens/economy/EconomyScreen';
import '../components/screens/economy/BuildQueueScreen';
import '../components/screens/diplomacy/DiplomacyScreen';
import '../components/screens/characters/InternalPoliticsScreen';
import '../components/screens/diplomacy/PeaceNegotiationScreen';
import '../components/screens/diplomacy/DiplomaticNegotiationScreen';
import '../components/screens/faction/FactionOverviewScreen';
import '../components/screens/economy/ReligionScreen';
import '../components/screens/diplomacy/PowerBlocsScreen';
import '../components/screens/characters/FamilyTreeScreen';
import '../components/screens/characters/CharactersScreen';
import '../components/screens/encyclopedia/EncyclopediaScreen';
import '../components/screens/economy/LedgerScreen';
import '../components/screens/system/AchievementsScreen';
import '../components/screens/Military/MilitaryScreen';
import '../components/screens/Battle/BattleScreen';
import '../components/screens/system/MockGlanceScreen';
import '../components/screens/system/TechnologyTreeMockScreen';
import '../components/screens/faction/GovernorFactionOverviewScreen';

// Sidebars - each file registers its own slot wrapper.
import '../components/sidebars/settlement/SettlementSidebar';
import '../components/sidebars/military/SiegeSidebar';
import '../components/sidebars/military/MilitarySidebar';
import '../components/sidebars/military/MilitarySelectionSidebar';
import '../components/sidebars/diplomacy/DiplomacySidebar';
import '../components/sidebars/character/CharacterSidebar';
import '../components/sidebars/diplomacy/PowerBlocSidebar';
import '../components/sidebars/military/FormationTemplateSidebar';
