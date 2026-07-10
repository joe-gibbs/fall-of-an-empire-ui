export type FactionRelation = 'own' | 'ally' | 'neutral' | 'enemy';
export type WorldGlanceDetailClass = 'detail-flag' | 'detail-name' | 'detail-detailed';

export interface GlanceFactionStub {
  id?: string;
  debugShortId?: number;
  name: string;
  colour: string;
  secondaryColour: string;
  cultureGroup: string;
  emblem?: string;
  relation: FactionRelation;
  isRebel?: boolean;
}

export interface ArmyGlanceData {
  id: string;
  faction: GlanceFactionStub;
  strength: number;
  morale: number;
  tier: 1 | 2 | 3 | 4 | 5;
  raiding?: boolean;
  attrition?: boolean;
  attritionIcon?: string;
  selected?: boolean;
  targeted?: boolean;
}

export interface NavyGlanceData extends ArmyGlanceData {
  blockading?: boolean;
}

export interface BattleParticipant {
  faction: GlanceFactionStub;
}

export interface BattleSideData {
  participants: BattleParticipant[];
  totalStrength: number;
  morale: number;
  lastLosses: number;
}

export interface BattleGlanceData {
  id: string;
  targeted?: boolean;
  attacker: BattleSideData;
  defender: BattleSideData;
}

export interface ConvoyCargoData {
  icon: string;
  amount: number;
}

export interface ConvoyGlanceData {
  id: string;
  faction: GlanceFactionStub;
  routeType: 'road' | 'sea';
  cargo: ConvoyCargoData[];
}

export type SettlementInfoMode =
  | 'gold'
  | 'political' | 'overlord' | 'diplomaticRelation'
  | 'population' | 'unrest' | 'culture' | 'religion'
  | 'loyalty' | 'landscape' | 'settlementType'
  | 'economicProsperity' | 'economy'
  | 'adminRegion' | 'adminLand' | 'adminDomain'
  | 'disease' | 'militaries' | 'regionGovernor'
  | 'corruption' | 'trade' | 'resources' | 'stockpiles'
  | 'garrisons' | 'bishopric' | 'garrison';

export interface SettlementGlanceData {
  debugShortId?: number;
  name: string;
  faction: GlanceFactionStub;
  occupier?: GlanceFactionStub;
  isCapital?: boolean;
  isProvincialCapital?: boolean;
  settlementType: 'city' | 'town' | 'village' | 'metropolis' | 'fortress' | 'monastery' | 'port' | 'mining';
  badgeScale: number;
  health: number;
  selected?: boolean;
  targeted?: boolean;
  besieged?: boolean;
  siegeProgress: number;
  fortification: number;
  fortificationProgress: number;
  starving?: boolean;
  diseased?: boolean;
  mode: SettlementInfoMode;
  mapModeId: string;
  mapModeLabel: string;
  monthlyIncome: number;
  tradeValue: number;
  corruption: number;
  population: number;
  unrest: number;
  loyalty: number;
  garrison: number;
  resources: Array<{ icon: string; label: string; stock: number }>;
  culture: { label: string; colour: string };
  religion: { label: string; colour: string };
  governorName?: string;
  governorDebugShortId?: number;
  complianceTargetLabel?: string;
  complianceTargetName?: string;
  complianceTargetIsRuler?: boolean;
  complianceLuxuryLabel?: string;
  complianceLuxuryStatus?: string;
  regionName?: string;
  landName?: string;
  domainName?: string;
  independent?: boolean;
  overlordName?: string;
  bishopName?: string;
  building?: { label: string; progress: number };
  armyRecruit?: { label: string; progress: number };
  navyRecruit?: { label: string; progress: number };
  warWithPlayer?: boolean;
}

export interface PortGlanceData {
  id: string;
  faction: GlanceFactionStub;
  level: number;
  selected?: boolean;
  targeted?: boolean;
  blockaded?: boolean;
}
