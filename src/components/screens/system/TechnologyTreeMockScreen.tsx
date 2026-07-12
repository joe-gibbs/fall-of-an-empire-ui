import { useMemo, useState } from 'react';
import ScreenShell from '../../common/layout/shell/ScreenShell';
import Tooltip from '../../common/tooltips/Tooltip';
import GameButton from '../../common/buttons/GameButton';
import ZoomPanCanvas, { type ZoomPanInitialView } from '../../common/layout/scrolling/ZoomPanCanvas';
import { formatNumber } from '../../../utils/numberFormat';
import { designRem, designUnitScale } from '../../../utils/cssUnits';
import { registerScreen, registerTopbarButton } from '../../../registry/index';
import { webUIText, useWebUIText } from '../../../localization/WebUITextContext';
import './TechnologyTreeMockScreen.css';

type TechStatus = 'researched' | 'researching' | 'available' | 'locked';

interface TechTab {
  id: string;
  labelKey: string;
  icon: string;
}

interface TechTier {
  id: string;
  labelKey: string;
}

interface TechLane {
  id: string;
  labelKey: string;
  icon: string;
}

interface TechNode {
  id: string;
  tier: number;
  lane: number;
  laneSlot: 0 | 1;
  titleKey: string;
  icon: string;
  art: string;
  status: TechStatus;
  progress?: number;
  cost: number;
  days: number;
  requires: string[];
  unlocks: string[];
}

interface PlacedTech {
  tech: TechNode;
  x: number;
  y: number;
}

interface TechLink {
  from: PlacedTech;
  to: PlacedTech;
  channelX?: number;
  sourceOffsetY?: number;
  targetOffsetY?: number;
}

interface TechLayout {
  width: number;
  height: number;
  nodes: PlacedTech[];
  links: TechLink[];
}

const CARD_W = 132;
const CARD_H = 52;
const TIER_W = 190;
const TIER_H = 842;
const TIER_HEADER_H = 34;
const LANE_STEP = 132;
const LANE_LABEL_W = 86;
const CANVAS_PAD_X = 20;
const CANVAS_PAD_TOP = 18;
const NODE_INSET_X = 17;
const NODE_SLOT_Y = [8, 72] as const;

const NUM_TIERS = 6;
const CANVAS_W = CANVAS_PAD_X * 2 + LANE_LABEL_W + NUM_TIERS * TIER_W + 14;
const CANVAS_H = CANVAS_PAD_TOP * 2 + TIER_H;

const INITIAL_ZOOM = 1;
const MIN_ZOOM = 0.42;
const MAX_ZOOM = 1.55;
const ZOOM_STEP = 1.15;

const TABS: TechTab[] = [
  { id: 'civic', labelKey: 'TechnologyMock.Tab.Civic', icon: '/assets/icons/I_Domain.png' },
  { id: 'military', labelKey: 'TechnologyMock.Tab.Military', icon: '/assets/icons/I_ArmiesQuickButton.png' },
  { id: 'faith', labelKey: 'TechnologyMock.Tab.Faith', icon: '/assets/icons/I_Religions.png' },
  { id: 'logistics', labelKey: 'TechnologyMock.Tab.Logistics', icon: '/assets/icons/I_RequisitionSupplies.png' },
];

const TIERS: TechTier[] = [
  { id: 'tier-1', labelKey: 'TechnologyMock.Tier.I' },
  { id: 'tier-2', labelKey: 'TechnologyMock.Tier.II' },
  { id: 'tier-3', labelKey: 'TechnologyMock.Tier.III' },
  { id: 'tier-4', labelKey: 'TechnologyMock.Tier.IV' },
  { id: 'tier-5', labelKey: 'TechnologyMock.Tier.V' },
  { id: 'tier-6', labelKey: 'TechnologyMock.Tier.VI' },
];

const LANES: TechLane[] = [
  { id: 'command', labelKey: 'TechnologyMock.Lane.Command', icon: '/assets/icons/Command/I_Command_Delegated.png' },
  { id: 'training', labelKey: 'TechnologyMock.Lane.Training', icon: '/assets/icons/Doctrines/I_Doctrine_Garrison.png' },
  { id: 'scouting', labelKey: 'TechnologyMock.Lane.Scouting', icon: '/assets/icons/BattleActions/I_ScoutScreen.png' },
  { id: 'supply', labelKey: 'TechnologyMock.Lane.Supply', icon: '/assets/icons/I_RequisitionSupplies.png' },
  { id: 'siegecraft', labelKey: 'TechnologyMock.Lane.Siegecraft', icon: '/assets/icons/I_Fortification.png' },
  { id: 'naval-works', labelKey: 'TechnologyMock.Lane.NavalWorks', icon: '/assets/icons/I_Port.png' },
];

function tech(
  id: string,
  tier: number,
  lane: number,
  laneSlot: 0 | 1,
  titleKey: string,
  icon: string,
  art: string,
  status: TechStatus,
  requires: string[] = [],
  progress = 0,
): TechNode {
  const baseCost = 72 + tier * 48 + lane * 7;
  const days = status === 'researched' ? 0 : 48 + tier * 28 + lane * 3;
  return {
    id,
    tier,
    lane,
    laneSlot,
    titleKey,
    icon,
    art,
    status,
    progress: status === 'researching' ? progress : undefined,
    cost: baseCost,
    days,
    requires,
    unlocks: [],
  };
}

function withUnlocks(nodes: TechNode[]): TechNode[] {
  const byId = new Map(nodes.map(node => [node.id, { ...node, unlocks: [] as string[] }]));
  for (const node of nodes) {
    for (const reqId of node.requires) {
      byId.get(reqId)?.unlocks.push(node.id);
    }
  }
  return nodes.map(node => byId.get(node.id) ?? node);
}

const TECHNOLOGIES: TechNode[] = withUnlocks([
  tech('muster-rolls', 0, 0, 0, 'TechnologyMock.Node.MusterRolls', '/assets/icons/I_ArmiesQuickButton.png', '/assets/events/military-chain-of-command.png', 'researched'),
  tech('levy-signals', 0, 0, 1, 'TechnologyMock.Node.LevySignals', '/assets/icons/BattleActions/I_Rally.png', '/assets/events/secret-message.png', 'researched'),
  tech('camp-discipline', 0, 1, 0, 'TechnologyMock.Node.CampDiscipline', '/assets/icons/Doctrines/I_Doctrine_Garrison.png', '/assets/events/mercenary-camp.png', 'researched'),
  tech('watch-patrols', 0, 2, 0, 'TechnologyMock.Node.WatchPatrols', '/assets/icons/BattleActions/I_ScoutScreen.png', '/assets/events/scout-report.png', 'researched'),
  tech('river-scouts', 0, 2, 1, 'TechnologyMock.Node.RiverScouts', '/assets/icons/I_Land.png', '/assets/events/river-crossing.png', 'researched'),
  tech('pack-ledgers', 0, 3, 0, 'TechnologyMock.Node.PackLedgers', '/assets/icons/I_Chart.png', '/assets/events/library-archive.png', 'researched'),
  tech('granary-stores', 0, 3, 1, 'TechnologyMock.Node.GranaryStores', '/assets/icons/Resources/I_Grain.png', '/assets/events/granary-stores.png', 'researched'),
  tech('field-tools', 0, 4, 0, 'TechnologyMock.Node.FieldTools', '/assets/icons/Resources/I_Iron.png', '/assets/events/arsenal-workshop.png', 'researched'),
  tech('harbour-lists', 0, 5, 0, 'TechnologyMock.Node.HarbourLists', '/assets/icons/I_Port.png', '/assets/events/settlement-port.png', 'researched'),

  tech('camp-courts', 1, 0, 0, 'TechnologyMock.Node.CampCourts', '/assets/icons/I_Compliance.png', '/assets/events/regency-council.png', 'available', ['muster-rolls']),
  tech('standard-bearers', 1, 0, 1, 'TechnologyMock.Node.StandardBearers', '/assets/icons/I_Fame.png', '/assets/events/military-victory.png', 'researched', ['levy-signals']),
  tech('shield-drill', 1, 1, 0, 'TechnologyMock.Node.ShieldDrill', '/assets/icons/I_Armour.png', '/assets/events/edict-reform-field-armies.png', 'researched', ['camp-discipline']),
  tech('drilled-formations', 1, 1, 1, 'TechnologyMock.Node.DrilledFormations', '/assets/icons/FormationStance/I_Defensive.png', '/assets/events/interaction-study-military-tactics.png', 'researching', ['shield-drill', 'muster-rolls'], 0.62),
  tech('horse-screens', 1, 2, 0, 'TechnologyMock.Node.HorseScreens', '/assets/icons/UnitTypes/I_ArmyCavalry.png', '/assets/events/cavalry-charge.png', 'available', ['watch-patrols']),
  tech('road-wardens', 1, 2, 1, 'TechnologyMock.Node.RoadWardens', '/assets/icons/I_Rebuild.png', '/assets/events/road-building.png', 'available', ['river-scouts']),
  tech('forage-tables', 1, 3, 0, 'TechnologyMock.Node.ForageTables', '/assets/icons/I_Food.png', '/assets/events/harvest-celebration.png', 'researched', ['pack-ledgers']),
  tech('field-surgeons', 1, 3, 1, 'TechnologyMock.Node.FieldSurgeons', '/assets/icons/I_Alms.png', '/assets/events/medical-treatment.png', 'available', ['camp-discipline']),
  tech('siege-crews', 1, 4, 0, 'TechnologyMock.Node.SiegeCrews', '/assets/icons/I_Fortification.png', '/assets/events/siege-engines.png', 'available', ['field-tools']),
  tech('coastal-lookouts', 1, 5, 0, 'TechnologyMock.Node.CoastalLookouts', '/assets/icons/I_Anchor.png', '/assets/events/lighthouse-beacon.png', 'researched', ['harbour-lists']),

  tech('command-posts', 2, 0, 0, 'TechnologyMock.Node.CommandPosts', '/assets/icons/Command/I_Command_Delegated.png', '/assets/events/military-chain-of-command.png', 'available', ['standard-bearers', 'drilled-formations']),
  tech('signal-towers', 2, 0, 1, 'TechnologyMock.Node.SignalTowers', '/assets/icons/BattleActions/I_Rally.png', '/assets/events/border-watchtower.png', 'locked', ['standard-bearers', 'coastal-lookouts']),
  tech('reserve-lines', 2, 1, 0, 'TechnologyMock.Node.ReserveLines', '/assets/icons/Doctrines/I_Doctrine_Concentrate.png', '/assets/events/doctrine-concentrate.png', 'available', ['drilled-formations']),
  tech('veteran-cadres', 2, 1, 1, 'TechnologyMock.Node.VeteranCadres', '/assets/icons/I_Honor.png', '/assets/events/military-victory.png', 'locked', ['drilled-formations', 'field-surgeons']),
  tech('night-watches', 2, 2, 0, 'TechnologyMock.Node.NightWatches', '/assets/icons/I_Intrigue.png', '/assets/events/forest-ambush.png', 'locked', ['road-wardens']),
  tech('mule-trains', 2, 3, 0, 'TechnologyMock.Node.MuleTrains', '/assets/icons/I_RequisitionSupplies.png', '/assets/events/desert-crossing.png', 'available', ['forage-tables']),
  tech('forward-depots', 2, 3, 1, 'TechnologyMock.Node.ForwardDepots', '/assets/icons/I_City.png', '/assets/events/defensive-wall.png', 'locked', ['forage-tables']),
  tech('wall-sappers', 2, 4, 0, 'TechnologyMock.Node.WallSappers', '/assets/icons/BattleActions/I_Ambush.png', '/assets/events/siege-assault.png', 'locked', ['siege-crews']),
  tech('armour-fittings', 2, 4, 1, 'TechnologyMock.Node.ArmourFittings', '/assets/icons/Resources/I_Armour.png', '/assets/events/arsenal-workshop.png', 'locked', ['shield-drill']),
  tech('supply-barges', 2, 5, 0, 'TechnologyMock.Node.SupplyBarges', '/assets/icons/Resources/I_Sails.png', '/assets/events/merchant-port.png', 'locked', ['coastal-lookouts', 'forage-tables']),

  tech('officer-colleges', 3, 0, 0, 'TechnologyMock.Node.OfficerColleges', '/assets/icons/I_Bishop.png', '/assets/events/philosophical-debate.png', 'locked', ['command-posts', 'reserve-lines']),
  tech('banner-codes', 3, 0, 1, 'TechnologyMock.Node.BannerCodes', '/assets/icons/I_Family.png', '/assets/events/fresco-painting.png', 'locked', ['command-posts']),
  tech('beacon-chains', 3, 1, 0, 'TechnologyMock.Node.BeaconChains', '/assets/icons/I_Caution.png', '/assets/events/comet-portent.png', 'locked', ['signal-towers']),
  tech('allied-captains', 3, 1, 1, 'TechnologyMock.Node.AlliedCaptains', '/assets/icons/I_InviteFoederati.png', '/assets/events/interaction-commission-foederati-officers.png', 'locked', ['veteran-cadres']),
  tech('cavalry-reserves', 3, 2, 0, 'TechnologyMock.Node.CavalryReserves', '/assets/icons/BattleActions/I_CavalryCharge.png', '/assets/events/cavalry-charge.png', 'locked', ['horse-screens', 'reserve-lines']),
  tech('arrow-stores', 3, 3, 0, 'TechnologyMock.Node.ArrowStores', '/assets/icons/BattleActions/I_ArcherVolley.png', '/assets/events/arsenal-workshop.png', 'locked', ['forward-depots']),
  tech('engine-frames', 3, 4, 0, 'TechnologyMock.Node.EngineFrames', '/assets/icons/I_Fortress.png', '/assets/events/siege-engines.png', 'locked', ['wall-sappers', 'armour-fittings']),
  tech('gate-breakers', 3, 4, 1, 'TechnologyMock.Node.GateBreakers', '/assets/icons/BattleActions/I_HeavyCharge.png', '/assets/events/sally-forth.png', 'locked', ['wall-sappers']),
  tech('harbour-musters', 3, 5, 0, 'TechnologyMock.Node.HarbourMusters', '/assets/icons/I_NaviesQuickButton.png', '/assets/events/naval-battle.png', 'locked', ['supply-barges']),

  tech('staff-councils', 4, 0, 0, 'TechnologyMock.Node.StaffCouncils', '/assets/icons/I_Domain.png', '/assets/events/senate-debate.png', 'locked', ['officer-colleges']),
  tech('frontier-muster', 4, 1, 0, 'TechnologyMock.Node.FrontierMuster', '/assets/icons/Armies/I_ArmyRephsian.png', '/assets/events/foreign-invasion.png', 'locked', ['allied-captains', 'banner-codes']),
  tech('harried-pursuit', 4, 2, 0, 'TechnologyMock.Node.HarriedPursuit', '/assets/icons/BattleActions/I_Flank.png', '/assets/events/forest-ambush.png', 'locked', ['cavalry-reserves', 'night-watches']),
  tech('weather-roads', 4, 2, 1, 'TechnologyMock.Node.WeatherRoads', '/assets/icons/I_Rebuild.png', '/assets/events/flood-disaster.png', 'locked', ['beacon-chains', 'mule-trains']),
  tech('march-columns', 4, 3, 0, 'TechnologyMock.Node.MarchColumns', '/assets/icons/Doctrines/I_Doctrine_Independent.png', '/assets/events/road-building.png', 'locked', ['officer-colleges', 'mule-trains']),
  tech('ration-contracts', 4, 3, 1, 'TechnologyMock.Node.RationContracts', '/assets/icons/I_Coins.png', '/assets/events/interaction-requisition-supplies.png', 'locked', ['arrow-stores', 'forward-depots']),
  tech('fort-plans', 4, 4, 0, 'TechnologyMock.Node.FortPlans', '/assets/icons/I_Fortification.png', '/assets/events/settlement-fortress.png', 'locked', ['engine-frames', 'gate-breakers']),
  tech('fleet-escorts', 4, 5, 0, 'TechnologyMock.Node.FleetEscorts', '/assets/icons/BattleActions/I_BoardingParty.png', '/assets/events/naval-battle.png', 'locked', ['harbour-musters']),

  tech('guard-rotations', 5, 0, 0, 'TechnologyMock.Node.GuardRotations', '/assets/icons/I_Locked.png', '/assets/events/border-skirmish.png', 'locked', ['staff-councils']),
  tech('war-accounts', 5, 0, 1, 'TechnologyMock.Node.WarAccounts', '/assets/icons/I_Chart.png', '/assets/events/library-archive.png', 'locked', ['staff-councils', 'march-columns']),
  tech('shield-walls', 5, 1, 0, 'TechnologyMock.Node.ShieldWalls', '/assets/icons/BattleActions/I_NorthernShieldWall.png', '/assets/events/defensive-wall.png', 'locked', ['frontier-muster', 'fort-plans']),
  tech('realm-drill', 5, 1, 1, 'TechnologyMock.Node.RealmDrill', '/assets/icons/Doctrines/I_Doctrine_Screen.png', '/assets/events/edict-reform-field-armies.png', 'locked', ['shield-walls', 'banner-codes']),
  tech('chain-command', 5, 2, 0, 'TechnologyMock.Node.ChainCommand', '/assets/icons/I_AttachCommand.png', '/assets/events/military-chain-of-command.png', 'locked', ['guard-rotations', 'realm-drill']),
  tech('deep-magazines', 5, 3, 0, 'TechnologyMock.Node.DeepMagazines', '/assets/icons/Resources/I_Weapons.png', '/assets/events/arsenal-workshop.png', 'locked', ['ration-contracts']),
  tech('artillery-parks', 5, 4, 0, 'TechnologyMock.Node.ArtilleryParks', '/assets/icons/BattleActions/I_ArtilleryBarrage.png', '/assets/events/siege-engines.png', 'locked', ['fort-plans', 'deep-magazines']),
  tech('field-standards', 5, 4, 1, 'TechnologyMock.Node.FieldStandards', '/assets/icons/I_Swords.png', '/assets/events/military-victory.png', 'locked', ['artillery-parks', 'chain-command']),
]);

const TECHNOLOGY_BY_ID = new Map(TECHNOLOGIES.map(node => [node.id, node]));

function techProgress(techNode: TechNode): number {
  if (techNode.status === 'researched') return 1;
  return techNode.progress ?? 0;
}

function getTech(id: string): TechNode | undefined {
  return TECHNOLOGY_BY_ID.get(id);
}

function cardArt(art: string): string {
  return art.replace('/assets/events/', '/assets/events/thumbs/');
}

function statusLabel(status: TechStatus): string {
  switch (status) {
    case 'researched': return webUIText('TechnologyMock.Status.Researched');
    case 'researching': return webUIText('TechnologyMock.Status.Researching');
    case 'available': return webUIText('TechnologyMock.Status.Available');
    case 'locked': return webUIText('TechnologyMock.Status.Locked');
    default: return '';
  }
}

function statusIcon(status: TechStatus): string {
  switch (status) {
    case 'researched': return '/assets/icons/I_GoalMet.png';
    case 'researching': return '/assets/icons/I_Cooling.png';
    case 'locked': return '/assets/icons/I_Locked.png';
    default: return '/assets/icons/I_GoalNotMet.png';
  }
}

function showsStatusIcon(status: TechStatus): boolean {
  return status === 'researched' || status === 'locked';
}

function tierX(tier: number): number {
  return CANVAS_PAD_X + LANE_LABEL_W + tier * TIER_W;
}

function laneY(lane: number): number {
  return CANVAS_PAD_TOP + TIER_HEADER_H + lane * LANE_STEP;
}

function nodeX(techNode: TechNode): number {
  return tierX(techNode.tier) + NODE_INSET_X;
}

function nodeY(techNode: TechNode): number {
  return laneY(techNode.lane) + NODE_SLOT_Y[techNode.laneSlot];
}

function linkId(fromId: string, toId: string): string {
  return `${fromId}->${toId}`;
}

function linkKey(link: TechLink): string {
  return linkId(link.from.tech.id, link.to.tech.id);
}

function buildLayout(): TechLayout {
  const nodes: PlacedTech[] = TECHNOLOGIES.map(item => ({ tech: item, x: nodeX(item), y: nodeY(item) }));
  const byId = new Map(nodes.map(node => [node.tech.id, node]));
  const links: TechLink[] = [];

  for (const node of nodes) {
    const primaryParent = node.tech.requires
      .map(reqId => byId.get(reqId))
      .filter((item): item is PlacedTech => !!item && node.tech.tier >= item.tech.tier)
      .sort((a, b) => {
        const laneDelta = Math.abs(a.tech.lane - node.tech.lane) - Math.abs(b.tech.lane - node.tech.lane);
        if (laneDelta !== 0) return laneDelta;
        const verticalDelta = Math.abs(nodeY(a.tech) - nodeY(node.tech)) - Math.abs(nodeY(b.tech) - nodeY(node.tech));
        if (verticalDelta !== 0) return verticalDelta;
        const tierDelta = Math.abs(a.tech.tier - node.tech.tier) - Math.abs(b.tech.tier - node.tech.tier);
        if (tierDelta !== 0) return tierDelta;
        return 0;
      })[0];

    if (
      primaryParent
      && (
        primaryParent.tech.tier < node.tech.tier && Math.abs(primaryParent.tech.lane - node.tech.lane) <= 1
        || primaryParent.tech.tier === node.tech.tier && primaryParent.tech.lane === node.tech.lane
      )
    ) {
      links.push({ from: primaryParent, to: node });
    }
  }

  return { width: CANVAS_W, height: CANVAS_H, nodes, links: assignLinkChannels(links) };
}

function linkChannelGroup(link: TechLink): string {
  return `${link.from.tech.tier}-${link.to.tech.tier}`;
}

function linkNeedsChannel(link: TechLink): boolean {
  return link.from.tech.tier !== link.to.tech.tier && Math.abs(linkSourceY(link) - linkTargetY(link)) >= 0.5;
}

function assignLinkChannels(links: TechLink[]): TechLink[] {
  const routedLinks = links.map(link => ({ ...link }));
  const groups = new Map<string, TechLink[]>();
  const outgoing = new Map<string, TechLink[]>();
  const incoming = new Map<string, TechLink[]>();

  for (const link of routedLinks) {
    const outgoingGroup = outgoing.get(link.from.tech.id);
    if (outgoingGroup) outgoingGroup.push(link);
    else outgoing.set(link.from.tech.id, [link]);

    const incomingGroup = incoming.get(link.to.tech.id);
    if (incomingGroup) incomingGroup.push(link);
    else incoming.set(link.to.tech.id, [link]);

    if (!linkNeedsChannel(link)) continue;

    const groupKey = linkChannelGroup(link);
    const group = groups.get(groupKey);
    if (group) group.push(link);
    else groups.set(groupKey, [link]);
  }

  groups.forEach((group) => {
    const ordered = [...group].sort((a, b) => {
      const aAverageY = (linkSourceY(a) + linkTargetY(a)) / 2;
      const bAverageY = (linkSourceY(b) + linkTargetY(b)) / 2;
      if (aAverageY !== bAverageY) return aAverageY - bAverageY;
      return linkSourceY(a) - linkSourceY(b);
    });

    ordered.forEach((link, index) => {
      const minX = linkSourceX(link) + 8;
      const maxX = linkTargetX(link) - 8;
      const width = Math.max(1, maxX - minX);
      link.channelX = minX + width * (index + 1) / (ordered.length + 1);
    });
  });

  outgoing.forEach((group) => assignNodePortOffsets(group, true));
  incoming.forEach((group) => assignNodePortOffsets(group, false));

  return routedLinks;
}

function portOffset(index: number, count: number): number {
  if (count <= 1) return 0;

  const step = Math.min(14, CARD_H / (count + 1));
  return (index - (count - 1) / 2) * step;
}

function assignNodePortOffsets(group: TechLink[], sourcePort: boolean): void {
  const ordered = [...group].sort((a, b) => {
    const aY = sourcePort ? linkTargetY(a) : linkSourceY(a);
    const bY = sourcePort ? linkTargetY(b) : linkSourceY(b);
    if (aY !== bY) return aY - bY;

    const aX = sourcePort ? linkTargetX(a) : linkSourceX(a);
    const bX = sourcePort ? linkTargetX(b) : linkSourceX(b);
    return aX - bX;
  });

  ordered.forEach((link, index) => {
    if (sourcePort) {
      link.sourceOffsetY = portOffset(index, ordered.length);
      return;
    }

    link.targetOffsetY = portOffset(index, ordered.length);
  });
}

function requirementPathLinkIds(techId: string, links: TechLink[]): Set<string> {
  const activeLinks = new Set<string>();
  const incomingByTechId = new Map(links.map(link => [link.to.tech.id, link]));
  let cursorId: string | undefined = techId;

  while (cursorId) {
    const link = incomingByTechId.get(cursorId);
    if (!link) break;

    activeLinks.add(linkKey(link));
    cursorId = link.from.tech.id;
  }

  return activeLinks;
}

function linkSourceX(link: TechLink): number {
  return link.from.x + CARD_W;
}

function linkTargetX(link: TechLink): number {
  return link.to.x;
}

function linkSourceY(link: TechLink): number {
  return link.from.y + CARD_H / 2 + (link.sourceOffsetY ?? 0);
}

function linkTargetY(link: TechLink): number {
  return link.to.y + CARD_H / 2 + (link.targetOffsetY ?? 0);
}

function connectionPath(link: TechLink): string {
  const startX = linkSourceX(link);
  const startY = linkSourceY(link);
  const endX = linkTargetX(link);
  const endY = linkTargetY(link);
  const tierSpan = link.to.tech.tier - link.from.tech.tier;
  const sameLane = link.from.tech.lane === link.to.tech.lane;

  if (link.from.tech.tier === link.to.tech.tier) {
    const sideX = Math.max(link.from.x + CARD_W, link.to.x + CARD_W) + 10;
    const targetRightX = link.to.x + CARD_W;
    return `M ${startX} ${startY} H ${sideX} V ${endY} H ${targetRightX}`;
  }

  if (Math.abs(startY - endY) < 0.5) {
    if (sameLane && tierSpan > 1) {
      const corridorY = laneY(link.to.tech.lane) + LANE_STEP - 4;
      const startStubX = startX + 20;
      const endStubX = endX - 20;
      return `M ${startX} ${startY} H ${startStubX} V ${corridorY} H ${endStubX} V ${endY} H ${endX}`;
    }

    return `M ${startX} ${startY} H ${endX}`;
  }

  const gutterX = link.channelX ?? startX + (endX - startX) / 2;
  return `M ${startX} ${startY} H ${gutterX} V ${endY} H ${endX}`;
}

function linkStroke(link: TechLink): string {
  if (link.to.tech.status === 'researched' || link.to.tech.status === 'researching') return 'rgba(215, 183, 98, 0.72)';
  if (link.to.tech.status === 'available') return 'rgba(132, 169, 190, 0.62)';
  return 'rgba(132, 126, 105, 0.38)';
}

function arrowHead(link: TechLink): string {
  const x = link.from.tech.tier === link.to.tech.tier ? link.to.x + CARD_W : linkTargetX(link);
  const y = linkTargetY(link);
  if (link.from.tech.tier === link.to.tech.tier) {
    return `${x + 5},${y - 4} ${x},${y} ${x + 5},${y + 4}`;
  }
  return `${x - 5},${y - 4} ${x},${y} ${x - 5},${y + 4}`;
}

function buildInitialView(): ZoomPanInitialView {
  return (metrics) => {
    const zoom = Math.max(
      MIN_ZOOM,
      Math.min(
        INITIAL_ZOOM,
        (metrics.viewportWidth - 24) / metrics.contentWidth,
        (metrics.viewportHeight - 24) / metrics.contentHeight,
      ),
    );
    return {
      zoom,
      panX: Math.max(12, (metrics.viewportWidth - metrics.contentWidth * zoom) / 2),
      panY: 12,
    };
  };
}

function TechTabs() {
  const t = useWebUIText();
  return (
    <div className="tts-tabs">
      {TABS.map(tab => (
        <button
          key={tab.id}
          type="button"
          className={`tts-tab ${tab.id === 'military' ? 'tts-tab--active' : ''}`}
          onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); }}
        >
          <img src={tab.icon} alt="" className="tts-tab-icon" draggable={false} />
          <span className="tts-tab-label">{t(tab.labelKey)}</span>
        </button>
      ))}
    </div>
  );
}

function BoardBackplate() {
  const t = useWebUIText();

  return (
    <div className="tts-canvas-backplate">
      {LANES.map((lane, index) => (
        <div
          key={lane.id}
          className="tts-lane-row"
          style={{
            left: designRem(CANVAS_PAD_X),
            top: designRem(laneY(index) - 4),
            width: designRem(CANVAS_W - CANVAS_PAD_X * 2),
            height: designRem(LANE_STEP - 8),
          }}
        >
          <div className="tts-lane-label">
            <img src={lane.icon} alt="" className="tts-lane-icon" draggable={false} />
            <span>{t(lane.labelKey)}</span>
          </div>
        </div>
      ))}
      {TIERS.map((tier, index) => (
        <div
          key={tier.id}
          className="tts-tier-label"
          style={{
            left: designRem(tierX(index) + NODE_INSET_X),
            top: designRem(CANVAS_PAD_TOP + 7),
            width: designRem(CARD_W),
          }}
        >
          {t(tier.labelKey)}
        </div>
      ))}
    </div>
  );
}

function TechNodeCard({
  node,
  selected,
  onSelect,
  onHover,
}: {
  node: PlacedTech;
  selected: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const t = useWebUIText();
  const { tech: techNode } = node;
  const pct = Math.round(techProgress(techNode) * 100);
  const tooltip = {
    title: t(techNode.titleKey),
    body: t('TechnologyMock.Node.GenericSummary'),
    lines: [
      { label: t('TechnologyMock.Detail.Progress'), value: `${formatNumber(pct)}%` },
      { label: t('TechnologyMock.Detail.Cost'), value: t('TechnologyMock.Detail.CostValue', { Amount: formatNumber(techNode.cost) }) },
      { label: t('TechnologyMock.Detail.Time'), value: techNode.days > 0 ? t('TechnologyMock.Detail.Days', { Days: formatNumber(techNode.days) }) : t('TechnologyMock.Detail.Complete') },
    ],
    footer: t('TechnologyMock.Node.GenericEffect'),
  };

  return (
    <div
      className="tts-node-wrap"
      style={{ left: designRem(node.x), top: designRem(node.y), width: designRem(CARD_W), height: designRem(CARD_H) }}
    >
      <Tooltip content={tooltip} position="right" delay={140} variant="sidebar">
        <button
          type="button"
          className={`tts-node-card tts-node-card--${techNode.status}${selected ? ' tts-node-card--selected' : ''}`}
          onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); onSelect(techNode.id); }}
          onMouseEnter={() => onHover(techNode.id)}
          onMouseLeave={() => onHover(null)}
          aria-label={t(techNode.titleKey)}
        >
          <img src={cardArt(techNode.art)} alt="" className="tts-node-bg-img" draggable={false} />
          <span className="tts-node-bg-scrim" />
          <span className="tts-node-icon-frame">
            <img src={techNode.icon} alt="" className="tts-node-icon" draggable={false} />
          </span>
          <span className="tts-node-copy">
            <span className="tts-node-title">{t(techNode.titleKey)}</span>
          </span>
          {showsStatusIcon(techNode.status) && (
            <span className="tts-node-status-mark" aria-label={statusLabel(techNode.status)}>
              <img src={statusIcon(techNode.status)} alt="" className="tts-node-status-icon" draggable={false} />
            </span>
          )}
          {techNode.status === 'researching' && (
            <span className="tts-node-progress">
              <span className="tts-node-progress-fill" style={{ width: `${pct}%` }} />
            </span>
          )}
        </button>
      </Tooltip>
    </div>
  );
}

function SelectedInspector({ techNode }: { techNode: TechNode }) {
  const t = useWebUIText();
  const pct = Math.round(techProgress(techNode) * 100);
  const requirements = techNode.requires.map(getTech).filter((item): item is TechNode => !!item);
  const unlocks = techNode.unlocks.map(getTech).filter((item): item is TechNode => !!item);
  const canFocus = techNode.status === 'researching' || techNode.status === 'available';
  const actionKey = techNode.status === 'researching' ? 'TechnologyMock.Action.Continue' : 'TechnologyMock.Action.SetFocus';

  return (
    <aside className="tts-inspector">
      <div className="tts-inspector-art">
        <img src={techNode.art} alt="" draggable={false} />
        <span className="tts-inspector-art-scrim" />
        <span className="tts-inspector-art-label">
          <img src={techNode.icon} alt="" className="tts-inspector-art-icon" draggable={false} />
          <span>{t('TechnologyMock.Tab.Military')}</span>
        </span>
      </div>

      <div className="tts-inspector-head">
        <span className="tts-inspector-title">{t(techNode.titleKey)}</span>
        <span className={`tts-inspector-status tts-inspector-status--${techNode.status}`}>{statusLabel(techNode.status)}</span>
      </div>

      <p className="tts-inspector-body">
        {t('TechnologyMock.Node.DrilledFormationsDetail')}
      </p>

      <div className="tts-inspector-stats">
        <div className="tts-stat-box">
          <span className="tts-stat-label">{t('TechnologyMock.Detail.Cost')}</span>
          <span className="tts-stat-value tts-stat-value--gold">{t('TechnologyMock.Detail.CostValue', { Amount: formatNumber(techNode.cost) })}</span>
        </div>
        <div className="tts-stat-box">
          <span className="tts-stat-label">{t('TechnologyMock.Detail.Time')}</span>
          <span className="tts-stat-value">
            {techNode.days > 0 ? t('TechnologyMock.Detail.Days', { Days: formatNumber(techNode.days) }) : t('TechnologyMock.Detail.Complete')}
          </span>
        </div>
      </div>

      <div className="tts-inspector-progress">
        <div className="tts-inspector-progress-row">
          <span className="tts-inspector-progress-label">{t('TechnologyMock.Detail.Progress')}</span>
          <span className="tts-inspector-progress-pct">{formatNumber(pct)}%</span>
        </div>
        <div className="tts-progress-track tts-progress-track--wide">
          <span className={`tts-progress-fill tts-progress-fill--${techNode.status}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="tts-inspector-reqs">
        <div className="tts-req-col">
          <span className="tts-req-head">{t('TechnologyMock.Detail.Requires')}</span>
          {requirements.length === 0
            ? <span className="tts-req-none">{t('TechnologyMock.Detail.None')}</span>
            : requirements.map(req => (
              <div key={req.id} className={`tts-req-item tts-req-item--${req.status}`}>
                <img src={req.icon} alt="" className="tts-req-icon" draggable={false} />
                <span className="tts-req-name">{t(req.titleKey)}</span>
                {showsStatusIcon(req.status) && (
                  <span className="tts-req-check" aria-label={statusLabel(req.status)}>
                    <img src={statusIcon(req.status)} alt="" className="tts-req-check-icon" draggable={false} />
                  </span>
                )}
              </div>
            ))
          }
        </div>
        <div className="tts-req-col">
          <span className="tts-req-head">{t('TechnologyMock.Detail.Unlocks')}</span>
          {unlocks.length === 0
            ? <span className="tts-req-none">{t('TechnologyMock.Detail.None')}</span>
            : unlocks.slice(0, 5).map(item => (
              <div key={item.id} className={`tts-req-item tts-req-item--${item.status}`}>
                <img src={item.icon} alt="" className="tts-req-icon" draggable={false} />
                <span className="tts-req-name">{t(item.titleKey)}</span>
              </div>
            ))
          }
        </div>
      </div>

      <div className="tts-inspector-effect">
        <span className="tts-inspector-effect-label">{t('TechnologyMock.Detail.Effect')}</span>
        <span className="tts-inspector-effect-body">{t('TechnologyMock.Node.DrilledFormationsEffect')}</span>
      </div>

      <div className="tts-inspector-actions">
        <GameButton variant={canFocus ? 'burgundy' : 'outline'} disabled={!canFocus} className="tts-inspector-action">
          {t(actionKey)}
        </GameButton>
        <GameButton variant="ghost" disabled={techNode.status === 'locked'} className="tts-inspector-action">
          {t('TechnologyMock.Action.Queue')}
        </GameButton>
      </div>
    </aside>
  );
}

export default function TechnologyTreeMockScreen({ onClose }: { onClose: () => void }) {
  const t = useWebUIText();
  const [selectedId, setSelectedId] = useState('drilled-formations');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const layout = useMemo(() => buildLayout(), []);
  const initialView = useMemo(() => buildInitialView(), []);
  const activeRequirementLinkIds = useMemo(
    () => hoveredId ? requirementPathLinkIds(hoveredId, layout.links) : new Set<string>(),
    [hoveredId, layout.links],
  );
  const renderedLinks = useMemo(() => {
    if (activeRequirementLinkIds.size === 0) return layout.links;
    return [
      ...layout.links.filter(link => !activeRequirementLinkIds.has(linkKey(link))),
      ...layout.links.filter(link => activeRequirementLinkIds.has(linkKey(link))),
    ];
  }, [activeRequirementLinkIds, layout.links]);

  const selectedTech = useMemo(
    () => TECHNOLOGIES.find(item => item.id === selectedId) ?? TECHNOLOGIES[0],
    [selectedId],
  );

  return (
    <ScreenShell
      title={t('TechnologyMock.ScreenTitle')}
      onClose={onClose}
      className="screen--technology-mock"
      contentClassName="tts-content"
      tabs={<TechTabs />}
    >
      <div className="tts-board-row">
        <div className="tts-board-shell">
          <ZoomPanCanvas
            className="tts-chart-viewport"
            contentClassName="tts-chart-inner"
            contentStyle={{ width: designRem(layout.width), height: designRem(layout.height) }}
            initialView={initialView}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            zoomStep={ZOOM_STEP}
            panMode="bounded"
            panMarginPx={CANVAS_PAD_X * designUnitScale()}
            deferWheelViewState
            controls={({ zoom, zoomIn, zoomOut, resetView }) => (
              <div className="tts-zoom-float">
                <Tooltip content={t('TechnologyMock.Zoom.Out')} position="top" delay={120}>
                  <button type="button" className="tts-zoom-btn" onMouseDown={(event) => { event.stopPropagation(); zoomOut(); }} aria-label={t('TechnologyMock.Zoom.Out')}>
                    <img src="/assets/icons/I_Minus.png" alt="" className="tts-zoom-icon" draggable={false} />
                  </button>
                </Tooltip>
                <button type="button" className="tts-zoom-val" onMouseDown={(event) => { event.stopPropagation(); resetView(); }} aria-label={t('TechnologyMock.Zoom.Reset')}>
                  {formatNumber(Math.round(zoom * 100))}%
                </button>
                <Tooltip content={t('TechnologyMock.Zoom.In')} position="top" delay={120}>
                  <button type="button" className="tts-zoom-btn" onMouseDown={(event) => { event.stopPropagation(); zoomIn(); }} aria-label={t('TechnologyMock.Zoom.In')}>
                    <img src="/assets/icons/I_Plus.png" alt="" className="tts-zoom-icon" draggable={false} />
                  </button>
                </Tooltip>
              </div>
            )}
          >
            <BoardBackplate />
            <svg className="tts-lines" viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true">
              {renderedLinks.map(link => {
                const highlighted = activeRequirementLinkIds.has(linkKey(link));
                const muted = hoveredId !== null && !highlighted;
                const stroke = highlighted ? 'rgba(241, 213, 120, 0.96)' : linkStroke(link);
                return (
                  <g
                    key={`${link.from.tech.id}-${link.to.tech.id}`}
                    className={`tts-link${highlighted ? ' tts-link--active' : ''}`}
                    opacity={muted ? 0.2 : 1}
                  >
                    <path
                      d={connectionPath(link)}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={highlighted ? '3' : '2'}
                      strokeLinecap="square"
                      strokeLinejoin="miter"
                    />
                    <polygon points={arrowHead(link)} fill={stroke} />
                  </g>
                );
              })}
            </svg>
            {layout.nodes.map(node => (
              <TechNodeCard
                key={node.tech.id}
                node={node}
                selected={node.tech.id === selectedTech.id}
                onSelect={setSelectedId}
                onHover={setHoveredId}
              />
            ))}
          </ZoomPanCanvas>
        </div>
        <SelectedInspector techNode={selectedTech} />
      </div>
    </ScreenShell>
  );
}

if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('techMock')) {
  registerTopbarButton({
    id: 'technology-tree-mock',
    get label() { return webUIText('TechnologyMock.TopbarLabel'); },
    labelKey: 'TechnologyMock.TopbarLabel',
    icon: '/assets/icons/I_Encyclopedia.png',
    tooltip: {
      get title() { return webUIText('TechnologyMock.TopbarTitle'); },
      titleKey: 'TechnologyMock.TopbarTitle',
      get body() { return webUIText('TechnologyMock.TopbarBody'); },
      bodyKey: 'TechnologyMock.TopbarBody',
    },
    order: 92,
  });

  registerScreen({
    id: 'technology-tree-mock',
    render: ({ onClose }) => <TechnologyTreeMockScreen onClose={onClose} />,
    topbarId: 'technology-tree-mock',
    openedByTopbar: true,
  });
}
