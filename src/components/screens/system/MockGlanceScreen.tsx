import { useEffect, type ReactNode } from 'react';
import CloseButton from '../../common/buttons/CloseButton';
import ArmyGlance from '../../world-glances/ArmyGlance';
import NavyGlance from '../../world-glances/NavyGlance';
import BattleGlance from '../../world-glances/BattleGlance';
import SettlementGlance from '../../world-glances/SettlementGlance';
import ConvoyGlance from '../../world-glances/ConvoyGlance';
import PortGlance from '../../world-glances/PortGlance';
import type {
  ArmyGlanceData,
  BattleGlanceData,
  ConvoyGlanceData,
  FactionRelation,
  GlanceFactionStub,
  NavyGlanceData,
  PortGlanceData,
  SettlementGlanceData,
  WorldGlanceDetailClass,
} from '../../world-glances/WorldGlanceTypes';
import { registerScreen } from '../../../registry/index';
import '../../world-glances/WorldGlances.css';
import './MockGlanceScreen.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
interface MockFaction {
  id: string;
  name: string;
  colour: string;
  secondaryColour: string;
  cultureGroup: string;
  emblem: string;
}

interface SettlementMock {
  name: string;
  typeLabel: string;
  typeIcon: string;
  faction: MockFaction;
  health: number;
  monthlyIncome: number;
  population: number;
  unrest: number;
  garrison: number;
  fortification: number;
  siegeProgress: number;
  starving?: boolean;
  diseased?: boolean;
  status: string;
  statusIcon: string;
}

interface ForceMock {
  name: string;
  commander: string;
  faction: MockFaction;
  strength: number;
  maxStrength: number;
  morale: number;
  tier: 1 | 2 | 3;
  status: string;
  statusIcon: string;
}

interface BattleSideMock {
  faction: MockFaction;
  strength: number;
  morale: number;
  losses: number;
}

interface BattleMock {
  name: string;
  attacker: BattleSideMock;
  defender: BattleSideMock;
}

interface ConvoyMock {
  faction: MockFaction;
  originName: string;
  destinationName: string;
  purpose: string;
  purposeDetails: string;
  progress: number;
  etaDays: number;
  cargoLoad: number;
  routeType: 'road' | 'sea';
  cargo: Array<{ icon: string; label: string; amount: number }>;
}

interface PortMock {
  name: string;
  settlementName: string;
  faction: MockFaction;
  level: number;
  blockaded?: boolean;
  blockadingNavies: number;
  blockadingStrength: number;
  dockedNavyName?: string;
  dockedNavyStrength: number;
  tradeValue: number;
}

const FACTIONS = {
  crown: {
    id: 'mock-faction-crown',
    get name() { return webUIText("Auto.Prop.componentsscreensMockGlanceScreen.106.1"); },
    colour: '#8e2f46',
    secondaryColour: '#e0c872',
    cultureGroup: 'Rephsian',
    emblem: 'Rephsian_1',
  },
  league: {
    id: 'mock-faction-league',
    get name() { return webUIText("Auto.Prop.componentsscreensMockGlanceScreen.114.1"); },
    colour: '#2f678e',
    secondaryColour: '#d8d1b0',
    cultureGroup: 'Gwendic',
    emblem: 'Gwendic_2',
  },
  pact: {
    id: 'mock-faction-pact',
    get name() { return webUIText("Auto.Prop.componentsscreensMockGlanceScreen.122.1"); },
    colour: '#74502a',
    secondaryColour: '#1c1a17',
    cultureGroup: 'Imerassian',
    emblem: 'Imerassian_3',
  },
  marches: {
    id: 'mock-faction-marches',
    get name() { return webUIText("Auto.Prop.componentsscreensMockGlanceScreen.130.1"); },
    colour: '#437b4b',
    secondaryColour: '#d2b15d',
    cultureGroup: 'Neutarnic',
    emblem: 'Neutarnic_4',
  },
} satisfies Record<string, MockFaction>;

const SETTLEMENTS: SettlementMock[] = [
  {
    get name() { return webUIText("Auto.Prop.componentsscreensMockGlanceScreen.140.1"); },
    typeLabel: 'City',
    typeIcon: '/assets/icons/I_City.png',
    faction: FACTIONS.crown,
    health: 0.84,
    monthlyIncome: 46,
    population: 18240,
    unrest: 0.12,
    garrison: 2240,
    fortification: 78,
    siegeProgress: 0,
    status: 'Capital',
    statusIcon: '/assets/icons/I_Capital.png',
  },
  {
    get name() { return webUIText("Auto.Prop.componentsscreensMockGlanceScreen.155.1"); },
    typeLabel: 'Fortress',
    typeIcon: '/assets/icons/I_Fortress.png',
    faction: FACTIONS.pact,
    health: 0.46,
    monthlyIncome: -8,
    population: 4120,
    unrest: 0.34,
    garrison: 3180,
    fortification: 92,
    siegeProgress: 0.58,
    diseased: true,
    status: 'Besieged',
    statusIcon: '/assets/icons/I_Siege.png',
  },
  {
    get name() { return webUIText("Auto.Prop.componentsscreensMockGlanceScreen.171.1"); },
    typeLabel: 'Port',
    typeIcon: '/assets/icons/I_Port.png',
    faction: FACTIONS.league,
    health: 0.72,
    monthlyIncome: 31,
    population: 9100,
    unrest: 0.18,
    garrison: 860,
    fortification: 36,
    siegeProgress: 0,
    starving: true,
    status: 'Harbour',
    statusIcon: '/assets/icons/I_Port.png',
  },
];

const ARMIES: ForceMock[] = [
  {
    get name() { return webUIText("Auto.Prop.componentsscreensMockGlanceScreen.190.1"); },
    commander: 'Mara Veyr',
    faction: FACTIONS.crown,
    strength: 6420,
    maxStrength: 6420,
    morale: 1,
    tier: 3,
    status: 'At war',
    statusIcon: '/assets/icons/I_WarHighContrast.png',
  },
  {
    get name() { return webUIText("Auto.Prop.componentsscreensMockGlanceScreen.201.1"); },
    commander: 'Tovan Mer',
    faction: FACTIONS.marches,
    strength: 2140,
    maxStrength: 4600,
    morale: 0.38,
    tier: 1,
    status: 'Raiding',
    statusIcon: '/assets/icons/I_RaidingTorch.png',
  },
  {
    get name() { return webUIText("Auto.Prop.componentsscreensMockGlanceScreen.212.1"); },
    commander: 'Rul Ashar',
    faction: FACTIONS.pact,
    strength: 9400,
    maxStrength: 10000,
    morale: 0.67,
    tier: 3,
    status: 'Marching',
    statusIcon: '/assets/icons/I_ArmiesQuickButton.png',
  },
];

const NAVIES: ForceMock[] = [
  {
    get name() { return webUIText("Auto.Prop.componentsscreensMockGlanceScreen.226.1"); },
    commander: 'Sael Nor',
    faction: FACTIONS.crown,
    strength: 38,
    maxStrength: 0,
    morale: 1,
    tier: 3,
    status: 'Patrol',
    statusIcon: '/assets/icons/I_Port.png',
  },
  {
    get name() { return webUIText("Auto.Prop.componentsscreensMockGlanceScreen.237.1"); },
    commander: 'Iven Dask',
    faction: FACTIONS.league,
    strength: 14,
    maxStrength: 30,
    morale: 0.42,
    tier: 2,
    status: 'Blockade',
    statusIcon: '/assets/icons/I_Siege.png',
  },
  {
    get name() { return webUIText("Auto.Prop.componentsscreensMockGlanceScreen.248.1"); },
    commander: 'Nera Kest',
    faction: FACTIONS.league,
    strength: 22,
    maxStrength: 24,
    morale: 0.74,
    tier: 2,
    status: 'Raiding',
    statusIcon: '/assets/icons/I_RaidingTorch.png',
  },
];

const BATTLES: BattleMock[] = [
  {
    get name() { return webUIText("Auto.Prop.componentsscreensMockGlanceScreen.262.1"); },
    attacker: { faction: FACTIONS.crown, strength: 8360, morale: 0.64, losses: 240 },
    defender: { faction: FACTIONS.pact, strength: 7620, morale: 0.56, losses: 310 },
  },
  {
    get name() { return webUIText("Auto.Prop.componentsscreensMockGlanceScreen.267.1"); },
    attacker: { faction: FACTIONS.league, strength: 1800, morale: 0.42, losses: 130 },
    defender: { faction: FACTIONS.marches, strength: 3200, morale: 0.77, losses: 80 },
  },
  {
    get name() { return webUIText("Auto.Prop.componentsscreensMockGlanceScreen.272.1"); },
    attacker: { faction: FACTIONS.pact, strength: 11200, morale: 0.58, losses: 520 },
    defender: { faction: FACTIONS.crown, strength: 9400, morale: 0.35, losses: 690 },
  },
];

const CONVOYS: ConvoyMock[] = [
  {
    faction: FACTIONS.crown,
    originName: 'Dawnwall',
    destinationName: 'Greywatch',
    purpose: 'Army Resupply',
    purposeDetails: 'Supplies bound for a field army holding the pass.',
    progress: 0.68,
    etaDays: 2.4,
    cargoLoad: 740,
    routeType: 'road',
    cargo: [
      { icon: '/assets/icons/Resources/I_Grain.png', get label() { return webUIText('Auto.TopProp.ComponentsScreensMockGlanceScreen.290.1'); }, amount: 420 },
      { icon: '/assets/icons/Resources/I_Weapons.png', get label() { return webUIText('Auto.TopProp.ComponentsScreensMockGlanceScreen.291.2'); }, amount: 160 },
      { icon: '/assets/icons/Resources/I_Leather.png', get label() { return webUIText('Auto.TopProp.ComponentsScreensMockGlanceScreen.292.3'); }, amount: 160 },
    ],
  },
  {
    faction: FACTIONS.league,
    originName: 'Saltmere',
    destinationName: 'Dawnwall',
    purpose: 'Supply Agreement',
    purposeDetails: 'A contracted shipment crossing faction borders.',
    progress: 0.34,
    etaDays: 5.8,
    cargoLoad: 510,
    routeType: 'sea',
    cargo: [
      { icon: '/assets/icons/Resources/I_Oil.png', get label() { return webUIText('Auto.TopProp.ComponentsScreensMockGlanceScreen.306.4'); }, amount: 190 },
      { icon: '/assets/icons/Resources/I_Sails.png', get label() { return webUIText('Auto.TopProp.ComponentsScreensMockGlanceScreen.307.5'); }, amount: 85 },
      { icon: '/assets/icons/Resources/I_Wood.png', get label() { return webUIText('Auto.TopProp.ComponentsScreensMockGlanceScreen.308.6'); }, amount: 235 },
    ],
  },
  {
    faction: FACTIONS.pact,
    originName: 'Greywatch',
    destinationName: 'Red Hills Camp',
    purpose: 'Settlement Supply',
    purposeDetails: 'Foreign convoy visible through nearby scouts.',
    progress: 0.12,
    etaDays: 8.1,
    cargoLoad: 1180,
    routeType: 'road',
    cargo: [
      { icon: '/assets/icons/Resources/I_Iron.png', get label() { return webUIText('Auto.TopProp.ComponentsScreensMockGlanceScreen.322.7'); }, amount: 520 },
      { icon: '/assets/icons/Resources/I_Armour.png', get label() { return webUIText('Auto.TopProp.ComponentsScreensMockGlanceScreen.323.8'); }, amount: 240 },
      { icon: '/assets/icons/Resources/I_Grain.png', get label() { return webUIText('Auto.TopProp.ComponentsScreensMockGlanceScreen.324.9'); }, amount: 420 },
    ],
  },
];

const PORTS: PortMock[] = [
  {
    get name() { return webUIText("Auto.Prop.componentsscreensMockGlanceScreen.331.1"); },
    settlementName: 'Dawnwall',
    faction: FACTIONS.crown,
    level: 4,
    blockaded: false,
    blockadingNavies: 0,
    blockadingStrength: 0,
    dockedNavyName: 'Dawnwater Fleet',
    dockedNavyStrength: 38,
    tradeValue: 24.6,
  },
  {
    get name() { return webUIText("Auto.Prop.componentsscreensMockGlanceScreen.343.1"); },
    settlementName: 'Saltmere',
    faction: FACTIONS.league,
    level: 3,
    blockaded: true,
    blockadingNavies: 2,
    blockadingStrength: 2160,
    dockedNavyStrength: 0,
    tradeValue: 18.4,
  },
  {
    get name() { return webUIText("Auto.Prop.componentsscreensMockGlanceScreen.354.1"); },
    settlementName: 'Red Hills',
    faction: FACTIONS.marches,
    level: 1,
    blockaded: false,
    blockadingNavies: 0,
    blockadingStrength: 0,
    dockedNavyStrength: 0,
    tradeValue: 4.8,
  },
];

const SETTLEMENT_VARIANTS = [
  { id: 'civic', get label() { return webUIText('Auto.TopProp.ComponentsScreensMockGlanceScreen.367.10'); } },
  { id: 'ward', get label() { return webUIText('Auto.TopProp.ComponentsScreensMockGlanceScreen.368.11'); } },
  { id: 'harbour', get label() { return webUIText('Auto.TopProp.ComponentsScreensMockGlanceScreen.369.12'); } },
] as const;

const ARMY_VARIANTS = [
  { id: 'command', get label() { return webUIText('Auto.TopProp.ComponentsScreensMockGlanceScreen.373.13'); } },
  { id: 'standard', get label() { return webUIText('Auto.TopProp.ComponentsScreensMockGlanceScreen.374.14'); } },
  { id: 'column', get label() { return webUIText('Auto.TopProp.ComponentsScreensMockGlanceScreen.375.15'); } },
] as const;

const NAVY_VARIANTS = [
  { id: 'manifest', get label() { return webUIText('Auto.TopProp.ComponentsScreensMockGlanceScreen.379.16'); } },
  { id: 'ensign', get label() { return webUIText('Auto.TopProp.ComponentsScreensMockGlanceScreen.380.17'); } },
  { id: 'wake', get label() { return webUIText('Auto.TopProp.ComponentsScreensMockGlanceScreen.381.18'); } },
] as const;

const BATTLE_VARIANTS = [
  { id: 'front', get label() { return webUIText('Auto.TopProp.ComponentsScreensMockGlanceScreen.385.19'); } },
  { id: 'clash', get label() { return webUIText('Auto.TopProp.ComponentsScreensMockGlanceScreen.386.20'); } },
  { id: 'losses', get label() { return webUIText('Auto.TopProp.ComponentsScreensMockGlanceScreen.387.21'); } },
] as const;

const CONVOY_VARIANTS = [
  { id: 'manifest', get label() { return webUIText('Auto.TopProp.ComponentsScreensMockGlanceScreen.391.22'); } },
  { id: 'route', get label() { return webUIText('Auto.TopProp.ComponentsScreensMockGlanceScreen.392.23'); } },
  { id: 'distant', get label() { return webUIText('Auto.TopProp.ComponentsScreensMockGlanceScreen.393.24'); } },
] as const;

const PORT_VARIANTS = [
  { id: 'harbour', get label() { return webUIText('Auto.TopProp.ComponentsScreensMockGlanceScreen.397.25'); } },
  { id: 'blockade', get label() { return webUIText('Auto.TopProp.ComponentsScreensMockGlanceScreen.398.26'); } },
  { id: 'distant', get label() { return webUIText('Auto.TopProp.ComponentsScreensMockGlanceScreen.399.27'); } },
] as const;

type SettlementVariant = (typeof SETTLEMENT_VARIANTS)[number]['id'];
type ArmyVariant = (typeof ARMY_VARIANTS)[number]['id'];
type NavyVariant = (typeof NAVY_VARIANTS)[number]['id'];
type BattleVariant = (typeof BATTLE_VARIANTS)[number]['id'];
type ConvoyVariant = (typeof CONVOY_VARIANTS)[number]['id'];
type PortVariant = (typeof PORT_VARIANTS)[number]['id'];

function mockGlanceFaction(faction: MockFaction, relation: FactionRelation): GlanceFactionStub {
  return {
    id: faction.id,
    name: faction.name,
    colour: faction.colour,
    secondaryColour: faction.secondaryColour,
    cultureGroup: faction.cultureGroup,
    emblem: faction.emblem,
    relation,
  };
}

function relationForFaction(faction: MockFaction): FactionRelation {
  if (faction === FACTIONS.crown) return 'own';
  if (faction === FACTIONS.marches) return 'ally';
  return 'enemy';
}

function settlementType(typeLabel: string): SettlementGlanceData['settlementType'] {
  switch (typeLabel) {
    case 'City': return 'city';
    case 'Fortress': return 'fortress';
    case 'Port': return 'port';
    default: return 'town';
  }
}

function mockSettlementData(data: SettlementMock, variant: SettlementVariant): SettlementGlanceData {
  const mapModeId = variant === 'ward' ? 'garrisons' : variant === 'harbour' ? 'economicProsperity' : 'population';
  const mapModeLabel = variant === 'ward' ? 'Garrisons' : variant === 'harbour' ? 'Economy' : 'Population';

  return {
    name: data.name,
    faction: mockGlanceFaction(data.faction, relationForFaction(data.faction)),
    isCapital: data.status === 'Capital',
    isProvincialCapital: false,
    settlementType: settlementType(data.typeLabel),
    health: data.health,
    besieged: data.status === 'Besieged',
    siegeProgress: data.status === 'Besieged' ? data.siegeProgress : 0,
    fortification: data.fortification,
    fortificationProgress: data.fortification / 100,
    starving: data.starving,
    diseased: data.diseased,
    mode: variant === 'ward' ? 'garrisons' : variant === 'harbour' ? 'gold' : 'population',
    mapModeId,
    mapModeLabel,
    monthlyIncome: data.monthlyIncome,
    tradeValue: variant === 'harbour' ? 18.4 : 8.2,
    corruption: data.status === 'Besieged' ? 0.62 : 0.18,
    population: data.population,
    unrest: data.unrest,
    loyalty: data.status === 'Besieged' ? -18 : 42,
    garrison: data.garrison,
    resources: [
      { icon: '/assets/resources/Food.png', label: webUIText('Auto.Prop.ComponentsScreensMockGlanceScreen.458.1'), stock: 240 },
      { icon: '/assets/resources/Stone.png', label: webUIText('Auto.Prop.ComponentsScreensMockGlanceScreen.459.2'), stock: 90 },
    ],
    culture: { label: data.faction.cultureGroup, colour: data.faction.secondaryColour },
    religion: { label: webUIText('Auto.Prop.ComponentsScreensMockGlanceScreen.462.3'), colour: data.faction.secondaryColour },
    governorName: data.status === 'Capital' ? 'Marcia Vennor' : '',
    regionName: data.status === 'Capital' ? 'Aurelion Basin' : 'Namaris Shore',
    landName: 'Inner Dominion',
    domainName: 'Heartland',
    independent: data.faction === FACTIONS.crown,
    overlordName: data.faction === FACTIONS.crown ? '' : FACTIONS.crown.name,
    bishopName: data.status === 'Capital' ? 'Bishop Caldus' : '',
    building: data.status !== 'Besieged' ? { get label() { return data.status === 'Capital' ? webUIText("Auto.Fix.PropExprTrue.componentsscreensMockGlanceScreen.471.1") : webUIText("Auto.Fix.PropExprFalse.componentsscreensMockGlanceScreen.471.1"); }, progress: data.status === 'Capital' ? 0.52 : 0.34 } : undefined,
    warWithPlayer: data.faction !== FACTIONS.crown,
  };
}

function settlementDetailClass(variant: SettlementVariant): WorldGlanceDetailClass {
  if (variant === 'harbour') return 'detail-flag';
  if (variant === 'ward') return 'detail-name';
  return 'detail-detailed';
}

function armyDetailClass(variant: ArmyVariant): WorldGlanceDetailClass {
  if (variant === 'column') return 'detail-flag';
  if (variant === 'standard') return 'detail-name';
  return 'detail-detailed';
}

function navyDetailClass(variant: NavyVariant): WorldGlanceDetailClass {
  if (variant === 'wake') return 'detail-flag';
  if (variant === 'ensign') return 'detail-name';
  return 'detail-detailed';
}

function mockArmyData(data: ForceMock): ArmyGlanceData {
  const relation = relationForFaction(data.faction);
  const attrition = data.name === 'Red Hills Levy' || data.name === 'Saltmere Squadron';
  return {
    name: data.name,
    commander: data.commander,
    currentAction: data.status,
    faction: mockGlanceFaction(data.faction, relation),
    strength: data.strength,
    maxStrength: data.maxStrength,
    morale: data.morale,
    tier: data.tier,
    raiding: data.status === 'Raiding',
    attrition,
    attritionIcon: attrition ? '/assets/icons/Terrain/I_Attrition.png' : '',
    atWarWithPlayer: data.status === 'At war',
    selected: data.name === 'Crown Vanguard' || data.name === 'Dawnwater Fleet',
    targeted: data.name === 'Red Hills Levy' || data.name === 'Saltmere Squadron',
  };
}

function mockNavyData(data: ForceMock): NavyGlanceData {
  return {
    ...mockArmyData(data),
    faction: mockGlanceFaction(data.faction, data.faction === FACTIONS.crown ? 'own' : 'neutral'),
    blockading: data.status === 'Blockade',
  };
}

function SettlementGlanceMock({ data, variant }: { data: SettlementMock; variant: SettlementVariant }) {
  const detailLevel = settlementDetailClass(variant);
  return (
    <div className={`mock-production-glance ${detailLevel}`}>
      <SettlementGlance data={mockSettlementData(data, variant)} />
    </div>
  );
}

function ArmyGlanceMock({ data, variant }: { data: ForceMock; variant: ArmyVariant }) {
  const detailLevel = armyDetailClass(variant);
  return (
    <div className={`mock-round-glance ${detailLevel}`}>
      <ArmyGlance data={mockArmyData(data)} />
    </div>
  );
}

function NavyGlanceMock({ data, variant }: { data: ForceMock; variant: NavyVariant }) {
  const detailLevel = navyDetailClass(variant);
  return (
    <div className={`mock-round-glance ${detailLevel}`}>
      <NavyGlance data={mockNavyData(data)} />
    </div>
  );
}

function battleSide(side: BattleSideMock): BattleGlanceData['attacker'] {
  return {
    participants: [{
      faction: mockGlanceFaction(side.faction, relationForFaction(side.faction)),
      tier: side.strength >= 8000 ? 3 : 2,
      name: side.faction.name,
      commander: 'Field commander',
      strength: side.strength,
      isNavy: false,
    }],
    totalStrength: side.strength,
    morale: side.morale,
    lastLosses: side.losses,
  };
}

function mockBattleData(data: BattleMock): BattleGlanceData {
  return {
    attacker: battleSide(data.attacker),
    defender: battleSide(data.defender),
  };
}

function mockConvoyData(data: ConvoyMock): ConvoyGlanceData {
  return {
    faction: mockGlanceFaction(data.faction, relationForFaction(data.faction)),
    originName: data.originName,
    destinationName: data.destinationName,
    purpose: data.purpose,
    purposeDetails: data.purposeDetails,
    progress: data.progress,
    etaDays: data.etaDays,
    cargoLoad: data.cargoLoad,
    routeType: data.routeType,
    clusterCount: 1,
    cargo: data.cargo,
  };
}

function mockPortData(data: PortMock): PortGlanceData {
  return {
    name: data.name,
    settlementName: data.settlementName,
    faction: mockGlanceFaction(data.faction, relationForFaction(data.faction)),
    level: data.level,
    blockaded: data.blockaded,
    blockadingNavies: data.blockadingNavies,
    blockadingStrength: data.blockadingStrength,
    dockedNavyName: data.dockedNavyName,
    dockedNavyStrength: data.dockedNavyStrength,
    tradeValue: data.tradeValue,
    warWithPlayer: data.faction !== FACTIONS.crown && data.faction !== FACTIONS.marches,
  };
}

function BattleGlanceMock({ data, variant }: { data: BattleMock; variant: BattleVariant }) {
  const detailLevel = variant === 'losses' ? 'detail-flag' : 'detail-name';
  return (
    <div className={`mock-production-glance ${detailLevel}`}>
      <BattleGlance data={mockBattleData(data)} />
    </div>
  );
}

function convoyDetailClass(variant: ConvoyVariant): string {
  if (variant === 'distant') return 'detail-flag';
  if (variant === 'route') return 'detail-name';
  return 'detail-detailed';
}

function ConvoyGlanceMock({ data, variant }: { data: ConvoyMock; variant: ConvoyVariant }) {
  return (
    <div className={`mock-production-glance ${convoyDetailClass(variant)}`}>
      <ConvoyGlance data={mockConvoyData(data)} />
    </div>
  );
}

function PortGlanceMock({ data, variant }: { data: PortMock; variant: PortVariant }) {
  void variant;
  return (
    <div className="mock-production-glance">
      <PortGlance data={mockPortData(data)} />
    </div>
  );
}

function Anchor({ label, className, children }: { label: string; className: string; children: ReactNode }) {
  return (
    <div className={`mock-anchor ${className}`}>
      <span className="mock-anchor-label">{label}</span>
      <span className="mock-anchor-line" />
      <span className="mock-anchor-pin" />
      {children}
    </div>
  );
}

function GlanceBand({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mock-band">
      <div className="mock-band-title">{title}</div>
      <div className="mock-band-samples">{children}</div>
    </section>
  );
}

export default function MockGlanceScreen({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const launcher = document.getElementById('foae-mock-launcher');
    if (!launcher) return;

    const previousDisplay = launcher.style.display;
    launcher.style.display = 'none';
    return () => {
      launcher.style.display = previousDisplay;
    };
  }, []);

  return (
    <div className="mock-glance-screen">
      <img className="mock-map" src="/assets/world-map-painted.jpg" alt="" draggable={false} />
      <div className="mock-map-wash" />

      <div className="mock-glance-toolbar">
        <div className="mock-glance-heading">
          <h1><WebUIText textKey="Auto.ComponentsScreensMockGlanceScreen.680.1" /></h1>
          <span><WebUIText textKey="Auto.ComponentsScreensMockGlanceScreen.681.2" /></span>
        </div>
        <CloseButton onClick={onClose} />
      </div>

      <div className="mock-glance-field">
        <GlanceBand title={webUIText('Auto.Attr.ComponentsScreensMockGlanceScreen.687.4')}>
          {SETTLEMENT_VARIANTS.map((variant, index) => (
            <Anchor key={variant.id} label={variant.label} className={`mock-anchor--settlement-${index + 1}`}>
              <SettlementGlanceMock data={SETTLEMENTS[index]} variant={variant.id} />
            </Anchor>
          ))}
        </GlanceBand>
        <GlanceBand title={webUIText('Auto.Attr.ComponentsScreensMockGlanceScreen.694.5')}>
          {PORT_VARIANTS.map((variant, index) => (
            <Anchor key={variant.id} label={variant.label} className={`mock-anchor--port-${index + 1}`}>
              <PortGlanceMock data={PORTS[index]} variant={variant.id} />
            </Anchor>
          ))}
        </GlanceBand>
        <GlanceBand title={webUIText('Auto.Attr.ComponentsScreensMockGlanceScreen.701.6')}>
          {ARMY_VARIANTS.map((variant, index) => (
            <Anchor key={variant.id} label={variant.label} className={`mock-anchor--army-${index + 1}`}>
              <ArmyGlanceMock data={ARMIES[index]} variant={variant.id} />
            </Anchor>
          ))}
        </GlanceBand>
        <GlanceBand title={webUIText('Auto.Attr.ComponentsScreensMockGlanceScreen.708.7')}>
          {NAVY_VARIANTS.map((variant, index) => (
            <Anchor key={variant.id} label={variant.label} className={`mock-anchor--navy-${index + 1}`}>
              <NavyGlanceMock data={NAVIES[index]} variant={variant.id} />
            </Anchor>
          ))}
        </GlanceBand>
        <GlanceBand title={webUIText('Auto.Attr.ComponentsScreensMockGlanceScreen.715.8')}>
          {BATTLE_VARIANTS.map((variant, index) => (
            <Anchor key={variant.id} label={variant.label} className={`mock-anchor--battle-${index + 1}`}>
              <BattleGlanceMock data={BATTLES[index]} variant={variant.id} />
            </Anchor>
          ))}
        </GlanceBand>
        <GlanceBand title={webUIText('Auto.Attr.ComponentsScreensMockGlanceScreen.722.9')}>
          {CONVOY_VARIANTS.map((variant, index) => (
            <Anchor key={variant.id} label={variant.label} className={`mock-anchor--convoy-${index + 1}`}>
              <ConvoyGlanceMock data={CONVOYS[index]} variant={variant.id} />
            </Anchor>
          ))}
        </GlanceBand>
      </div>
    </div>
  );
}

if (import.meta.env.DEV) {
  registerScreen({
    id: 'glance-mocks',
    render: ({ onClose }) => <MockGlanceScreen onClose={onClose} />,
    overlayVariant: 'glance-mocks',
  });
}
