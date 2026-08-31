import { useEffect, useState } from 'react';
import { bridgeCall, onBridgeEvent } from '../../bridge-types.generated.ts';
import type {
  ApplyFormationTemplateResponse,
  BridgeActions,
  BuildingPlacementResponse,
  GovernorAssignmentCandidate,
  GovernorAssignmentResponse,
  ResettlementSelectionResponse,
} from '../../bridge-types.generated.ts';
import type { PortraitLayerData } from '../../data/types';
import { buildingPortrait } from '../settlements-economy/useSettlementBuildingsBridge';
import { mapPortraitLayers, mapPortraitPath } from '../characters/portraitMapping';
import { bridgeEvents } from '../core/bridgeEvents';
import { useBridgeQuery } from '../core/useBridgeQuery';

type BridgeActionName = keyof BridgeActions;

function dispatchBridgeResponse(action: BridgeActionName, detail: unknown): void {
  bridgeEvents.dispatchEvent(new CustomEvent(action, { detail }));
}

export interface GovernorAssignmentCandidateView {
  id: string;
  name: string;
  portrait: string;
  portraitLayers?: PortraitLayerData;
  age: number;
  governance: number;
  loyalty: number;
  currentRegionCount: number;
  maxRegionCount: number;
  atCapacity: boolean;
  isSelected: boolean;
}

export interface GovernorAssignmentOperation {
  active: boolean;
  selectedPersonId: string;
  message: string;
  candidates: GovernorAssignmentCandidateView[];
}

export interface BuildingPlacementOperation {
  active: boolean;
  buildingId: string;
  buildingName: string;
  assetKey: string;
  icon: string;
  queuedCount: number;
  totalCost: number;
  availableGold: number;
  canConfirm: boolean;
  canUndo: boolean;
  message: string;
}

export interface FormationSelectionOperation {
  active: boolean;
  templateId: string;
  templateName: string;
  templateType: 'land' | 'naval';
  creationCost: number;
  selectedSettlementId: string;
  selectedSettlementName: string;
  canConfirm: boolean;
  message: string;
}

export interface ResettlementSelectionOperation {
  active: boolean;
  sourceSettlementId: string;
  sourceSettlementName: string;
  destinationSettlementId: string;
  destinationSettlementName: string;
  migrantCount: number;
  goldCost: number;
  canConfirm: boolean;
  interactionName: string;
  description: string;
  message: string;
}

function mapGovernorCandidate(candidate: GovernorAssignmentCandidate): GovernorAssignmentCandidateView {
  return {
    id: candidate.id,
    name: candidate.name,
    portrait: mapPortraitPath(candidate.portrait),
    portraitLayers: mapPortraitLayers(candidate.portraitLayers),
    age: candidate.age,
    governance: candidate.governance,
    loyalty: candidate.loyalty,
    currentRegionCount: candidate.currentRegionCount,
    maxRegionCount: candidate.maxRegionCount,
    atCapacity: candidate.atCapacity,
    isSelected: candidate.isSelected,
  };
}

function mapGovernorAssignment(data: GovernorAssignmentResponse): GovernorAssignmentOperation {
  return {
    active: data.active,
    selectedPersonId: data.selectedPersonId,
    message: data.message,
    candidates: data.candidates.map(mapGovernorCandidate),
  };
}

function mapBuildingPlacement(data: BuildingPlacementResponse): BuildingPlacementOperation {
  return {
    active: data.active,
    buildingId: data.buildingId,
    buildingName: data.buildingName,
    assetKey: data.assetKey,
    icon: buildingPortrait(data.assetKey) ?? '/assets/icons/I_BuildingsQuickButton.png',
    queuedCount: data.queuedCount,
    totalCost: data.totalCost,
    availableGold: data.availableGold,
    canConfirm: data.canConfirm,
    canUndo: data.canUndo,
    message: data.message,
  };
}

function mapFormationSelection(data: ApplyFormationTemplateResponse): FormationSelectionOperation | null {
  if (!data.selectionActive) return null;
  return {
    active: data.selectionActive,
    templateId: data.templateId,
    templateName: data.templateName,
    templateType: data.templateType === 'naval' ? 'naval' : 'land',
    creationCost: data.creationCost,
    selectedSettlementId: data.selectedSettlementId,
    selectedSettlementName: data.selectedSettlementName,
    canConfirm: data.canConfirm,
    message: data.message,
  };
}

function mapResettlementSelection(data: ResettlementSelectionResponse): ResettlementSelectionOperation | null {
  if (!data.active) return null;
  return {
    active: data.active,
    sourceSettlementId: data.sourceSettlementId,
    sourceSettlementName: data.sourceSettlementName,
    destinationSettlementId: data.destinationSettlementId,
    destinationSettlementName: data.destinationSettlementName,
    migrantCount: data.migrantCount,
    goldCost: data.goldCost,
    canConfirm: data.canConfirm,
    interactionName: data.interactionName,
    description: data.description,
    message: data.message,
  };
}

async function callGovernorAssignment(command: string, personId = ''): Promise<GovernorAssignmentResponse> {
  const response = await bridgeCall('game.governor_assignment', { command, personId });
  dispatchBridgeResponse('game.governor_assignment', response);
  return response;
}

async function callBuildingPlacement(command: string, buildingId = ''): Promise<BuildingPlacementResponse> {
  const response = await bridgeCall('game.building_placement', { command, buildingId });
  dispatchBridgeResponse('game.building_placement', response);
  return response;
}

export function useGovernorAssignmentOperation(): GovernorAssignmentOperation | null {
  const state = useBridgeQuery({
    action: 'game.governor_assignment',
    payload: { command: 'state', personId: '' },
    map: mapGovernorAssignment,
  });

  return state?.active ? state : null;
}

export function useBuildingPlacementOperation(): BuildingPlacementOperation | null {
  const state = useBridgeQuery({
    action: 'game.building_placement',
    payload: { command: 'state', buildingId: '' },
    map: mapBuildingPlacement,
  });

  return state?.active ? state : null;
}

export function useFormationSelectionOperation(): FormationSelectionOperation | null {
  const [state, setState] = useState<FormationSelectionOperation | null>(null);

  useEffect(() => onBridgeEvent('game.apply_formation_template', data => {
    setState(mapFormationSelection(data));
  }), []);

  return state;
}

export function useResettlementSelectionOperation(): ResettlementSelectionOperation | null {
  const state = useBridgeQuery({
    action: 'game.resettlement_selection',
    payload: { command: 'state' },
    map: mapResettlementSelection,
  });

  return state;
}

async function callResettlementSelection(command: string): Promise<ResettlementSelectionResponse> {
  const response = await bridgeCall('game.resettlement_selection', { command });
  dispatchBridgeResponse('game.resettlement_selection', response);
  return response;
}

export function confirmResettlementSelectionBridge(): Promise<ResettlementSelectionResponse> {
  return callResettlementSelection('confirm');
}

export function cancelResettlementSelectionBridge(): Promise<ResettlementSelectionResponse> {
  return callResettlementSelection('cancel');
}

export function startGovernorAssignmentBridge(): Promise<GovernorAssignmentResponse> {
  return callGovernorAssignment('start');
}

export function selectGovernorCandidateBridge(personId: string): Promise<GovernorAssignmentResponse> {
  return callGovernorAssignment('select', personId);
}

export function finishGovernorAssignmentBridge(): Promise<GovernorAssignmentResponse> {
  return callGovernorAssignment('done');
}

export function autoAssignGovernorsBridge(): Promise<GovernorAssignmentResponse> {
  return callGovernorAssignment('autoassign');
}

export function startBuildingPlacementBridge(buildingId: string): Promise<BuildingPlacementResponse> {
  return callBuildingPlacement('start', buildingId);
}

export function confirmBuildingPlacementBridge(): Promise<BuildingPlacementResponse> {
  return callBuildingPlacement('confirm');
}

export function cancelBuildingPlacementBridge(): Promise<BuildingPlacementResponse> {
  return callBuildingPlacement('cancel');
}

export function undoBuildingPlacementBridge(): Promise<BuildingPlacementResponse> {
  return callBuildingPlacement('undo');
}

export async function cancelFormationSelectionBridge(): Promise<ApplyFormationTemplateResponse> {
  const response = await bridgeCall('game.apply_formation_template', {
    templateId: '',
    settlementId: '',
    cancelSelection: true,
    confirmSelection: false,
  });
  dispatchBridgeResponse('game.apply_formation_template', response);
  return response;
}

export async function confirmFormationSelectionBridge(templateId: string): Promise<ApplyFormationTemplateResponse> {
  const response = await bridgeCall('game.apply_formation_template', {
    templateId,
    settlementId: '',
    cancelSelection: false,
    confirmSelection: true,
  });
  dispatchBridgeResponse('game.apply_formation_template', response);
  return response;
}
