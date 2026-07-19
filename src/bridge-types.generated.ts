// Auto-generated from AngelScript bridge actions.
// Do not edit - run: python Automation/generate_bridge_types.py
import { callRuntimeBridge } from './bridge/core/runtimeEngine';

export interface AchievementUnlockedPayload {
  id: string;
  displayName: string;
  description: string;
  iconUrl: string;
}

export interface AchievementEventStatusResponse {
  steamAvailable: boolean;
}

export interface AllyCallLikelihoodReason {
  finalPercent: number;
  basePercent: number;
  allyOpinion: number;
  enemyOpinion: number;
  opinionImpactPercent: number;
  enemyOpinionImpactPercent: number;
  strengthImpactPercent: number;
  warImpactPercent: number;
  strengthBalancePercent: number;
  activeWarCount: number;
  acceptanceCapPercent: number;
  limitReason: string;
}

export interface AllyCallDialogAlly {
  id: string;
  name: string;
  colour: string;
  secondaryColour: string;
  cultureGroup: string;
  emblem: string;
  strength: number;
  strengthRatio: number;
  callLikelihoodPercent: number;
  callLikelihoodReason: AllyCallLikelihoodReason;
}

export interface AllyCallDialogRequest {
  requestId: string;
  selectedAllyIds: string[];
  cancelled: boolean;
}

export interface AllyCallDialogEvent {
  open: boolean;
  requestId: string;
  enemyId: string;
  enemyName: string;
  isDefensive: boolean;
  allies: AllyCallDialogAlly[];
}

export interface ApplySettingsRequest {
  video: SettingsVideoDTO;
  audio: SettingsAudioDTO;
  gameplay: SettingsGameplayDTO;
  graphics: SettingsGraphicsDTO;
}

export interface ApplySettingsResponse {
  applied: boolean;
}

export interface AppointAgentRequest {
  personId: string;
  targetFactionId: string;
  role: string;
}

export interface AppointAgentResponse {
  appointed: boolean;
  recalled: boolean;
  message: string;
}

export interface AppointBishopRequest {
  religionKey: string;
  landKey: string;
  personId: string;
}

export interface AppointBishopResponse {
  appointed: boolean;
  message: string;
}

export interface AppointRegionGovernorRequest {
  settlementId: string;
  personId: string;
}

export interface AppointRegionGovernorResponse {
  appointed: boolean;
  removed: boolean;
  personId: string;
  message: string;
}

export interface AppointToCourtPositionRequest {
  positionKey: string;
  personId: string;
}

export interface AppointToCourtPositionResponse {
  appointed: boolean;
  message: string;
}

export interface BattleFaction {
  id: string;
  name: string;
  colour: string;
  secondaryColour: string;
  cultureGroup: string;
  relation: string;
}

export interface BattlePoint {
  x: number;
  y: number;
}

export interface BattlefieldObstacleDetail {
  id: string;
  type: string;
  centreX: number;
  centreY: number;
  width: number;
  height: number;
  rotation: number;
  blocksMovement: boolean;
  movementSpeedMultiplier: number;
  cavalryMovementSpeedMultiplier: number;
  damageDealtMultiplier: number;
  damageTakenMultiplier: number;
  rangedIncomingDamageMultiplier: number;
}

export interface BattlefieldHeightPointDetail {
  height: number;
  slope: number;
}

export interface BattleParticipantDetail {
  id: string;
  name: string;
  commander: string;
  commanderId: string;
  faction: BattleFaction;
  strength: number;
  maxStrength: number;
  manpower: number;
  losses: number;
  morale: number;
  tier: number;
  isNavy: boolean;
  isPlayerControlled: boolean;
  canRetreat: boolean;
  currentOrder: string;
}

export interface BattleSideDetail {
  participants: BattleParticipantDetail[];
  totalStrength: number;
  totalMaxStrength: number;
  currentManpower: number;
  initialManpower: number;
  losses: number;
  morale: number;
}

export interface BattleActionOption {
  id: string;
  name: string;
  description: string;
  iconId: string;
  requiredTactics: number;
  requiredAuthority: number;
  damageMultiplier: number;
  damageTakenMultiplier: number;
  armourMultiplier: number;
  moraleModifier: number;
  speedMultiplier: number;
  canActivate: boolean;
  isActive: boolean;
  disabledReason: string;
}

export interface BattleFormationAgentState {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  inMelee: boolean;
  detached: boolean;
  targetFormationId: string;
}

export interface BattleFormationUnitDetail {
  id: string;
  name: string;
  description: string;
  portrait: string;
  strength: number;
  maxStrength: number;
}

export interface BattleFormationDetail {
  id: string;
  name: string;
  side: string;
  militaryId: string;
  militaryName: string;
  faction: BattleFaction;
  unitType: string;
  unitTypeLabel: string;
  strength: number;
  maxStrength: number;
  losses: number;
  healthPercent: number;
  morale: number;
  recentCasualtyPressure: number;
  stance: string;
  stanceLabel: string;
  positionX: number;
  positionY: number;
  rotation: number;
  zIndex: number;
  speed: number;
  attackRange: number;
  minimumAttackRange: number;
  collisionRadius: number;
  attackChargePercent: number;
  attackSequence: number;
  hasManualTarget: boolean;
  isRouting: boolean;
  isWithdrawing: boolean;
  agentCount: number;
  shipCount: number;
  targetFormationId: string;
  targetFormationName: string;
  activeActionId: string;
  activeActionName: string;
  isPlayerControlled: boolean;
  isCommandable: boolean;
  units: BattleFormationUnitDetail[];
  waypoints: BattlePoint[];
  actions: BattleActionOption[];
}

export interface BattleFormationFrame {
  id: string;
  strength: number;
  maxStrength: number;
  losses: number;
  healthPercent: number;
  morale: number;
  recentCasualtyPressure: number;
  positionX: number;
  positionY: number;
  rotation: number;
  zIndex: number;
  attackChargePercent: number;
  attackSequence: number;
  shipCount: number;
  hasManualTarget: boolean;
  isRouting: boolean;
  isWithdrawing: boolean;
  unitStrengths: number[];
  agents: BattleFormationAgentState[];
  targetFormationId: string;
  targetFormationName: string;
  waypoints: BattlePoint[];
}

export interface GetBattleDataRequest {
  battleId: string;
}

export interface GetBattleDataResponse {
  found: boolean;
  id: string;
  title: string;
  battleType: string;
  location: string;
  terrain: string;
  hasSnowAttrition: boolean;
  hasDesertAttrition: boolean;
  battlefieldWidth: number;
  battlefieldHeight: number;
  attacker: BattleSideDetail;
  defender: BattleSideDetail;
  formations: BattleFormationDetail[];
  obstacles: BattlefieldObstacleDetail[];
  heightMapColumns: number;
  heightMapRows: number;
  heightMap: BattlefieldHeightPointDetail[];
  playerIsAttacker: boolean;
  playerIsDefender: boolean;
  canIssueCommands: boolean;
}

export interface GetBattleFrameRequest {
  battleId: string;
}

export interface GetBattleFrameResponse {
  found: boolean;
  id: string;
  formations: BattleFormationFrame[];
}

export interface StartBattleActionRequest {
  battleId: string;
  formationId: string;
  actionId: string;
}

export interface StartBattleActionResponse {
  started: boolean;
  message: string;
}

export interface SetBattleFormationStanceRequest {
  battleId: string;
  formationId: string;
  stance: string;
}

export interface SetBattleFormationStanceResponse {
  updated: boolean;
  message: string;
}

export interface SetBattleFormationOrderRequest {
  battleId: string;
  formationId: string;
  targetFormationId: string;
  waypoints: BattlePoint[];
}

export interface SetBattleFormationOrderResponse {
  updated: boolean;
  message: string;
}

export interface RequestBattleRetreatRequest {
  battleId: string;
  militaryId: string;
}

export interface RequestBattleRetreatResponse {
  requested: boolean;
  message: string;
}

export interface WithdrawBattleFormationRequest {
  battleId: string;
  formationId: string;
}

export interface WithdrawBattleFormationResponse {
  requested: boolean;
  message: string;
}

export interface BreakTreatyRequest {
  treatyId: string;
}

export interface BreakTreatyResponse {
  success: boolean;
  message: string;
  otherFactionId: string;
}

export interface BuildingPlacementRequest {
  command: string;
  buildingId: string;
}

export interface BuildingPlacementResponse {
  active: boolean;
  buildingId: string;
  buildingName: string;
  assetKey: string;
  queuedCount: number;
  totalCost: number;
  availableGold: number;
  canConfirm: boolean;
  canUndo: boolean;
  message: string;
}

export interface BureaucraticThroughputSourceDetail {
  sourceId: string;
  label: string;
  kind: string;
  value: number;
}

export interface BureaucraticThroughputSourceEntry {
  sourceId: string;
  label: string;
  kind: string;
  category: string;
  value: number;
  expiresInDays: number;
  expiresOnDate: number;
  details: BureaucraticThroughputSourceDetail[];
}

export interface GetBureaucraticThroughputResponse {
  capacity: number;
  currentLoad: number;
  overload: number;
  overloadPenaltyPercent: number;
  state: string;
  policyChanges: number;
  activeEdicts: number;
  activeInteractions: number;
  directAdministration: number;
  provincePressure: number;
  vacantOffices: number;
  rushPressure: number;
  sources: BureaucraticThroughputSourceEntry[];
}

export interface CampaignOutcomeRulerDto {
  id: string;
  name: string;
  title: string;
  reign: string;
  battlesWon: number;
  battlesLost: number;
  fate: string;
  portrait: string;
  portraitLayers: PortraitLayerData;
  isImprisoned: boolean;
}

export interface CampaignOutcomeHistoryPointDto {
  label: string;
  settlements: number;
  population: number;
}

export interface CampaignOutcomeMilestoneDto {
  label: string;
  detail: string;
  tone: string;
}

export interface CampaignOutcomeSummaryDto {
  cause: string;
  kicker: string;
  title: string;
  subtitle: string;
  description: string;
  factionName: string;
  endDate: string;
  totalTimeRuled: string;
  totalBattlesWon: number;
  totalBattlesLost: number;
  currentRuler: CampaignOutcomeRulerDto;
  previousRulers: CampaignOutcomeRulerDto[];
  history: CampaignOutcomeHistoryPointDto[];
  milestones: CampaignOutcomeMilestoneDto[];
  crestIcon: string;
  headerImage: string;
  primaryAction: string;
  secondaryAction: string;
}

export interface CancelBlocInteractionRequest {
  blocId: string;
}

export interface CancelBlocInteractionResponse {
  cancelled: boolean;
}

export interface CancelFactionInteractionRequest {
  targetFactionId: string;
}

export interface CancelFactionInteractionResponse {
  cancelled: boolean;
}

export interface CancelPersonInteractionRequest {
  personId: string;
}

export interface CancelPersonInteractionResponse {
  cancelled: boolean;
}

export interface CancelSettlementInteractionRequest {
  settlementId: string;
}

export interface CancelSettlementInteractionResponse {
  cancelled: boolean;
}

export interface CancelSpyInteractionRequest {
  targetFactionId: string;
}

export interface CancelSpyInteractionResponse {
  cancelled: boolean;
}

export interface ChooseEventOptionRequest {
  eventId: string;
  optionIndex: number;
  regnalName: string;
  personName: string;
}

export interface ChooseEventOptionResponse {
  success: boolean;
}

export interface CompleteInitialSetupResponse {
  completed: boolean;
}

export interface ContinueGameResponse {
  started: boolean;
  slotName: string;
}

export interface ConvoyGlanceFactionFilter {
  id: string;
  name: string;
  colour: string;
  secondaryColour: string;
  relation: string;
  convoyCount: number;
  active: boolean;
}

export interface GetConvoyGlanceFiltersResponse {
  showConvoys: boolean;
  factionFilterActive: boolean;
  factions: ConvoyGlanceFactionFilter[];
}

export interface CourtierPromotionEventPayload {
  settlementId: string;
  settlementName: string;
  playerGold: number;
  promotionCost: number;
}

export interface CultureInfo {
  id: string;
  name: string;
  adjective: string;
  plural: string;
  description: string;
  colour: string;
  group: string;
  groupDisplayName: string;
  canRecruitAsAuxiliaries: boolean;
}

export interface ReligionInfo {
  id: string;
  name: string;
  adjective: string;
  adherentPlural: string;
  description: string;
  colour: string;
  isOrganised: boolean;
  tacticsBonus: number;
  authorityBonus: number;
  cunningBonus: number;
  governanceBonus: number;
  taxEfficiencyModifier: number;
  developmentSpeedModifier: number;
  armyMoraleBonus: number;
  recruitmentSpeedModifier: number;
  settlementGrowthModifier: number;
  unrestModifier: number;
}

export interface DeleteSaveRequest {
  slotName: string;
  deleteFromCloud: boolean;
}

export interface DeleteSaveResponse {
  deleted: boolean;
  failureReason: string;
}

export interface DemolishSettlementBuildingRequest {
  settlementId: string;
  buildingId: string;
}

export interface DiplomacyFactionReference {
  id: string;
  name: string;
  colour: string;
  secondaryColour: string;
  cultureGroup: string;
  emblem: string;
}

export interface DiplomacyFactionEntry {
  id: string;
  name: string;
  colour: string;
  secondaryColour: string;
  cultureGroup: string;
  emblem: string;
  rulerId: string;
  rulerName: string;
  capital: string;
  diplomaticStatus: string;
  diplomaticStatusLabel: string;
  subjectType: string;
  subjectSubtype: string;
  buildFocusKey: string;
  buildFocus: string;
  taxRate: number;
  goldTribute: number;
  opinion: number;
  compliance: number;
  hasCompliance: boolean;
  population: number;
  settlements: number;
  strength: number;
  treaties: number;
  isRebel: boolean;
  isAtWar: boolean;
  canSetBuildFocus: boolean;
  buildFocusBlockedReason: string;
}

export interface DiplomacyProvinceCandidate {
  landId: string;
  landName: string;
  settlementCount: number;
  controlPercent: number;
  cost: number;
  bureaucraticLoadChange: number;
  canCreate: boolean;
  blockedReason: string;
}

export interface DiplomacyRegionalGovernor {
  regionId: string;
  regionName: string;
  settlementId: string;
  settlementName: string;
  governorId: string;
  governorName: string;
  settlementCount: number;
  corruptionPercent: number;
  taxBonusPercent: number;
  unrestReductionPercent: number;
  militaryBonusPercent: number;
  bureaucraticGovernorLoad: number;
  isLocked: boolean;
  canManageGovernor: boolean;
}

export interface DiplomacyWarScoreEntry {
  label: string;
  score: number;
  eventCount: number;
  isOurs: boolean;
  depth: number;
}

export interface DiplomacyWarEntry {
  id: string;
  name: string;
  ourLeader: DiplomacyFactionReference;
  theirLeader: DiplomacyFactionReference;
  ourParticipants: DiplomacyFactionReference[];
  theirParticipants: DiplomacyFactionReference[];
  warScore: number;
  warScoreBreakdown: DiplomacyWarScoreEntry[];
  durationDays: number;
  battlesFought: number;
  settlementsCaptured: number;
  isRebellionWar: boolean;
  canNegotiate: boolean;
}

export interface DiplomacyTreatyEntry {
  id: string;
  type: string;
  displayName: string;
  description: string;
  withFactionId: string;
  withFaction: string;
  withFactionColour: string;
  withFactionSecondaryColour: string;
  withFactionCultureGroup: string;
  withFactionEmblem: string;
  daysRemaining: number;
  isPerpetual: boolean;
  canBreak: boolean;
  breakingPenalty: number;
  isWithPlayer: boolean;
}

export interface GetDiplomacyOverviewResponse {
  playerFactionId: string;
  playerFactionName: string;
  autoAssignGovernorsEnabled: boolean;
  canCreateProvinces: boolean;
  provinceEmptyReason: string;
  governorEmptyReason: string;
  internalFactions: DiplomacyFactionEntry[];
  foreignPowers: DiplomacyFactionEntry[];
  provinceCandidates: DiplomacyProvinceCandidate[];
  regionalGovernors: DiplomacyRegionalGovernor[];
  activeWars: DiplomacyWarEntry[];
  ourTreaties: DiplomacyTreatyEntry[];
}

export interface DiplomaticNegotiationProposalDraft {
  proposalId: string;
  type: string;
  side: string;
  tributeAmount: number;
  durationDays: number;
  resourceName: string;
  resourceAmount: number;
  vassalageSubtype: string;
}

export interface DiplomaticNegotiationProposalEntry {
  proposalId: string;
  type: string;
  side: string;
  label: string;
  description: string;
  tributeAmount: number;
  durationDays: number;
  resourceName: string;
  resourceLabel: string;
  resourceAmount: number;
  vassalageSubtype: string;
  value: number;
}

export interface DiplomaticNegotiationOption {
  optionId: string;
  type: string;
  side: string;
  label: string;
  description: string;
  defaultTributeAmount: number;
  defaultDurationDays: number;
  defaultResourceName: string;
  defaultResourceLabel: string;
  defaultResourceAmount: number;
  defaultVassalageSubtype: string;
  isSelected: boolean;
}

export interface DiplomaticNegotiationResourceOption {
  name: string;
  label: string;
  amount: number;
}

export interface DiplomaticNegotiationOpinionModifier {
  label: string;
  value: number;
}

export interface DiplomaticNegotiationPreview {
  acceptanceScore: number;
  verdict: string;
  verdictLabel: string;
  canSubmit: boolean;
  blockedReason: string;
  breakdown: string;
}

export interface GetDiplomaticNegotiationStateRequest {
  targetFactionId: string;
  proposals: DiplomaticNegotiationProposalDraft[];
}

export interface GetDiplomaticNegotiationStateResponse {
  found: boolean;
  targetFactionId: string;
  playerFaction: DiplomacyFactionReference;
  targetFaction: DiplomacyFactionReference;
  diplomaticStatus: string;
  opinion: number;
  opinionBreakdown: DiplomaticNegotiationOpinionModifier[];
  proposals: DiplomaticNegotiationProposalEntry[];
  availableOffers: DiplomaticNegotiationOption[];
  availableRequests: DiplomaticNegotiationOption[];
  ourResources: DiplomaticNegotiationResourceOption[];
  theirResources: DiplomaticNegotiationResourceOption[];
  preview: DiplomaticNegotiationPreview;
  emptyReason: string;
}

export interface GetDiplomaticNegotiationPreviewRequest {
  targetFactionId: string;
  proposals: DiplomaticNegotiationProposalDraft[];
}

export interface GetDiplomaticNegotiationPreviewResponse {
  found: boolean;
  targetFactionId: string;
  proposals: DiplomaticNegotiationProposalEntry[];
  preview: DiplomaticNegotiationPreview;
  emptyReason: string;
}

export interface SubmitDiplomaticNegotiationRequest {
  targetFactionId: string;
  proposals: DiplomaticNegotiationProposalDraft[];
}

export interface SubmitDiplomaticNegotiationResponse {
  submitted: boolean;
  result: string;
  message: string;
  state: GetDiplomaticNegotiationStateResponse;
}

export interface DiplomaticNotificationEventsRequest {
  command: string;
  id: string;
  accepted: boolean;
}

export interface DiplomaticNotificationEventPayload {
  id: string;
  notificationType: string;
  title: string;
  description: string;
  iconPath: string;
  timestamp: string;
  createdOnDay: number;
  expiresOnDay: number;
  durationDays: number;
  requiresDecision: boolean;
  acceptLabel: string;
  declineLabel: string;
  initiatingFaction: DiplomacyFactionReference;
  targetFaction: DiplomacyFactionReference;
  thirdPartyFaction: DiplomacyFactionReference;
}

export interface DiplomaticNotificationDismissedPayload {
  id: string;
}

export interface DowngradeSettlementBuildingRequest {
  settlementId: string;
  buildingId: string;
}

export interface SetEconomyAutoBuyRequest {
  enabled: boolean;
}

export interface TradeEconomyResourceRequest {
  resourceId: string;
  amount: number;
}

export interface SetResourceAutoSellRequest {
  resourceId: string;
  enabled: boolean;
  threshold: number;
}

export interface SetResourcePriorityRequest {
  targetType: string;
  targetId: string;
  priority: string;
}

export interface EnterCourtAppointmentContestRequest {
  positionKey: string;
}

export interface EnterCourtAppointmentContestResponse {
  entered: boolean;
  message: string;
}

export interface BridgeFactionInteractionProvidedInput {
  inputId: string;
  goldAmount: number;
  factionId: string;
}

export interface BridgeFactionInteractionGoldOption {
  amount: number;
  label: string;
  description: string;
  opinionBonus: number;
  relationshipBonus: number;
}

export interface BridgeFactionInteractionInputRequirement {
  inputId: string;
  inputType: string;
  prompt: string;
  minGold: number;
  maxGold: number;
  selectedGoldAmount: number;
  selectedFactionId: string;
  goldOptions: BridgeFactionInteractionGoldOption[];
}

export interface BridgeFactionInteractionFactionCandidate {
  id: string;
  name: string;
  rulerName: string;
  colour: string;
  secondaryColour: string;
  cultureGroup: string;
  emblem: string;
  status: string;
  opinion: number;
}

export interface FormationTemplateEligibleSettlementEntry {
  id: string;
  name: string;
  available: boolean;
}

export interface FormationTemplateResourceCost {
  name: string;
  displayName: string;
  description: string;
  effects: string;
  amount: number;
}

export interface FormationTemplateUnitEntry {
  id: string;
  name: string;
  description: string;
  portrait: string;
  includesCore: boolean;
  type: string;
  unitTypeLabel: string;
  category: string;
  battleRole: string;
  cultureId: string;
  cultureName: string;
  cultureColour: string;
  tier: number;
  count: number;
  maxStrength: number;
  price: number;
  buildTimeDays: number;
  upkeep: number;
  foodConsumption: number;
  resourceCost: FormationTemplateResourceCost[];
  monthlyConsumption: FormationTemplateResourceCost[];
  speed: number;
  range: number;
  siegePower: number;
  pierceDamage: number;
  crushDamage: number;
  slashDamage: number;
  pierceArmour: number;
  crushArmour: number;
  slashArmour: number;
  immuneToWinterAttrition: boolean;
  immuneToDesertAttrition: boolean;
  availableSettlementCount: number;
  availableSettlements: FormationTemplateEligibleSettlementEntry[];
  upgradeUnitId: string;
  downgradeUnitId: string;
}

export interface FormationTemplateAssignedForce {
  id: string;
  name: string;
  rank: string;
  commanderName: string;
  strength: number;
  maxStrength: number;
  isNavy: boolean;
  location: string;
}

export interface PendingFormationUnitEntry {
  unitId: string;
  settlementId: string;
  settlementName: string;
  locationLabel: string;
  progressAtSnapshot: number;
  dailyProgress: number;
  snapshotDate: number;
  expiresOnDate: number;
}

export interface PendingFormationEntry {
  id: string;
  templateId: string;
  templateName: string;
  type: string;
  targetSettlementId: string;
  targetSettlementName: string;
  heading: string;
  statusLabel: string;
  blockReason: string;
  readyUnits: number;
  totalUnits: number;
  units: PendingFormationUnitEntry[];
}

export interface FormationTemplateBattleGroupUnitEntry {
  unitId: string;
  count: number;
}

export interface FormationTemplateBattleGroupEntry {
  id: string;
  role: string;
  unitCount: number;
  units: FormationTemplateBattleGroupUnitEntry[];
}

export interface FormationTemplateEntry {
  id: string;
  name: string;
  iconId: string;
  type: string;
  description: string;
  totalStrength: number;
  creationCost: number;
  initialUnitCost: number;
  creationTimeDays: number;
  monthlyUpkeep: number;
  averageTier: number;
  battleGroups: FormationTemplateBattleGroupEntry[];
  canApply: boolean;
  canEdit: boolean;
  canDelete: boolean;
  applyReason: string;
  isActiveBuildTemplate: boolean;
  units: FormationTemplateUnitEntry[];
  assignedForces: FormationTemplateAssignedForce[];
}

export interface GetFormationTemplatesResponse {
  templates: FormationTemplateEntry[];
  pendingFormations: PendingFormationEntry[];
  activeBuildTemplateId: string;
  playerGold: number;
}

export interface GetFormationTemplateCatalogueResponse {
  landUnitCatalogue: FormationTemplateUnitEntry[];
  navalUnitCatalogue: FormationTemplateUnitEntry[];
}

export interface SaveFormationTemplateUnitRequest {
  unitId: string;
  count: number;
}

export interface GenerateFormationTemplateNameRequest {
  type: string;
  units: SaveFormationTemplateUnitRequest[];
}

export interface GenerateFormationTemplateNameResponse {
  name: string;
}

export interface SaveFormationTemplateBattleGroupUnitRequest {
  unitId: string;
  count: number;
}

export interface SaveFormationTemplateBattleGroupRequest {
  role: string;
  units: SaveFormationTemplateBattleGroupUnitRequest[];
}

export interface SaveFormationTemplateRequest {
  templateId: string;
  name: string;
  iconId: string;
  type: string;
  battleGroups: SaveFormationTemplateBattleGroupRequest[];
  units: SaveFormationTemplateUnitRequest[];
}

export interface SaveFormationTemplateResponse {
  saved: boolean;
  templateId: string;
  templateName: string;
  message: string;
}

export interface DeleteFormationTemplateRequest {
  templateId: string;
}

export interface DeleteFormationTemplateResponse {
  deleted: boolean;
  message: string;
}

export interface ApplyFormationTemplateRequest {
  templateId: string;
  settlementId: string;
  cancelSelection: boolean;
  confirmSelection: boolean;
}

export interface ApplyFormationTemplateResponse {
  applied: boolean;
  selectionStarted: boolean;
  selectionActive: boolean;
  templateId: string;
  templateName: string;
  templateType: string;
  creationCost: number;
  selectedSettlementId: string;
  selectedSettlementName: string;
  canConfirm: boolean;
  message: string;
}

export interface FormPersonalPowerBlocResponse {
  success: boolean;
  message: string;
  blocId: string;
}

export interface AchievementEntry {
  id: string;
  displayName: string;
  description: string;
  effectiveDescription: string;
  category: string;
  rarity: string;
  hidden: boolean;
  unlocked: boolean;
  currentProgress: number;
  targetProgress: number;
  progressPercent: number;
  progressText: string;
  canBeEarned: boolean;
  iconUrl: string;
}

export interface GetAchievementsResponse {
  totalAchievements: number;
  unlockedAchievements: number;
  completionPercent: number;
  steamAvailable: boolean;
  achievementsEnabled: boolean;
  disabledReason: string;
  disabledReasons: string[];
  achievements: AchievementEntry[];
}

export interface GetAgentCandidatesRequest {
  role: string;
  targetFactionId: string;
}

export interface AgentCandidateTrait {
  id: string;
  name: string;
  description: string;
  isPositive: boolean;
}

export interface AgentCandidateStatContribution {
  key: string;
  stat: number;
  weight: number;
  value: number;
}

export interface AgentCandidateTraitContribution {
  traitId: string;
  label: string;
  value: number;
}

export interface AgentCandidateSuitability {
  targetFactionId: string;
  base: number;
  statContribs: AgentCandidateStatContribution[];
  statTotal: number;
  opinion: number;
  traitSum: number;
  traits: AgentCandidateTraitContribution[];
  total: number;
  primaryStat: number;
  xp: number;
  tier: WebUIRoleTierData;
}

export interface AgentCandidate {
  id: string;
  name: string;
  title: string;
  portrait: string;
  portraitLayers: PortraitLayerData;
  age: number;
  activity: string;
  authority: number;
  cunning: number;
  governance: number;
  loyalty: number;
  fame: number;
  diplomaticXp: number;
  intrigueXp: number;
  traits: AgentCandidateTrait[];
  suitability: AgentCandidateSuitability[];
}

export interface AgentForeignFaction {
  id: string;
  name: string;
  colour: string;
  secondaryColour: string;
  emblem: string;
  cultureGroup: string;
  opinion: number;
  diplomaticStatus: string;
}

export interface GetAgentCandidatesResponse {
  role: string;
  targetFactionId: string;
  candidates: AgentCandidate[];
  foreignFactions: AgentForeignFaction[];
}

export interface GetAppModeResponse {
  mode: string;
}

export interface GetBishopCandidatesRequest {
  religionKey: string;
}

export interface BishopCandidateTrait {
  id: string;
  name: string;
  description: string;
  isPositive: boolean;
}

export interface BishopCandidate {
  id: string;
  name: string;
  title: string;
  portrait: string;
  portraitLayers: PortraitLayerData;
  age: number;
  activity: string;
  tactics: number;
  authority: number;
  cunning: number;
  governance: number;
  loyalty: number;
  constitution: number;
  fame: number;
  currentBishopricLandName: string;
  traits: BishopCandidateTrait[];
}

export interface GetBishopCandidatesResponse {
  candidates: BishopCandidate[];
}

export interface GetBlocInteractionsRequest {
  blocId: string;
}

export interface BlocInteractionReason {
  reason: string;
  status: string;
}

export interface BlocInteractionFactor {
  name: string;
  percent: number;
}

export interface BlocInteractionEntry {
  id: string;
  name: string;
  description: string;
  iconId: string;
  backgroundId: string;
  goldCost: number;
  durationDays: number;
  cooldownDays: number;
  cooldownRemainingDays: number;
  availability: string;
  inProgress: boolean;
  remainingDays: number;
  bureaucraticLoad: number;
  bureaucraticRushDaysSaved: number;
  bureaucraticRushLoad: number;
  successChancePercent: number;
  reasons: BlocInteractionReason[];
  successFactors: BlocInteractionFactor[];
  effectLines: WebUIDisplayLine[];
}

export interface GetBlocInteractionsResponse {
  blocId: string;
  interactions: BlocInteractionEntry[];
  lastCompletedInteractionId: string;
  lastInteractionSucceeded: boolean;
  lastInteractionCompletedDate: number;
  lastInteractionOutcomeText: string;
}

export interface GetBuildQueueRequest {
  subscribe: boolean;
}

export interface BuildQueueCost {
  name: string;
  label: string;
  amount: number;
}

export interface BuildQueueItemGroup {
  id: string;
  settlementId: string;
  settlementName: string;
  factionId: string;
  factionName: string;
  isVassal: boolean;
  itemId: string;
  assetKey: string;
  itemName: string;
  itemKind: string;
  itemKindLabel: string;
  count: number;
  firstQueueIndex: number;
  cancelQueueIndex: number;
  queueIndices: number[];
  hasActiveItem: boolean;
  state: string;
  statusLabel: string;
  statusReason: string;
  goldCost: number;
  populationCost: number;
  resourceCost: BuildQueueCost[];
  missingResources: BuildQueueCost[];
  durationDays: number;
  remainingDays: number;
  progressPercent: number;
}

export interface GetBuildQueueResponse {
  items: BuildQueueItemGroup[];
  totalItems: number;
  activeItems: number;
  awaitingResources: number;
  settlementCount: number;
  vassalItems: number;
}

export interface CharacterListStatsData {
  tactics: number;
  authority: number;
  cunning: number;
  governance: number;
  loyalty: number;
  constitution: number;
}

export interface CharacterListTraitEntry {
  id: string;
  name: string;
}

export interface CharacterListEntry {
  id: string;
  name: string;
  portrait: string;
  title: string;
  shortTitle: string;
  age: number;
  isAlive: boolean;
  isImprisoned: boolean;
  status: string;
  factionId: string;
  factionName: string;
  cultureId: string;
  culture: string;
  religionId: string;
  religion: string;
  activity: string;
  role: string;
  roleDetail: string;
  category: string;
  isPlayerCharacter: boolean;
  isHeir: boolean;
  canLeadProvince: boolean;
  hasCompliance: boolean;
  complianceTowardPlayer: number;
  fame: number;
  stats: CharacterListStatsData;
  traitIds: string[];
}

export interface GetCharacterListRequest {
  factionId: string;
  scope: string;
}

export interface GetCharacterListResponse {
  factionId: string;
  factionName: string;
  rulerId: string;
  heirId: string;
  scope: string;
  characters: CharacterListEntry[];
  traits: CharacterListTraitEntry[];
}

export interface GetContentPackWebUIManifestResponse {
  manifestJson: string;
}

export interface AppointmentContestCandidateDTO {
  id: string;
  name: string;
  provinceName: string;
  portrait: string;
  portraitLayers: PortraitLayerData;
  rank: number;
  totalScore: number;
  opinionScore: number;
  primaryStatScore: number;
  patronageScore: number;
  threatScore: number;
  multiContestMalus: number;
  isPlayerCharacter: boolean;
}

export interface AppointmentContestDTO {
  positionKey: string;
  title: string;
  description: string;
  category: string;
  primaryStat: string;
  icon: string;
  currentHolderId: string;
  currentHolderName: string;
  daysRemaining: number;
  availableInDays: number;
  contestWindowDays: number;
  termYears: number;
  isOpen: boolean;
  canPlayerEnter: boolean;
  playerEntryBlockReason: string;
  playerEntered: boolean;
  playerRank: number;
  candidates: AppointmentContestCandidateDTO[];
}

export interface GetCourtAppointmentContestsResponse {
  courtFactionId: string;
  courtFactionName: string;
  candidateDetailsIncluded: boolean;
  contests: AppointmentContestDTO[];
}

export interface GetCourtCandidatesRequest {
  positionKey: string;
}

export interface CourtCandidateTrait {
  id: string;
  name: string;
  description: string;
  isPositive: boolean;
}

export interface CourtCandidate {
  id: string;
  name: string;
  title: string;
  portrait: string;
  portraitLayers: PortraitLayerData;
  age: number;
  activity: string;
  tactics: number;
  authority: number;
  cunning: number;
  governance: number;
  loyalty: number;
  constitution: number;
  fame: number;
  currentPositionKey: string;
  traits: CourtCandidateTrait[];
}

export interface GetCourtCandidatesResponse {
  candidates: CourtCandidate[];
}

export interface GetCourtierTypesRequest {
  settlementId: string;
}

export interface CourtierTypeStatRange {
  statistic: string;
  min: number;
  max: number;
  mean: number;
}

export interface CourtierTypeDTO {
  id: string;
  title: string;
  description: string;
  backgroundImage: string;
  foregroundImage: string;
  ageMin: number;
  ageMax: number;
  minTraits: number;
  maxTraits: number;
  stats: CourtierTypeStatRange[];
}

export interface GetCourtierTypesResponse {
  promotionCost: number;
  types: CourtierTypeDTO[];
}

export interface CourtPositionSubordinate {
  id: string;
  name: string;
  statValue: number;
  statContribution: number;
  isPlayerCharacter: boolean;
  startDate: number;
  startDateText: string;
  endDate: number;
  endDateText: string;
  daysRemaining: number;
  termComplete: boolean;
  appointmentContestOpen: boolean;
}

export interface CourtPositionEntry {
  key: string;
  name: string;
  description: string;
  primaryStat: string;
  bonusLabel: string;
  bonusMultiplier: number;
  bonusDecimals: number;
  bonusSuffix: string;
  bonusIsNegative: boolean;
  holderId: string;
  holderName: string;
  holderStatValue: number;
  holderIsPlayerCharacter: boolean;
  statTotal: number;
  bonusValue: number;
  bonusText: string;
  bureaucraticCapacity: number;
  appointmentTermDays: number;
  appointmentTermYears: number;
  appointmentContestWindowDays: number;
  holderStartDate: number;
  holderStartDateText: string;
  holderEndDate: number;
  holderEndDateText: string;
  holderDaysRemaining: number;
  holderTermComplete: boolean;
  appointmentContestOpen: boolean;
  earlyReplacementPenaltyActive: boolean;
  earlyReplacementTermDaysRemaining: number;
  earlyReplacementHolderOpinionPenalty: number;
  earlyReplacementFriendOpinionPenalty: number;
  earlyReplacementFriendCount: number;
  earlyReplacementPowerBlocHappinessPenalty: number;
  earlyReplacementPowerBlocName: string;
  earlyReplacementPenaltyDurationDays: number;
  canPlayerEnterContest: boolean;
  playerEnteredContest: boolean;
  playerContestScore: number;
  playerContestRank: number;
  contestCandidateCount: number;
  leadingContestCandidateName: string;
  leadingContestCandidateScore: number;
  subordinates: CourtPositionSubordinate[];
}

export interface GetCourtPositionsResponse {
  autoAssignCourtEnabled: boolean;
  courtFactionId: string;
  courtFactionName: string;
  positions: CourtPositionEntry[];
  maxSubordinates: number;
}

export interface EventEffectData {
  kind: string;
  parameter: string;
  amount: number;
  description: string;
}

export interface EventOptionData {
  text: string;
  tooltip: string;
  objective: string;
  isLocked: boolean;
  effects: EventEffectData[];
}

export interface EventRegnalNameCountData {
  name: string;
  count: number;
}

export interface EventRegnalNameInputData {
  isRequired: boolean;
  label: string;
  value: string;
  randomButtonText: string;
  randomOptions: string[];
  targetPersonId: string;
  targetFactionId: string;
  previousNameCounts: EventRegnalNameCountData[];
}

export interface EventPersonNameInputData {
  isRequired: boolean;
  label: string;
  value: string;
  randomButtonText: string;
  randomOptions: string[];
  targetPersonId: string;
  targetFactionId: string;
}

export interface EventHistoryEntryData {
  id: string;
  title: string;
  body: string;
  imageId: string;
  presentationStyle: string;
  chosenOptionText: string;
}

export interface GetCurrentEventResponse {
  hasEvent: boolean;
  id: string;
  title: string;
  body: string;
  imageId: string;
  presentationStyle: string;
  chosenOptionIndex: number;
  regnalNameInput: EventRegnalNameInputData;
  personNameInput: EventPersonNameInputData;
  options: EventOptionData[];
  previousEvents: EventHistoryEntryData[];
}

export interface GetDiocesesRequest {
  religionKey: string;
}

export interface DioceseEntry {
  landKey: string;
  landName: string;
  bishopId: string;
  bishopName: string;
  authority: number;
  religionShare: number;
  followers: number;
  landPopulation: number;
}

export interface OrganisedReligionEntry {
  info: ReligionInfo;
  key: string;
  name: string;
  clergyTitle: string;
  iconPath: string;
  colour: string;
  isPlayerReligion: boolean;
  canManage: boolean;
  leadingFactionName: string;
}

export interface ReligionDistributionEntry {
  key: string;
  name: string;
  colour: string;
  share: number;
}

export interface GetDiocesesResponse {
  religionInfo: ReligionInfo;
  religionKey: string;
  religionName: string;
  description: string;
  clergyTitle: string;
  iconPath: string;
  colour: string;
  canManage: boolean;
  leadingFactionName: string;
  autoAssignClergyEnabled: boolean;
  dioceses: DioceseEntry[];
  organisedReligions: OrganisedReligionEntry[];
  religionDistribution: ReligionDistributionEntry[];
  totalRealmPopulation: number;
}

export interface GetDiplomacyOverviewRequest {
  scope: string;
}

export interface GetEconomyOverviewRequest {
  scope: string;
}

export interface EconomyOverviewResourceSource {
  name: string;
  amount: number;
  linkType: string;
  linkId: string;
}

export interface EconomyOverviewResourceAmount {
  id: string;
  name: string;
  amount: number;
}

export interface EconomyOverviewResourceRow {
  id: string;
  name: string;
  category: string;
  amount: number;
  production: number;
  vassalContribution: number;
  treatyIncome: number;
  armyUsage: number;
  queuedUsage: number;
  settlementConsumption: number;
  decayLoss: number;
  netPerMonth: number;
  marketMultiplier: number;
  buyPrice: number;
  sellPrice: number;
  autoSellEnabled: boolean;
  autoSellThreshold: number;
  autoSellSliderMax: number;
  producers: EconomyOverviewResourceSource[];
}

export interface EconomyOverviewFoodRow {
  settlementId: string;
  settlementName: string;
  factionId: string;
  factionName: string;
  stockpile: number;
  production: number;
  consumption: number;
  netPerMonth: number;
  shortage: number;
  isCapital: boolean;
}

export interface EconomyOverviewHistoryPoint {
  month: number;
  year: number;
  dateText: string;
  settlementIncome: number;
  tradeIncome: number;
  resourceSalesIncome: number;
  vassalTributeIncome: number;
  treatyTributeIncome: number;
  eventIncome: number;
  lootingIncome: number;
  otherIncome: number;
  armyExpense: number;
  commandMaintenanceExpense: number;
  treasuryDampeningExpense: number;
  replenishmentExpense: number;
  buildingExpense: number;
  tributePaidToLiege: number;
  treatyTributePaid: number;
  eventExpense: number;
  powerBlocExpense: number;
  autoAssignCommanderExpense: number;
  otherExpense: number;
  netIncome: number;
}

export interface EconomyOverviewTaxRow {
  factionId: string;
  factionName: string;
  isPlayerFaction: boolean;
  isVassal: boolean;
  isFoederati: boolean;
  effectiveRate: number;
  baseRate: number;
  adjustment: number;
  currentTax: number;
  potentialTax: number;
  leakage: number;
  blockadeLoss: number;
  culturalLoss: number;
  corruptionLoss: number;
  ungovernedLoss: number;
  complianceLoss: number;
  tributeBaseIncome: number;
}

export interface EconomyOverviewSettlementRow {
  id: string;
  name: string;
  population: number;
  income: number;
  taxIncome: number;
  tradeIncome: number;
  foodProduction: number;
  foodConsumption: number;
  foodStockpile: number;
  priority: string;
  buildingCount: number;
  governorId: string;
  governorName: string;
  productionResources: EconomyOverviewResourceAmount[];
  consumptionResources: EconomyOverviewResourceAmount[];
  stockpileResources: EconomyOverviewResourceAmount[];
}

export interface EconomyOverviewMilitaryRow {
  id: string;
  name: string;
  kind: string;
  upkeep: number;
  strength: number;
  maxStrength: number;
  foodConsumption: number;
  foodStockpile: number;
  location: string;
  priority: string;
  resourceUsage: EconomyOverviewResourceAmount[];
  resourceStockpile: EconomyOverviewResourceAmount[];
}

export interface EconomyOverviewVassalRow {
  id: string;
  name: string;
  taxRate: number;
  goldTribute: number;
  resourceContribution: number;
  requirement: number;
  priority: string;
  isFoederati: boolean;
  type: string;
  potential: number;
  contributions: EconomyOverviewResourceAmount[];
  requirements: EconomyOverviewResourceAmount[];
}

export interface GetEconomyOverviewResponse {
  gold: number;
  netIncome: number;
  incomeTotal: number;
  expenseTotal: number;
  settlementIncome: number;
  tradeIncome: number;
  resourceSalesIncome: number;
  vassalTributeIncome: number;
  treatyTributeIncome: number;
  eventIncome: number;
  lootingIncome: number;
  otherIncome: number;
  armyExpense: number;
  commandMaintenanceExpense: number;
  treasuryDampeningExpense: number;
  replenishmentExpense: number;
  buildingExpense: number;
  tributePaidToLiege: number;
  treatyTributePaid: number;
  eventExpense: number;
  powerBlocExpense: number;
  autoAssignCommanderExpense: number;
  otherExpense: number;
  treasuryAdjustment: number;
  totalFood: number;
  foodProduction: number;
  foodSubjectContribution: number;
  foodTreatyIncome: number;
  settlementFoodConsumption: number;
  armyFoodConsumption: number;
  foodQueuedConsumption: number;
  foodDecayLoss: number;
  foodIncomeTotal: number;
  foodExpenseTotal: number;
  foodNet: number;
  autoBuyEnabled: boolean;
  resources: EconomyOverviewResourceRow[];
  foodRows: EconomyOverviewFoodRow[];
  history: EconomyOverviewHistoryPoint[];
  taxRows: EconomyOverviewTaxRow[];
  settlements: EconomyOverviewSettlementRow[];
  militaries: EconomyOverviewMilitaryRow[];
  vassals: EconomyOverviewVassalRow[];
}

export interface GetEconomyResourceDetailsRequest {
  resourceId: string;
}

export interface EconomyResourceDetailValue {
  name: string;
  value: number;
}

export interface EconomyResourceProducerDetail {
  settlementId: string;
  settlementName: string;
  amount: number;
  naturalAmount: number;
  processedAmount: number;
  buildings: EconomyResourceDetailValue[];
  modifiers: EconomyResourceDetailValue[];
}

export interface EconomyResourceFlowDetail {
  id: string;
  name: string;
  kind: string;
  linkType: string;
  linkId: string;
  amount: number;
}

export interface EconomyResourceHistoryPoint {
  dateText: string;
  stockpile: number;
  production: number;
  consumption: number;
  net: number;
  marketPrice: number;
}

export interface GetEconomyResourceDetailsResponse {
  resourceId: string;
  name: string;
  description: string;
  effects: string;
  category: string;
  tier: string;
  decayRate: number;
  foodValue: number;
  sharedFoodDemand: number;
  producers: EconomyResourceProducerDetail[];
  externalSources: EconomyResourceFlowDetail[];
  consumers: EconomyResourceFlowDetail[];
  history: EconomyResourceHistoryPoint[];
}

export interface EncyclopediaEntryDTO {
  id: string;
  title: string;
  category: string;
  order: number;
  content: string;
}

export interface EncyclopediaCultureDTO {
  id: string;
  label: string;
  icon: string;
}

export interface EncyclopediaBuildingDTO {
  id: string;
  assetKey: string;
  name: string;
  category: string;
  categoryLabel: string;
  cultureId: string;
  description: string;
  effectsHtml: string;
  maxLevel: number;
  price: number;
  buildTimeDays: number;
  upkeep: number;
  chainName: string;
  developedFrom: string;
  canBeDevelopedInto: string[];
  requiredBuildings: string[];
}

export interface EncyclopediaResourceCostDTO {
  name: string;
  displayName: string;
  amount: number;
}

export interface EncyclopediaUnitDTO {
  id: string;
  name: string;
  unitType: string;
  unitTypeLabel: string;
  isNaval: boolean;
  cultureId: string;
  cultureName: string;
  cultureIcon: string;
  portrait: string;
  tier: number;
  maxStrength: number;
  price: number;
  buildTimeDays: number;
  upkeep: number;
  foodConsumption: number;
  resourceCost: EncyclopediaResourceCostDTO[];
  monthlyConsumption: EncyclopediaResourceCostDTO[];
  speed: number;
  pierceDamage: number;
  crushDamage: number;
  slashDamage: number;
  pierceArmour: number;
  crushArmour: number;
  slashArmour: number;
  attack: number;
  armour: number;
  siegePower: number;
  carryCapacity: number;
  maxShips: number;
  immuneToWinterAttrition: boolean;
  immuneToDesertAttrition: boolean;
  description: string;
}

export interface GetEncyclopediaEntriesResponse {
  entries: EncyclopediaEntryDTO[];
  categories: string[];
  buildingCultures: EncyclopediaCultureDTO[];
  buildings: EncyclopediaBuildingDTO[];
  unitCultures: EncyclopediaCultureDTO[];
  units: EncyclopediaUnitDTO[];
}

export interface GetFactionDailyDataRequest {
  factionId: string;
}

export interface FactionPolicyDailyEntry {
  id: string;
  value: number;
  canModify: boolean;
  canIncrease: boolean;
  canDecrease: boolean;
  inProgress: boolean;
  activeDirection: string;
  progress: number;
  remainingDays: number;
  durationDays: number;
  bureaucraticCurrentLoad: number;
  bureaucraticRushDaysSaved: number;
  bureaucraticRushLoad: number;
}

export interface GetFactionDailyDataResponse {
  id: string;
  population: number;
  settlements: number;
  armies: number;
  usesLevies: boolean;
  levyStrength: number;
  gold: number;
  income: number;
  strength: number;
  playerStrength: number;
  vassalCount: number;
  policies: FactionPolicyDailyEntry[];
}

export interface GetFactionDataRequest {
  factionId: string;
  scope: string;
}

export interface FactionTreatyEntry {
  id: string;
  type: string;
  displayName: string;
  description: string;
  withFactionId: string;
  withFactionDebugShortId: number;
  withFaction: string;
  withFactionColour: string;
  withFactionSecondaryColour: string;
  withFactionCulture: string;
  withFactionCultureGroup: string;
  withFactionEmblem: string;
  daysRemaining: number;
  isPerpetual: boolean;
  canBreak: boolean;
  breakingPenalty: number;
  isWithPlayer: boolean;
}

export interface FactionOpinionModifier {
  label: string;
  value: number;
}

export interface FactionWarEntry {
  id: string;
  debugShortId: number;
  name: string;
  colour: string;
  secondaryColour: string;
  cultureGroup: string;
  emblem: string;
}

export interface FactionPolicyLevelEntry {
  level: number;
  value: number;
  effectDescription: string;
  effectLines: WebUIDisplayLine[];
  isCurrent: boolean;
}

export interface FactionPolicyEntry {
  id: string;
  key: string;
  iconId: string;
  name: string;
  description: string;
  effectDescription: string;
  effectLines: WebUIDisplayLine[];
  increaseEffectDescription: string;
  increaseEffectLines: WebUIDisplayLine[];
  decreaseEffectDescription: string;
  decreaseEffectLines: WebUIDisplayLine[];
  levelEffects: FactionPolicyLevelEntry[];
  displayFactionName: string;
  isFromLiege: boolean;
  value: number;
  minValue: number;
  maxValue: number;
  increaseCost: number;
  decreaseCost: number;
  increaseDuration: number;
  decreaseDuration: number;
  increaseCausesUnrest: boolean;
  decreaseCausesUnrest: boolean;
  canModify: boolean;
  canIncrease: boolean;
  canDecrease: boolean;
  inProgress: boolean;
  activeDirection: string;
  progress: number;
  remainingDays: number;
  durationDays: number;
  bureaucraticIncreaseLoad: number;
  bureaucraticDecreaseLoad: number;
  bureaucraticCurrentLoad: number;
  bureaucraticRushDaysSaved: number;
  bureaucraticRushLoad: number;
}

export interface FactionModifierSourceEntry {
  label: string;
  value: number;
}

export interface FactionModifierEntry {
  key: string;
  label: string;
  description: string;
  icon: string;
  value: number;
  isPercent: boolean;
  isMultiplier: boolean;
  invertColouring: boolean;
  decimals: number;
  sources: FactionModifierSourceEntry[];
}

export interface GetFactionDataResponse {
  id: string;
  debugShortId: number;
  name: string;
  colour: string;
  secondaryColour: string;
  cultureId: string;
  culture: string;
  cultureGroup: string;
  emblem: string;
  religionId: string;
  religion: string;
  government: string;
  governmentDisplayName: string;
  governmentDescription: string;
  governmentCapabilities: string[];
  generatesLeaderOnSuccession: boolean;
  cultureInfo: CultureInfo;
  religionInfo: ReligionInfo;
  capital: string;
  rulerName: string;
  rulerId: string;
  rulerDebugShortId: number;
  rulerPortrait: string;
  rulerPortraitLayers: PortraitLayerData;
  population: number;
  settlements: number;
  armies: number;
  usesLevies: boolean;
  levyStrength: number;
  gold: number;
  income: number;
  strength: number;
  playerStrength: number;
  compliance: number;
  isPlayer: boolean;
  isRebel: boolean;
  rebelTypeName: string;
  rebelGoalName: string;
  rebelGoalDescription: string;
  diplomaticStatus: string;
  subjectType: string;
  subjectSubtype: string;
  buildFocusKey: string;
  buildFocus: string;
  canSetBuildFocus: boolean;
  buildFocusBlockedReason: string;
  peaceNegotiationTargetFactionId: string;
  opinion: number;
  vassalCount: number;
  treaties: FactionTreatyEntry[];
  wars: FactionWarEntry[];
  policies: FactionPolicyEntry[];
  modifiers: FactionModifierEntry[];
  opinionBreakdown: FactionOpinionModifier[];
  complianceBreakdown: FactionOpinionModifier[];
  assignedDiplomatId: string;
  assignedDiplomatName: string;
  assignedSpyId: string;
  assignedSpyName: string;
  spyNetworkStrength: number;
  spyHeat: number;
  spyNetworkGrowthPerMonth: number;
  spyCunning: number;
  canSetDesignatedHeir: boolean;
  designatedHeirId: string;
  designatedHeirName: string;
  effectiveHeirId: string;
  effectiveHeirName: string;
}

export interface GetFactionInteractionsRequest {
  targetFactionId: string;
}

export interface FactionInteractionReason {
  reason: string;
  status: string;
}

export interface FactionInteractionFactor {
  name: string;
  percent: number;
}

export interface FactionInteractionEntry {
  id: string;
  name: string;
  description: string;
  descriptionLines: WebUIDisplayLine[];
  iconId: string;
  backgroundId: string;
  showInQuickInteractionMenu: boolean;
  isEdict: boolean;
  goldCost: number;
  durationDays: number;
  cooldownDays: number;
  cooldownRemainingDays: number;
  availability: string;
  inProgress: boolean;
  remainingDays: number;
  bureaucraticLoad: number;
  bureaucraticRushDaysSaved: number;
  bureaucraticRushLoad: number;
  successChancePercent: number;
  needsSettlementSelection: boolean;
  canStartSettlementSelection: boolean;
  settlementSelectionPrompt: string;
  needsInputSelection: boolean;
  canStartInputSelection: boolean;
  reasons: FactionInteractionReason[];
  successFactors: FactionInteractionFactor[];
  effectLines: WebUIDisplayLine[];
}

export interface GetFactionInteractionsResponse {
  targetFactionId: string;
  interactions: FactionInteractionEntry[];
  lastCompletedInteractionId: string;
  lastInteractionSucceeded: boolean;
  lastInteractionCompletedDate: number;
  lastInteractionOutcomeText: string;
}

export interface GetFamilyTreeRequest {
  personId: string;
  scope: string;
}

export interface FamilyTreePerson {
  id: string;
  name: string;
  portrait: string;
  portraitLayers: PortraitLayerData;
  title: string;
  shortTitle: string;
  age: number;
  isAlive: boolean;
  isImprisoned: boolean;
  gender: string;
  culture: string;
  religion: string;
  activity: string;
  role: string;
  relationToRuler: string;
  isFocus: boolean;
  isRuler: boolean;
  isHeir: boolean;
  isDesignatedHeir: boolean;
  isPreviousRuler: boolean;
  fame: number;
}

export interface FamilyTreeEdge {
  fromId: string;
  toId: string;
  type: string;
}

export interface FamilyTreePatronageLink {
  patronId: string;
  clientId: string;
  linkHealth: number;
  favourBalance: number;
  daysSinceLastInteraction: number;
  isInherited: boolean;
}

export interface FamilyTreeGroups {
  parents: string[];
  spouses: string[];
  children: string[];
  siblings: string[];
  grandchildren: string[];
  succession: string[];
  previousRulers: string[];
  otherRelatives: string[];
}

export interface GetFamilyTreeResponse {
  scope: string;
  focusPersonId: string;
  factionId: string;
  factionName: string;
  rulerId: string;
  heirId: string;
  designatedHeirId: string;
  patronageRootId: string;
  nodes: FamilyTreePerson[];
  edges: FamilyTreeEdge[];
  patronageNodes: FamilyTreePerson[];
  patronageLinks: FamilyTreePatronageLink[];
  groups: FamilyTreeGroups;
}

export interface GetGameStateResponse {
  day: number;
  month: number;
  year: number;
  gameDay: number;
  dateText: string;
  season: string;
  isPaused: boolean;
  speedLevel: number;
  debugMode: boolean;
  climateTrend: number;
  climateDescription: string;
  saveSerial: number;
  gameOver: boolean;
  hasDemoTimeLimit: boolean;
  demoDaysRemaining: number;
  demoEndDateText: string;
}

export interface GetGameVersionResponse {
  version: string;
  isDemo: boolean;
}

export interface GetGeographicSummaryRequest {
  key: string;
  tier: string;
}

export interface GeographicSummaryChild {
  key: string;
  name: string;
  population: number;
}

export interface GetGeographicSummaryResponse {
  key: string;
  name: string;
  tier: string;
  childTier: string;
  totalPopulation: number;
  children: GeographicSummaryChild[];
}

export interface GetHeirCandidatesRequest {
  factionId: string;
}

export interface HeirDesignationConsequenceEntry {
  personId: string;
  name: string;
  isPreviousHeir: boolean;
  opinionOfAppointerChange: number;
  opinionOfHeirChange: number;
}

export interface HeirCandidateEntry {
  id: string;
  name: string;
  title: string;
  shortTitle: string;
  portrait: string;
  age: number;
  factionId: string;
  factionName: string;
  relationToRuler: string;
  tactics: number;
  fame: number;
  authority: number;
  cunning: number;
  governance: number;
  loyalty: number;
  constitution: number;
  appointerOpinionOfHeirChange: number;
  heirOpinionOfAppointerChange: number;
  consequenceDurationDays: number;
  passedOverConsequences: HeirDesignationConsequenceEntry[];
}

export interface GetHeirCandidatesResponse {
  factionId: string;
  candidates: HeirCandidateEntry[];
}

export interface IncomeEntry {
  name: string;
  amount: number;
}

export interface CommandUpkeepEntry {
  id: string;
  parentId: string;
  name: string;
  commandName: string;
  upkeep: number;
  maintenance: number;
}

export interface GetIncomeBreakdownResponse {
  gold: number;
  netIncome: number;
  incomeTotal: number;
  expenseTotal: number;
  treasuryAdjustment: number;
  settlementIncome: number;
  tradeIncome: number;
  resourceSalesIncome: number;
  vassalTributeIncome: number;
  treatyTributeIncome: number;
  eventIncome: number;
  lootingIncome: number;
  otherIncome: number;
  armyExpense: number;
  commandMaintenanceExpense: number;
  treasuryDampeningExpense: number;
  replenishmentExpense: number;
  buildingExpense: number;
  tributePaidToLiege: number;
  treatyTributePaid: number;
  eventExpense: number;
  powerBlocExpense: number;
  autoAssignCommanderExpense: number;
  otherExpense: number;
  settlements: IncomeEntry[];
  settlementTaxes: IncomeEntry[];
  settlementTrades: IncomeEntry[];
  armies: CommandUpkeepEntry[];
  vassals: IncomeEntry[];
}

export interface GetInitialSetupResponse {
  completed: boolean;
  forceOpen: boolean;
}

export interface LanguageEntry {
  code: string;
  name: string;
}

export interface GetLanguagesResponse {
  currentLocale: string;
  languages: LanguageEntry[];
}

export interface GetLedgerOverviewRequest {
  activeTab: string;
  rowOffset: number;
  rowLimit: number;
  sortKey: string;
  sortDirection: string;
  searchText: string;
  settlementFactionFilter: string;
  settlementTypeFilter: string;
  settlementRegionFilter: string;
  buildingCategoryFilter: string;
  buildingFactionFilter: string;
}

export interface LedgerFactionVisual {
  colour: string;
  secondaryColour: string;
  cultureGroup: string;
  emblem: string;
}

export interface LedgerSettlementRow {
  id: string;
  name: string;
  factionId: string;
  factionName: string;
  factionVisual: LedgerFactionVisual;
  type: string;
  region: string;
  population: number;
  income: number;
  foodProduction: number;
  foodConsumption: number;
  unrest: number;
  buildingCount: number;
  resourceCount: number;
  isCapital: boolean;
  isUnderSiege: boolean;
}

export interface LedgerMilitaryRow {
  id: string;
  name: string;
  factionId: string;
  factionName: string;
  factionVisual: LedgerFactionVisual;
  kind: string;
  commanderId: string;
  commanderName: string;
  strength: number;
  maxStrength: number;
  morale: number;
  upkeep: number;
  supplyDays: number;
  location: string;
  unitCount: number;
}

export interface LedgerFactionRow {
  id: string;
  name: string;
  visual: LedgerFactionVisual;
  rulerId: string;
  rulerName: string;
  diplomaticStatus: string;
  settlementCount: number;
  population: number;
  gold: number;
  income: number;
  strength: number;
  armyCount: number;
  navyCount: number;
  vassalCount: number;
  isPlayer: boolean;
  isRebel: boolean;
}

export interface LedgerResourceRow {
  id: string;
  name: string;
  category: string;
  stockpile: number;
  production: number;
  consumption: number;
  netPerMonth: number;
  settlementCount: number;
  isFood: boolean;
}

export interface LedgerBuildingRow {
  id: string;
  name: string;
  category: string;
  level: number;
  maxLevel: number;
  settlementId: string;
  settlementName: string;
  factionId: string;
  factionName: string;
  factionVisual: LedgerFactionVisual;
  upkeep: number;
  condition: number;
}

export interface LedgerNotificationHistoryRow {
  id: string;
  gameDate: number;
  date: string;
  category: string;
  categoryLabel: string;
  icon: string;
  titleHtml: string;
  bodyHtml: string;
  decision: string;
  hasDecision: boolean;
  isAccepted: boolean;
  battleAfterActionReport: BattleAfterActionReportPayload;
}

export interface GetLedgerOverviewResponse {
  settlementCount: number;
  militaryCount: number;
  factionCount: number;
  resourceCount: number;
  buildingCount: number;
  notificationCount: number;
  filteredSettlementCount: number;
  filteredBuildingCount: number;
  rowOffset: number;
  rowLimit: number;
  settlements: LedgerSettlementRow[];
  militaries: LedgerMilitaryRow[];
  factions: LedgerFactionRow[];
  resources: LedgerResourceRow[];
  buildings: LedgerBuildingRow[];
  notifications: LedgerNotificationHistoryRow[];
}

export interface MapModeEntry {
  id: string;
  label: string;
  description: string;
  tooltip: string;
  shortcut: string;
}

export interface GetMapModesResponse {
  activeMode: string;
  modes: MapModeEntry[];
}

export interface GetMilitaryCommanderCandidatesRequest {
  militaryId: string;
}

export interface MilitaryCommanderCandidateTrait {
  id: string;
  name: string;
  description: string;
  isPositive: boolean;
}

export interface MilitaryCommanderCandidate {
  id: string;
  name: string;
  title: string;
  portrait: string;
  portraitLayers: PortraitLayerData;
  age: number;
  tactics: number;
  authority: number;
  cunning: number;
  governance: number;
  loyalty: number;
  constitution: number;
  fame: number;
  isCurrentCommander: boolean;
  currentCommandName: string;
  traits: MilitaryCommanderCandidateTrait[];
}

export interface GetMilitaryCommanderCandidatesResponse {
  found: boolean;
  militaryId: string;
  militaryName: string;
  currentCommanderId: string;
  message: string;
  candidates: MilitaryCommanderCandidate[];
}

export interface GetNewGameMapFactionGeometryRequest {
  mapId: string;
}

export interface ScenarioMapFactionGeometryDto {
  baseName: string;
  geometry: ScenarioMapGeometryDto;
}

export interface GetNewGameMapFactionGeometryResponse {
  mapId: string;
  mapWidth: number;
  mapHeight: number;
  factions: ScenarioMapFactionGeometryDto[];
}

export interface GetNewGameMapFactionSelectionRequest {
  mapId: string;
}

export interface ScenarioMapValueBreakdownDto {
  label: string;
  value: number;
}

export interface ScenarioMapTraitEffectDto {
  stat: string;
  label: string;
  value: string;
  isPositive: boolean;
}

export interface ScenarioMapTraitDto {
  id: string;
  icon: string;
  name: string;
  description: string;
  isPositive: boolean;
  effects: ScenarioMapTraitEffectDto[];
}

export interface ScenarioMapStatDto {
  id: string;
  label: string;
  description: string;
  baseValue: number;
  value: number;
  breakdown: ScenarioMapValueBreakdownDto[];
}

export interface ScenarioMapLeaderDto {
  hasLeader: boolean;
  displayName: string;
  dynasty: string;
  gender: string;
  born: string;
  portraitLayers: PortraitLayerData;
  fame: number;
  traits: ScenarioMapTraitDto[];
  stats: ScenarioMapStatDto[];
}

export interface ScenarioMapGeometryDto {
  fillPath: string;
  borderPath: string;
}

export interface ScenarioMapTreatyDto {
  withFactionBaseName: string;
  withFactionDisplayName: string;
  type: string;
  displayName: string;
  description: string;
}

export interface ScenarioMapFactionDto {
  id: number;
  baseName: string;
  displayName: string;
  realm: string;
  culture: string;
  cultureDisplayName: string;
  cultureGroup: string;
  cultureInfo: CultureInfo;
  playable: boolean;
  fullGamePlayable: boolean;
  isRebel: boolean;
  religion: string;
  religionDisplayName: string;
  religionInfo: ReligionInfo;
  capitalSettlementName: string;
  hasCapitalPosition: boolean;
  capitalPosX: number;
  capitalPosY: number;
  government: string;
  governmentDisplayName: string;
  governmentDescription: string;
  governmentCapabilities: string[];
  gold: number;
  primaryColour: number[];
  secondaryColour: number[];
  emblemRowName: string;
  emblemAssetPath: string;
  cultureIconPath: string;
  religionIconPath: string;
  lands: string[];
  regionCount: number;
  settlementCount: number;
  population: number;
  militaryStrength: number;
  stats: ScenarioMapStatDto[];
  overlordBaseName: string;
  subjectSubtype: string;
  treaties: ScenarioMapTreatyDto[];
  leader: ScenarioMapLeaderDto;
  geometry: ScenarioMapGeometryDto;
}

export interface ScenarioMapWarSideDto {
  leaderFactionBaseName: string;
  leaderFactionDisplayName: string;
  memberFactionBaseNames: string[];
  militaryStrength: number;
}

export interface ScenarioMapWarDto {
  id: string;
  name: string;
  startedDay: string;
  attacker: ScenarioMapWarSideDto;
  defender: ScenarioMapWarSideDto;
}

export interface GetNewGameMapFactionSelectionResponse {
  mapId: string;
  displayName: string;
  factionSelectionDescription: string;
  defaultPlayerFactionBaseName: string;
  startingDateLabel: string;
  paperMapUrl: string;
  politicalMapUrl: string;
  mapWidth: number;
  mapHeight: number;
  factions: ScenarioMapFactionDto[];
  wars: ScenarioMapWarDto[];
}

export interface GetPersonDataRequest {
  personId: string;
  scope: string;
}

export interface PersonStatModifierEntry {
  stat: string;
  label: string;
  value: number;
  remainingDays: number;
  totalDurationDays: number;
}

export interface PersonStatsData {
  tactics: number;
  authority: number;
  cunning: number;
  governance: number;
  loyalty: number;
  constitution: number;
  baseTactics: number;
  baseAuthority: number;
  baseCunning: number;
  baseGovernance: number;
  baseLoyalty: number;
  baseConstitution: number;
  temporaryModifiers: PersonStatModifierEntry[];
}

export interface PersonTraitEffect {
  stat: string;
  label: string;
  value: string;
  isPositive: boolean;
}

export interface PersonTraitEntry {
  id: string;
  name: string;
  description: string;
  isPositive: boolean;
  effects: PersonTraitEffect[];
  isTemporary: boolean;
  remainingDays: number;
  totalDurationDays: number;
}

export interface PersonOpinionEntry {
  label: string;
  value: number;
}

export interface PersonRoleExperienceData {
  military: number;
  administrative: number;
  diplomatic: number;
  intrigue: number;
}

export interface PersonRoleTiersData {
  military: WebUIRoleTierData;
  administrative: WebUIRoleTierData;
  diplomatic: WebUIRoleTierData;
  intrigue: WebUIRoleTierData;
}

export interface PersonGovernedRegionEntry {
  id: string;
  name: string;
  focusSettlementId: string;
}

export interface PersonCourtPositionEntry {
  key: string;
  name: string;
  courtFactionId: string;
  courtFactionName: string;
  isSubordinate: boolean;
}

export interface PersonCommandedMilitaryEntry {
  id: string;
  name: string;
  isNavy: boolean;
  rank: string;
}

export interface PersonRelationshipEntry {
  id: string;
  name: string;
  portrait: string;
  portraitLayers: PortraitLayerData;
  type: string;
  age: number;
  isAlive: boolean;
}

export interface PersonHistoryEntry {
  type: string;
  label: string;
  targetId: string;
  targetType: string;
  targetName: string;
  secondaryTargetId: string;
  secondaryTargetType: string;
  secondaryTargetName: string;
  startDate: string;
  endDate: string;
  startDay: number;
  endDay: number;
  isActive: boolean;
  detail: string;
}

export interface GetPersonDataResponse {
  id: string;
  name: string;
  portrait: string;
  portraitLayers: PortraitLayerData;
  title: string;
  shortTitle: string;
  age: number;
  birthDate: string;
  deathDate: string;
  lifespan: string;
  deathCause: string;
  debugShortId: number;
  debugAgeDays: number;
  vigor: number;
  isImmortal: boolean;
  powerBlocName: string;
  powerBlocDebugShortId: number;
  commanderKind: string;
  isAlive: boolean;
  faction: string;
  factionId: string;
  rulerFactionName: string;
  factionColour: string;
  factionSecondaryColour: string;
  factionEmblem: string;
  factionCultureGroup: string;
  cultureId: string;
  culture: string;
  religionId: string;
  religion: string;
  cultureInfo: CultureInfo;
  religionInfo: ReligionInfo;
  activity: string;
  activitySegments: PersonActivitySegmentEntry[];
  stats: PersonStatsData;
  fame: number;
  honourDread: number;
  traits: PersonTraitEntry[];
  isPlayerCharacter: boolean;
  isRuler: boolean;
  isHeir: boolean;
  isDesignatedHeir: boolean;
  isFamilyOfPlayer: boolean;
  relationToPlayer: string;
  isSubordinateOfPlayer: boolean;
  complianceTowardPlayer: number;
  complianceBreakdown: PersonOpinionEntry[];
  opinionTowardPlayer: number;
  opinionBreakdown: PersonOpinionEntry[];
  honourDreadBreakdown: PersonOpinionEntry[];
  isImprisoned: boolean;
  imprisonedBy: string;
  imprisonmentReason: string;
  imprisonmentSettlement: string;
  roleExperience: PersonRoleExperienceData;
  roleTiers: PersonRoleTiersData;
  governedRegions: PersonGovernedRegionEntry[];
  courtPosition: PersonCourtPositionEntry;
  commandedMilitary: PersonCommandedMilitaryEntry;
  relationships: PersonRelationshipEntry[];
  history: PersonHistoryEntry[];
}

export interface GetPersonInteractionOptionsRequest {
  personId: string;
  interactionId: string;
}

export interface GetPersonInteractionOptionsResponse {
  playerGold: number;
  interaction: PersonInteractionEntry;
}

export interface GetPersonInteractionsRequest {
  personId: string;
}

export interface PersonInteractionReason {
  reason: string;
  status: string;
}

export interface PersonInteractionFactor {
  name: string;
  percent: number;
}

export interface PersonInteractionInitiatorCandidate {
  id: string;
  name: string;
  title: string;
  age: number;
  activity: string;
  tactics: number;
  authority: number;
  cunning: number;
  governance: number;
  loyalty: number;
  fame: number;
  successChancePercent: number;
}

export interface PersonInteractionGiftOption {
  index: number;
  name: string;
  description: string;
  cost: number;
  relationshipBonus: number;
  iconPath: string;
}

export interface PersonInteractionEntry {
  id: string;
  name: string;
  description: string;
  iconId: string;
  backgroundId: string;
  showInQuickInteractionMenu: boolean;
  category: string;
  difficulty: string;
  goldCost: number;
  durationDays: number;
  cooldownDays: number;
  cooldownRemainingDays: number;
  availability: string;
  inProgress: boolean;
  remainingDays: number;
  bureaucraticLoad: number;
  bureaucraticRushDaysSaved: number;
  bureaucraticRushLoad: number;
  successChancePercent: number;
  needsInitiatorSelection: boolean;
  needsGiftSelection: boolean;
  initiatorRequirementDescription: string;
  reasons: PersonInteractionReason[];
  successFactors: PersonInteractionFactor[];
  effectLines: WebUIDisplayLine[];
  initiatorCandidates: PersonInteractionInitiatorCandidate[];
  giftOptions: PersonInteractionGiftOption[];
}

export interface GetPersonInteractionsResponse {
  personId: string;
  playerGold: number;
  interactions: PersonInteractionEntry[];
  lastCompletedInteractionId: string;
  lastInteractionSucceeded: boolean;
  lastInteractionCompletedDate: number;
  lastInteractionOutcomeText: string;
}

export interface PersonInteractionDailyReason {
  reason: string;
  status: string;
}

export interface PersonInteractionDailyEntry {
  id: string;
  availability: string;
  inProgress: boolean;
  remainingDays: number;
  cooldownRemainingDays: number;
  bureaucraticRushDaysSaved: number;
  bureaucraticRushLoad: number;
  reasons: PersonInteractionDailyReason[];
}

export interface PersonInteractionsDailyPayload {
  personId: string;
  playerGold: number;
  lastCompletedInteractionId: string;
  lastInteractionSucceeded: boolean;
  lastInteractionCompletedDate: number;
  lastInteractionOutcomeText: string;
  interactions: PersonInteractionDailyEntry[];
}

export interface GetPersonQuickInteractionsRequest {
  personId: string;
}

export interface PinnedItemEntry {
  itemType: string;
  itemId: string;
  name: string;
  detail: string;
}

export interface GetPinnedItemsResponse {
  items: PinnedItemEntry[];
}

export interface GetPlayerFactionResponse {
  id: string;
  name: string;
  colour: string;
  secondaryColour: string;
  cultureGroup: string;
  emblem: string;
  religionId: string;
  diplomaticStatus: string;
  subjectSubtype: string;
  rulerId: string;
  rulerName: string;
  rulerPortrait: string;
  rulerPortraitLayers: PortraitLayerData;
  rulerIsAlive: boolean;
  rulerIsImprisoned: boolean;
}

export interface GetPortraitModeResponse {
  use3DPortraits: boolean;
}

export interface PowerBlocOverviewGoal {
  name: string;
  description: string;
  breakdown: string;
  weight: number;
  satisfaction: number;
}

export interface PowerBlocOverviewMember {
  id: string;
  debugShortId: number;
  name: string;
  role: string;
  affiliation: string;
  influence: number;
  loyalty: number;
  isLeader: boolean;
}

export interface PowerBlocOverviewDemand {
  title: string;
  description: string;
  issuedDate: number;
  deadlineDate: number;
  daysRemaining: number;
  totalDays: number;
  progress: number;
  progressLabel: string;
}

export interface PowerBlocOverviewModifier {
  label: string;
  value: string;
  isPositive: boolean;
}

export interface PowerBlocOverviewEntry {
  id: string;
  debugShortId: number;
  name: string;
  type: string;
  subtype: string;
  iconKey: string;
  description: string;
  leaderId: string;
  leaderDebugShortId: number;
  leaderName: string;
  memberCount: number;
  happiness: number;
  strength: number;
  imperialStrength: number;
  escalationStage: number;
  unhappyDays: number;
  failedDemandCount: number;
  goals: PowerBlocOverviewGoal[];
  members: PowerBlocOverviewMember[];
  contentModifiers: PowerBlocOverviewModifier[];
  unhappyModifiers: PowerBlocOverviewModifier[];
  hasActiveDemand: boolean;
  canPlayerJoin: boolean;
  canPlayerJoinReason: string;
  playerIsMember: boolean;
  activeDemand: PowerBlocOverviewDemand;
}

export interface GetPowerBlocsResponse {
  blocs: PowerBlocOverviewEntry[];
  canFormPersonalBloc: boolean;
  formPersonalBlocReason: string;
}

export interface GetPowerBlocDetailRequest {
  blocId: string;
}

export interface GetPowerBlocDetailResponse {
  bloc: PowerBlocOverviewEntry;
}

export interface ProvinceModeFactionSummaryDTO {
  id: string;
  name: string;
  colour: string;
  secondaryColour: string;
  culture: string;
  cultureGroup: string;
  religion: string;
  emblem: string;
  capital: string;
  gold: number;
  income: number;
  expenses: number;
  netIncome: number;
  population: number;
  settlements: number;
  strength: number;
}

export interface ProvinceModePersonDTO {
  id: string;
  debugShortId: number;
  name: string;
  title: string;
  portrait: string;
  portraitLayers: PortraitLayerData;
  tactics: number;
  authority: number;
  cunning: number;
  governance: number;
  loyalty: number;
  fame: number;
  clients: number;
  patrons: number;
  hasCommand: boolean;
  commandName: string;
}

export interface ProvinceModeScoreRowDTO {
  id: string;
  icon: string;
  label: string;
  description: string;
  value: number;
  remainingDays: number;
  tone: string;
}

export interface ProvinceModeMissionDTO {
  id: string;
  missionTypeId: string;
  icon: string;
  title: string;
  body: string;
  reward: string;
  status: string;
  deadlineDays: number;
  deadlinePercent: number;
  targetName: string;
  primaryAction: string;
  primaryActionLabel: string;
  canRunPrimaryAction: boolean;
}

export interface ProvinceModeCourtOfficeActionDTO {
  id: string;
  positionKey: string;
  scope: string;
  icon: string;
  title: string;
  body: string;
  effect: string;
  canRun: boolean;
  cooldownDaysRemaining: number;
}

export interface GetProvinceModeOverviewResponse {
  active: boolean;
  province: ProvinceModeFactionSummaryDTO;
  imperialFaction: ProvinceModeFactionSummaryDTO;
  governor: ProvinceModePersonDTO;
  emperor: ProvinceModePersonDTO;
  successor: ProvinceModePersonDTO;
  standingScore: number;
  standingTrend: number;
  threatScore: number;
  recallStage: number;
  nextReviewDays: number;
  reviewIntervalDays: number;
  threatRows: ProvinceModeScoreRowDTO[];
  standingRows: ProvinceModeScoreRowDTO[];
  missions: ProvinceModeMissionDTO[];
  courtOfficeActions: ProvinceModeCourtOfficeActionDTO[];
}

export interface ProvinceTooltipFaction {
  id: string;
  name: string;
  colour: string;
  secondaryColour: string;
  cultureGroup: string;
  emblem: string;
  isRebel: boolean;
}

export interface ProvinceTooltipShare {
  name: string;
  detail: string;
  percent: string;
  shareValue: number;
  colour: string;
  change: string;
  changeTone: string;
}

export interface ProvinceTooltipLabelInfo {
  label: string;
  colour: string;
}

export interface ProvinceTooltipMapModeEntry {
  label: string;
  colour: string;
}

export interface ProvinceTooltipResource {
  icon: string;
  label: string;
  stock: number;
}

export interface ProvinceTooltipResourceAmount {
  icon: string;
  label: string;
  amount: number;
}

export interface ProvinceTooltipDiseaseInfo {
  active: boolean;
  name: string;
  severityLabel: string;
  severity: number;
  daysRemaining: number;
  durationLabel: string;
  totalDeaths: number;
  foodPenalty: number;
  resourcePenalty: number;
  taxPenalty: number;
  mortalityRate: number;
  severityReduction: number;
  foodShortage: number;
}

export interface ProvinceTooltipBuildProgress {
  label: string;
  progress: number;
}

export interface GetProvinceTooltipResponse {
  visible: boolean;
  kind: string;
  screenX: number;
  screenY: number;
  viewportWidth: number;
  viewportHeight: number;
  altHeld: boolean;
  expanded: boolean;
  autoExpanded: boolean;
  mapModeId: string;
  mapModeLabel: string;
  mapModeEntries: ProvinceTooltipMapModeEntry[];
  terrainType: string;
  terrainName: string;
  terrainIcon: string;
  hasSnowAttrition: boolean;
  hasDesertAttrition: boolean;
  attritionIcon: string;
  settlementId: string;
  settlementName: string;
  settlementType: string;
  health: number;
  besieged: boolean;
  siegeProgress: number;
  fortification: number;
  fortificationProgress: number;
  starving: boolean;
  diseased: boolean;
  factionLabel: string;
  hasFaction: boolean;
  faction: ProvinceTooltipFaction;
  occupierLabel: string;
  hasOccupier: boolean;
  occupier: ProvinceTooltipFaction;
  populationLabel: string;
  populationValue: string;
  typeLabel: string;
  typeValue: string;
  locationLabel: string;
  locationValue: string;
  portStatus: string;
  religionLabel: string;
  religionShares: ProvinceTooltipShare[];
  cultureLabel: string;
  cultureShares: ProvinceTooltipShare[];
  monthlyIncome: number;
  tradeValue: number;
  corruption: number;
  population: number;
  unrest: number;
  loyalty: number;
  garrison: number;
  resources: ProvinceTooltipResource[];
  resourceProduction: ProvinceTooltipResourceAmount[];
  stockpiles: ProvinceTooltipResourceAmount[];
  diseaseInfo: ProvinceTooltipDiseaseInfo;
  cultureInfo: ProvinceTooltipLabelInfo;
  religionInfo: ProvinceTooltipLabelInfo;
  governorName: string;
  governorDebugShortId: number;
  complianceTargetLabel: string;
  complianceTargetName: string;
  complianceTargetIsRuler: boolean;
  complianceLuxuryLabel: string;
  complianceLuxuryStatus: string;
  regionName: string;
  landName: string;
  domainName: string;
  independent: boolean;
  overlordName: string;
  bishopName: string;
  hasBuilding: boolean;
  building: ProvinceTooltipBuildProgress;
  warWithPlayer: boolean;
  actionHint: string;
  landingTitle: string;
  landingInstruction: string;
  convoyTitle: string;
  convoyFactionLabel: string;
  convoyPurposeLabel: string;
  convoyPurpose: string;
  convoyRouteLabel: string;
  convoyRoute: string;
  convoyOriginLabel: string;
  convoyOrigin: string;
  convoyDestinationLabel: string;
  convoyDestination: string;
  convoyProgressLabel: string;
  convoyProgress: string;
  convoyEtaLabel: string;
  convoyEta: string;
  convoyCargoLabel: string;
  convoyPurposeDetails: string;
  convoyCargo: ProvinceTooltipResourceAmount[];
}

export interface GetRegionGovernorCandidatesRequest {
  settlementId: string;
}

export interface RegionGovernorCandidate {
  id: string;
  name: string;
  title: string;
  portrait: string;
  age: number;
  activity: string;
  tactics: number;
  authority: number;
  cunning: number;
  governance: number;
  loyalty: number;
  constitution: number;
  fame: number;
  currentRegionCount: number;
  maxRegionCount: number;
  isCurrentGovernor: boolean;
}

export interface GetRegionGovernorCandidatesResponse {
  candidates: RegionGovernorCandidate[];
}

export interface GetResourcesResponse {
  gold: number;
  goldDelta: number;
  population: number;
  populationDelta: number;
}

export interface GetSelectedMilitariesResponse {
  militaries: MilitaryOverviewForce[];
}

export interface SettingsVideoDTO {
  resolutionX: number;
  resolutionY: number;
  windowMode: string;
  vsync: boolean;
  frameRateLimit: number;
  resolutionScale: number;
  dlssMode: string;
  antiAliasing: string;
  gamma: number;
  brightness: number;
}

export interface SettingsAudioDTO {
  master: number;
  music: number;
  effects: number;
  ui: number;
  ambience: number;
}

export interface SettingsGameplayDTO {
  cameraPanSpeed: number;
  cameraZoomSpeed: number;
  cameraRotationSpeed: number;
  edgeScrolling: boolean;
  invertZoom: boolean;
  pauseOnNotifications: string;
  autoResumeOnDismiss: boolean;
  advisorFrequency: number;
  llmProvider: string;
  localLlmModel: string;
  eventFrequency: number;
  includeSaveInCrashReport: boolean;
  cursorScale: number;
  uiScale: number;
  glanceScale: number;
  uiScrollSpeed: number;
  tooltipDelaySeconds: number;
  notificationDurationMultiplier: number;
  reduceMotion: boolean;
  consoleEnabled: boolean;
  saveFrequency: string;
  autosaveSlotCount: number;
  difficulty: string;
  mutedNotificationTypes: string[];
}

export interface SettingsGraphicsDTO {
  textureQuality: number;
  shadowQuality: number;
  effectsQuality: number;
  foliageQuality: number;
  shadingQuality: number;
  viewDistanceQuality: number;
  showProvinceBorders: boolean;
  showFpsCounter: boolean;
  showSettlementGlances: boolean;
  showMilitaryGlances: boolean;
  showConvoyGlances: boolean;
  glanceDensity: string;
}

export interface NotificationTypeDTO {
  id: string;
  label: string;
  description: string;
  category: string;
  muted: boolean;
}

export interface ControlBindingDTO {
  index: number;
  isAxis: boolean;
  scale: number;
  actionName: string;
  label: string;
  description: string;
  groupName: string;
  groupLabel: string;
  groupItemLabel: string;
  keyName: string;
  keyDisplay: string;
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
  cmd: boolean;
}

export interface LlmModelDTO {
  filename: string;
  title: string;
  description: string;
  vramRequirement: string;
  vramRequirementMB: number;
  ramRequirementMB: number;
  iconPath: string;
  hasMetadata: boolean;
  installed: boolean;
  downloadUrl: string;
}

export interface HardwareInfoDTO {
  videoMemoryMB: number;
  systemMemoryMB: number;
}

export interface GetSettingsResponse {
  video: SettingsVideoDTO;
  audio: SettingsAudioDTO;
  gameplay: SettingsGameplayDTO;
  graphics: SettingsGraphicsDTO;
  notifications: NotificationTypeDTO[];
  controls: ControlBindingDTO[];
  availableLlmModels: LlmModelDTO[];
  hardware: HardwareInfoDTO;
  supportedResolutions: string[];
  dlssSupported: boolean;
}

export interface GetSettlementBuildingsRequest {
  settlementId: string;
}

export interface SettlementBuildingCost {
  name: string;
  displayName: string;
  amount: number;
}

export interface SettlementBuildingRequirement {
  assetKey: string;
  name: string;
  met: boolean;
}

export interface SettlementBuildingBuildState {
  state: string;
  reason: string;
}

export interface SettlementBuiltBuildingEntry {
  id: string;
  assetKey: string;
  name: string;
  level: number;
  maxLevel: number;
  category: string;
  chainName: string;
  description: string;
  effectsHtml: string;
  monthlyConditionChange: number;
  maintenanceGovernanceThreshold: number;
  condition: number;
  nextLevelPrice: number;
  nextLevelBuildTime: number;
  upkeep: number;
  resourceCost: SettlementBuildingCost[];
  dismantleSpoils: SettlementBuildingCost[];
  nextBuildState: SettlementBuildingBuildState;
  developedFrom: string;
  canBeDevelopedInto: string[];
  requiredBuildings: SettlementBuildingRequirement[];
  replacesParent: boolean;
  blocksConstruction: boolean;
  canDemolish: boolean;
  demolishReason: string;
  canDowngrade: boolean;
  downgradeReason: string;
  downgradeTargetName: string;
  downgradeTargetLevel: number;
}

export interface SettlementAvailableBuildingEntry {
  id: string;
  assetKey: string;
  name: string;
  maxLevel: number;
  category: string;
  chainName: string;
  description: string;
  effectsHtml: string;
  price: number;
  buildTime: number;
  upkeep: number;
  resourceCost: SettlementBuildingCost[];
  developedFrom: string;
  canBeDevelopedInto: string[];
  requiredBuildings: SettlementBuildingRequirement[];
  buildState: SettlementBuildingBuildState;
}

export interface SettlementConstructionQueueItem {
  id: string;
  queueIndex: number;
  assetKey: string;
  name: string;
  kind: string;
  toLevel: number;
  goldCost: number;
  resourceCost: SettlementBuildingCost[];
  durationDays: number;
  remainingDays: number;
  state: string;
  statusLabel: string;
  statusReason: string;
  missingResources: SettlementBuildingCost[];
}

export interface SettlementConstructionData {
  queue: SettlementConstructionQueueItem[];
  constructionBlocked: boolean;
  constructionBlockerName: string;
}

export interface GetSettlementBuildingsResponse {
  settlementId: string;
  snapshotDay: number;
  conditionOnly: boolean;
  buildings: SettlementBuiltBuildingEntry[];
  availableBuildings: SettlementAvailableBuildingEntry[];
  hasPort: boolean;
  construction: SettlementConstructionData;
  canBuild: boolean;
  cannotBuildReason: string;
}

export interface GetSettlementDataRequest {
  settlementId: string;
}

export interface SettlementCultureEntry {
  info: CultureInfo;
  percent: number;
  monthlyChangePercent: number;
  pressureSources: SettlementModifierSource[];
}

export interface SettlementReligionEntry {
  info: ReligionInfo;
  percent: number;
  monthlyChangePercent: number;
  pressureSources: SettlementModifierSource[];
  conversionResistancePercent: number;
  zealousMinority: boolean;
  naturallyGrowing: boolean;
  naturallyDeclining: boolean;
  persecutionResilience: boolean;
}

export interface SettlementPopEntry {
  cultureId: string;
  culture: string;
  cultureAdjective: string;
  religionId: string;
  religion: string;
  religionAdherentPlural: string;
  count: number;
  unrest: number;
  unrestBreakdown: SettlementModifierSource[];
  monthlyGrowth: number;
  growthBreakdown: SettlementModifierSource[];
  monthlyConversion: number;
  conversionTargetReligionId: string;
  conversionTargetReligion: string;
  monthlyAssimilation: number;
  assimilationTargetCultureId: string;
  assimilationTargetCulture: string;
}

export interface SettlementModifierSource {
  name: string;
  value: number;
}

export interface SettlementModifierEntry {
  key: string;
  id: string;
  label: string;
  description: string;
  iconPath: string;
  hasTotal: boolean;
  total: number;
  isPercent: boolean;
  sources: SettlementModifierSource[];
}

export interface SettlementBuildingEntry {
  name: string;
  level: number;
}

export interface SettlementGarrisonArmy {
  id: string;
  debugShortId: number;
  name: string;
  commanderName: string;
  commanderId: string;
  commanderDebugShortId: number;
  strength: number;
  maxStrength: number;
  morale: number;
  unitCount: number;
}

export interface SettlementGovernorData {
  name: string;
  title: string;
  personId: string;
  debugShortId: number;
}

export interface SettlementDiseaseData {
  hasDisease: boolean;
  name: string;
  description: string;
  severity: number;
  severityLabel: string;
  daysRemaining: number;
  deaths: number;
  effects: SettlementModifierSource[];
}

export interface SettlementBishopricEntry {
  religion: ReligionInfo;
  religionKey: string;
  religionName: string;
  religionIconPath: string;
  clergyTitle: string;
  canManage: boolean;
  bishopId: string;
  bishopDebugShortId: number;
  bishopName: string;
  authority: number;
  landReligionShare: number;
  landFollowers: number;
  landPopulation: number;
}

export interface SettlementGarrisonUnit {
  name: string;
  description: string;
  unitType: string;
  portrait: string;
  tier: number;
  strength: number;
  maxStrength: number;
  upkeep: number;
  foodConsumption: number;
  pierceDamage: number;
  crushDamage: number;
  slashDamage: number;
  pierceArmour: number;
  crushArmour: number;
  slashArmour: number;
  speed: number;
  culture: string;
}

export interface SettlementBesiegingArmy {
  kind: string;
  name: string;
  commanderName: string;
  commanderId: string;
  debugShortId: number;
  commanderDebugShortId: number;
  strength: number;
  maxStrength: number;
  siegePower: number;
  morale: number;
  unitCount: number;
  isLead: boolean;
}

export interface SettlementSiegeProgressFactor {
  name: string;
  value: number;
  kind: string;
  helpsProgress: boolean;
}

export interface SettlementResourceIssue {
  name: string;
  details: string;
}

export interface SettlementResourceCategoryEntry {
  id: string;
  name: string;
  stockpile: number;
  stockpileCap: number;
  production: number;
  potentialProduction: number;
  consumption: number;
  hasShortage: boolean;
  isCapitalStockpile: boolean;
}

export interface SettlementResourceEntry {
  id: string;
  name: string;
  category: string;
  categoryName: string;
  amount: number;
  stockpile: number;
  reserved: number;
  demand: number;
  production: number;
  potentialProduction: number;
  consumption: number;
  shortage: number;
  shortagePercent: number;
  status: string;
  depleting: boolean;
  monthsUntilDepletion: number;
  isNatural: boolean;
  siegeHalted: boolean;
  productionSources: SettlementModifierSource[];
  consumptionSources: SettlementModifierSource[];
  bottlenecks: SettlementResourceIssue[];
}

export interface GetSettlementDataResponse {
  id: string;
  name: string;
  debugShortId: number;
  faction: string;
  factionColour: string;
  factionSecondaryColour: string;
  factionEmblem: string;
  factionCultureGroup: string;
  factionId: string;
  factionDebugShortId: number;
  isCapital: boolean;
  isFactionIndependent: boolean;
  type: string;
  hasPort: boolean;
  population: number;
  populationGrowth: number;
  income: number;
  foodProduction: number;
  foodConsumption: number;
  fortificationLevel: number;
  unrest: number;
  unrestLabel: string;
  region: string;
  land: string;
  domain: string;
  regionKey: string;
  landKey: string;
  domainKey: string;
  cultureId: string;
  culture: string;
  culturePercent: number;
  religionId: string;
  religion: string;
  religionPercent: number;
  hasGovernor: boolean;
  governor: SettlementGovernorData;
  disease: SettlementDiseaseData;
  bishoprics: SettlementBishopricEntry[];
  canRename: boolean;
  canManageGovernor: boolean;
  governorCouldRebel: boolean;
  showSetCapital: boolean;
  canSetCapital: boolean;
  capitalMoveCost: number;
  capitalMoveBlockedReason: string;
  canNavigateSettlements: boolean;
  cultures: SettlementCultureEntry[];
  religions: SettlementReligionEntry[];
  pops: SettlementPopEntry[];
  modifiers: SettlementModifierEntry[];
  incomeBreakdown: SettlementModifierSource[];
  unrestBreakdown: SettlementModifierSource[];
  growthBreakdown: SettlementModifierSource[];
  foodBreakdown: SettlementModifierSource[];
  fortificationBreakdown: SettlementModifierSource[];
  buildings: SettlementBuildingEntry[];
  garrisonedArmies: SettlementGarrisonArmy[];
  garrison: SettlementGarrisonUnit[];
  canViewGarrison: boolean;
  garrisonHiddenReason: string;
  resourceCategories: SettlementResourceCategoryEntry[];
  resources: SettlementResourceEntry[];
  siegeStateKind: string;
  alsoBlockaded: boolean;
  canAssault: boolean;
  canSallyOut: boolean;
  canPillage: boolean;
  canSack: boolean;
  siegeProgress: number;
  estimatedSiegeDays: number;
  hasCapitalOccupationDeadline: boolean;
  capitalOccupationDaysRemaining: number;
  totalSiegePower: number;
  totalDefenderStrength: number;
  pillageGold: number;
  sackGold: number;
  siegeProgressPerDay: number;
  siegeProgressFactors: SettlementSiegeProgressFactor[];
  hostileFaction: string;
  hostileFactionId: string;
  hostileFactionDebugShortId: number;
  hostileFactionColour: string;
  hostileFactionSecondaryColour: string;
  hostileFactionEmblem: string;
  hostileFactionCultureGroup: string;
  besiegingArmies: SettlementBesiegingArmy[];
  defendingMilitaries: SettlementBesiegingArmy[];
  canBuild: boolean;
  cannotBuildReason: string;
}

export interface GetSettlementInteractionsRequest {
  settlementId: string;
}

export interface SettlementInteractionReason {
  reason: string;
  status: string;
}

export interface SettlementInteractionFactor {
  name: string;
  percent: number;
}

export interface SettlementInteractionEntry {
  id: string;
  name: string;
  description: string;
  iconId: string;
  backgroundId: string;
  scope: string;
  goldCost: number;
  durationDays: number;
  cooldownDays: number;
  cooldownRemainingDays: number;
  availability: string;
  inProgress: boolean;
  remainingDays: number;
  bureaucraticLoad: number;
  bureaucraticRushDaysSaved: number;
  bureaucraticRushLoad: number;
  successChancePercent: number;
  reasons: SettlementInteractionReason[];
  successFactors: SettlementInteractionFactor[];
  effectLines: WebUIDisplayLine[];
  needsDestinationSelection: boolean;
}

export interface GetSettlementInteractionsResponse {
  settlementId: string;
  interactions: SettlementInteractionEntry[];
  lastCompletedInteractionId: string;
  lastInteractionSucceeded: boolean;
  lastInteractionCompletedDate: number;
  lastInteractionOutcomeText: string;
}

export interface GetSettlementSiegeDataRequest {
  settlementId: string;
}

export interface GetSettlementSiegeDataResponse {
  id: string;
  siegeStateKind: string;
  alsoBlockaded: boolean;
  canAssault: boolean;
  canSallyOut: boolean;
  canPillage: boolean;
  canSack: boolean;
  siegeProgress: number;
  estimatedSiegeDays: number;
  hasCapitalOccupationDeadline: boolean;
  capitalOccupationDaysRemaining: number;
  totalSiegePower: number;
  totalDefenderStrength: number;
  pillageGold: number;
  sackGold: number;
  siegeProgressPerDay: number;
  siegeProgressFactors: SettlementSiegeProgressFactor[];
  hostileFaction: string;
  hostileFactionId: string;
  hostileFactionDebugShortId: number;
  hostileFactionColour: string;
  hostileFactionSecondaryColour: string;
  hostileFactionEmblem: string;
  hostileFactionCultureGroup: string;
  besiegingArmies: SettlementBesiegingArmy[];
  defendingMilitaries: SettlementBesiegingArmy[];
  canBuild: boolean;
  cannotBuildReason: string;
}

export interface GetSpyInteractionsRequest {
  targetFactionId: string;
}

export interface SpyInteractionReason {
  reason: string;
  status: string;
}

export interface SpyInteractionFactor {
  name: string;
  percent: number;
}

export interface SpyInteractionEntry {
  id: string;
  name: string;
  description: string;
  iconId: string;
  backgroundId: string;
  goldCost: number;
  durationDays: number;
  cooldownDays: number;
  cooldownRemainingDays: number;
  availability: string;
  inProgress: boolean;
  remainingDays: number;
  bureaucraticLoad: number;
  bureaucraticRushDaysSaved: number;
  bureaucraticRushLoad: number;
  successChancePercent: number;
  needsInputSelection: boolean;
  canStartInputSelection: boolean;
  reasons: SpyInteractionReason[];
  successFactors: SpyInteractionFactor[];
  effectLines: WebUIDisplayLine[];
}

export interface GetSpyInteractionsResponse {
  targetFactionId: string;
  interactions: SpyInteractionEntry[];
  lastCompletedInteractionId: string;
  lastInteractionSucceeded: boolean;
  lastInteractionCompletedDate: number;
  lastInteractionOutcomeText: string;
}

export interface TutorialCampaignStateObjectiveData {
  description: string;
  condition: string;
  isComplete: boolean;
}

export interface TutorialCampaignStateOptionData {
  text: string;
  tooltip: string;
  callbackName: string;
}

export interface TutorialCampaignStateEventData {
  index: number;
  eventId: string;
  title: string;
  body: string;
  objective: string;
  objectives: TutorialCampaignStateObjectiveData[];
  imageKey: string;
  triggerType: string;
  triggerCondition: string;
  highlightWidget: string;
  highlightDetail: string;
  requiredUnitCount: number;
  chosenOptionIndex: number;
  isCurrent: boolean;
  hasBeenShown: boolean;
  isResolved: boolean;
  options: TutorialCampaignStateOptionData[];
}

export interface GetTutorialCampaignStateResponse {
  hasSubsystem: boolean;
  hasActiveCampaign: boolean;
  campaignId: string;
  campaignType: string;
  sequenceId: string;
  currentEventIndex: number;
  highestShownIndex: number;
  totalEvents: number;
  shownEventCount: number;
  resolvedEventCount: number;
  objectiveEventCount: number;
  isComplete: boolean;
  currentEvent: TutorialCampaignStateEventData;
  events: TutorialCampaignStateEventData[];
}

export interface TutorialProgressStepData {
  text: string;
  isComplete: boolean;
}

export interface GetTutorialProgressResponse {
  isVisible: boolean;
  hasLiveObjectives: boolean;
  steps: TutorialProgressStepData[];
}

export interface VictoryConditionDomainEntry {
  name: string;
  controlledSettlements: number;
  totalSettlements: number;
  isMet: boolean;
}

export interface VictoryConditionProgressEntry {
  id: string;
  kind: string;
  label: string;
  description: string;
  domains: VictoryConditionDomainEntry[];
  progress: number;
  detailText: string;
  isMet: boolean;
}

export interface VictoryConditionTierEntry {
  id: string;
  name: string;
  iconPath: string;
  isAchieved: boolean;
  conditions: VictoryConditionProgressEntry[];
}

export interface GetVictoryConditionsResponse {
  enabled: boolean;
  completedConditions: number;
  totalConditions: number;
  tiers: VictoryConditionTierEntry[];
}

export interface GetWarningsResponse {
  warnings: WarningEventPayload[];
}

export interface WorldGlanceFaction {
  id: string;
  debugShortId: number;
  name: string;
  colour: string;
  secondaryColour: string;
  cultureGroup: string;
  emblem: string;
  relation: string;
  isRebel: boolean;
}

export interface WorldGlanceLabelInfo {
  label: string;
  colour: string;
}

export interface WorldGlanceResource {
  icon: string;
  label: string;
  stock: number;
}

export interface WorldConvoyCargo {
  icon: string;
  amount: number;
}

export interface WorldGlanceBuildProgress {
  label: string;
  icon: string;
  progress: number;
}

export interface WorldSettlementGlance {
  id: string;
  debugShortId: number;
  screenX: number;
  screenY: number;
  scale: number;
  opacity: number;
  zOrder: number;
  detailLevel: string;
  selected: boolean;
  targeted: boolean;
  name: string;
  faction: WorldGlanceFaction;
  hasOccupier: boolean;
  occupier: WorldGlanceFaction;
  isCapital: boolean;
  isProvincialCapital: boolean;
  settlementType: string;
  badgeScale: number;
  health: number;
  besieged: boolean;
  siegeProgress: number;
  fortification: number;
  fortificationProgress: number;
  starving: boolean;
  diseased: boolean;
  mode: string;
  mapModeId: string;
  mapModeLabel: string;
  monthlyIncome: number;
  tradeValue: number;
  corruption: number;
  population: number;
  unrest: number;
  loyalty: number;
  garrison: number;
  resources: WorldGlanceResource[];
  culture: WorldGlanceLabelInfo;
  religion: WorldGlanceLabelInfo;
  governorName: string;
  governorDebugShortId: number;
  complianceTargetLabel: string;
  complianceTargetName: string;
  complianceTargetIsRuler: boolean;
  complianceLuxuryLabel: string;
  complianceLuxuryStatus: string;
  regionName: string;
  landName: string;
  domainName: string;
  independent: boolean;
  overlordName: string;
  bishopName: string;
  hasBuildItem: boolean;
  buildItem: WorldGlanceBuildProgress;
  warWithPlayer: boolean;
}

export interface WorldPortGlance {
  id: string;
  screenX: number;
  screenY: number;
  scale: number;
  opacity: number;
  zOrder: number;
  detailLevel: string;
  selected: boolean;
  targeted: boolean;
  faction: WorldGlanceFaction;
  level: number;
  blockaded: boolean;
}

export interface WorldMilitaryGlance {
  id: string;
  debugShortId: number;
  screenX: number;
  screenY: number;
  scale: number;
  opacity: number;
  zOrder: number;
  detailLevel: string;
  faction: WorldGlanceFaction;
  strength: number;
  morale: number;
  tier: number;
  raiding: boolean;
  selected: boolean;
  targeted: boolean;
  blockading: boolean;
  embarkedArmyCount: number;
  attrition: boolean;
  attritionIcon: string;
  garrisoned: boolean;
  garrisonIndex: number;
}

export interface WorldBattleParticipant {
  faction: WorldGlanceFaction;
}

export interface WorldBattleSide {
  participants: WorldBattleParticipant[];
  totalStrength: number;
  morale: number;
  lastLosses: number;
}

export interface WorldBattleGlance {
  id: string;
  screenX: number;
  screenY: number;
  scale: number;
  opacity: number;
  zOrder: number;
  detailLevel: string;
  targeted: boolean;
  attacker: WorldBattleSide;
  defender: WorldBattleSide;
}

export interface WorldConvoyGlance {
  id: string;
  screenX: number;
  screenY: number;
  scale: number;
  opacity: number;
  zOrder: number;
  detailLevel: string;
  faction: WorldGlanceFaction;
  routeType: string;
  cargo: WorldConvoyCargo[];
}

export interface WorldGlanceFrameEntry {
  id: string;
  sourceIndex: number;
  screenX: number;
  screenY: number;
  scale: number;
  opacity: number;
  zOrder: number;
  detailLevel: number;
  selected: boolean;
  targeted: boolean;
  besieged: boolean;
  siegeProgress: number;
  hasBuildItem: boolean;
  buildItemProgress: number;
  attackerStrength: number;
  attackerMorale: number;
  attackerLastLosses: number;
  defenderStrength: number;
  defenderMorale: number;
  defenderLastLosses: number;
}

export interface GetWorldGlancesResponse {
  viewportWidth: number;
  viewportHeight: number;
  snapshotRevision: number;
  settlements: WorldSettlementGlance[];
  ports: WorldPortGlance[];
  armies: WorldMilitaryGlance[];
  navies: WorldMilitaryGlance[];
  battles: WorldBattleGlance[];
  convoys: WorldConvoyGlance[];
}

export interface WorldGlancesFrameResponse {
  viewportWidth: number;
  viewportHeight: number;
  snapshotRevision: number;
  dragSelectionActive: boolean;
  dragSelectionStartX: number;
  dragSelectionStartY: number;
  dragSelectionEndX: number;
  dragSelectionEndY: number;
  settlements: WorldGlanceFrameEntry[];
  ports: WorldGlanceFrameEntry[];
  armies: WorldGlanceFrameEntry[];
  navies: WorldGlanceFrameEntry[];
  battles: WorldGlanceFrameEntry[];
  convoys: WorldGlanceFrameEntry[];
}

export interface WorldBattleStrengthSnapshot {
  attackerStrength: number;
  defenderStrength: number;
  attackerMorale: number;
  defenderMorale: number;
  attackerLastLosses: number;
  defenderLastLosses: number;
}

export interface WorldGlancesCatalogueDelta {
  snapshotRevision: number;
  upsertedSettlements: WorldSettlementGlance[];
  upsertedPorts: WorldPortGlance[];
  upsertedArmies: WorldMilitaryGlance[];
  upsertedNavies: WorldMilitaryGlance[];
  upsertedBattles: WorldBattleGlance[];
  upsertedConvoys: WorldConvoyGlance[];
  removedSettlementIds: string[];
  removedPortIds: string[];
  removedArmyIds: string[];
  removedNavyIds: string[];
  removedBattleIds: string[];
  removedConvoyIds: string[];
}

export interface GetWorldGlanceTooltipRequest {
  kind: string;
  id: string;
}

export interface WorldGlanceTooltipCargo {
  icon: string;
  label: string;
  amount: number;
}

export interface GetWorldGlanceTooltipResponse {
  found: boolean;
  kind: string;
  id: string;
  name: string;
  settlementName: string;
  factionName: string;
  debugShortId: number;
  factionDebugShortId: number;
  tradeValue: number;
  warWithPlayer: boolean;
  blockaded: boolean;
  blockadingNavies: number;
  blockadingStrength: number;
  dockedNavyName: string;
  dockedNavyStrength: number;
  originName: string;
  destinationName: string;
  purpose: string;
  purposeDetails: string;
  progress: number;
  etaDays: number;
  routeType: string;
  clusterCount: number;
  attackerName: string;
  defenderName: string;
  attackerCount: number;
  defenderCount: number;
  cargo: WorldGlanceTooltipCargo[];
}

export interface GovernorAssignmentRequest {
  command: string;
  personId: string;
}

export interface GovernorAssignmentCandidate {
  id: string;
  name: string;
  portrait: string;
  portraitLayers: PortraitLayerData;
  age: number;
  governance: number;
  loyalty: number;
  currentRegionCount: number;
  maxRegionCount: number;
  atCapacity: boolean;
  isSelected: boolean;
}

export interface GovernorAssignmentResponse {
  active: boolean;
  selectedPersonId: string;
  message: string;
  candidates: GovernorAssignmentCandidate[];
}

export interface HandleWorldGlanceHoverRequest {
  kind: string;
  id: string;
  hovered: boolean;
}

export interface HandleWorldGlanceInputRequest {
  kind: string;
  id: string;
  mouseButton: string;
  shiftKey: boolean;
}

export interface HandleWorldGlanceInputResponse {
  handled: boolean;
  action: string;
}

export interface HintEventsRequest {
  command: string;
  hintKey: string;
  force: boolean;
}

export interface HintParagraphData {
  text: string;
}

export interface HintEventsResponse {
  hintKey: string;
  title: string;
  paragraphs: string[];
  paragraphPages: HintParagraphData[];
}

export interface SetProvinceBuildFocusRequest {
  factionId: string;
  focus: string;
}

export interface AdjustSubjectTaxRateRequest {
  factionId: string;
  delta: number;
}

export interface CreateProvinceFromCandidateRequest {
  landId: string;
  leaderPersonId: string;
  playAsProvince: boolean;
}

export interface ModEntryDto {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  loadOrder: number;
  enabled: boolean;
  pakMounted: boolean;
  hasScripts: boolean;
  canUploadToWorkshop: boolean;
}

export interface ListModsResponse {
  mods: ModEntryDto[];
  steamWorkshopAvailable: boolean;
  workshopCategories: string[];
}

export interface NewGameMapDto {
  id: string;
  displayName: string;
  menuKicker: string;
  menuDescription: string;
  menuImageUrl: string;
  menuOrder: number;
  requiresFactionSelection: boolean;
  isLocked: boolean;
}

export interface ListNewGameMapsResponse {
  maps: NewGameMapDto[];
}

export interface SaveGameEntryDto {
  slotName: string;
  displayName: string;
  playerCharacterName: string;
  playerFactionName: string;
  gameDateString: string;
  timestamp: string;
  isAutosave: boolean;
  factionId: string;
  factionColour: string;
  factionSecondaryColour: string;
  factionEmblem: string;
  cultureGroup: string;
  characterGender: string;
}

export interface ListSavesResponse {
  saves: SaveGameEntryDto[];
  loadError: string;
}

export interface LoadingScreenResponse {
  visible: boolean;
  progress: number;
  background: string;
  tip: string;
}

export interface LoadSaveRequest {
  slotName: string;
}

export interface LoadSaveResponse {
  started: boolean;
}

export interface MapModeFilterEntry {
  id: string;
  name: string;
  colour: string;
  iconPath: string;
  amount: number;
  active: boolean;
}

export interface GetMapModeFiltersResponse {
  modeId: string;
  modeLabel: string;
  supported: boolean;
  radioMode: boolean;
  filterActive: boolean;
  entries: MapModeFilterEntry[];
}

export interface MilitaryOverviewForce {
  id: string;
  debugShortId: number;
  name: string;
  parentId: string;
  rank: string;
  commanderName: string;
  commanderId: string;
  commanderDebugShortId: number;
  strength: number;
  maxStrength: number;
  morale: number;
  supplyDays: number;
  attrition: boolean;
  isNavy: boolean;
  doctrine: string;
  template: string;
  location: string;
  currentOrder: string;
  delegated: boolean;
  autoSquashRebels: boolean;
  isPlayerControlled: boolean;
}

export interface FoederatiOverviewEntry {
  id: string;
  factionId: string;
  factionName: string;
  factionColour: string;
  factionSecondaryColour: string;
  factionEmblem: string;
  factionCultureGroup: string;
  rulerName: string;
  rulerId: string;
  rulerPortrait: string;
  rulerPortraitLayers: PortraitLayerData;
  strength: number;
  availableStrength: number;
  activeStrength: number;
  isCalledUp: boolean;
  compliance: number;
  canCall: boolean;
}

export interface GetMilitaryOverviewResponse {
  forces: MilitaryOverviewForce[];
  foederati: FoederatiOverviewEntry[];
  totalArmyStrength: number;
  totalArmyMaxStrength: number;
  totalNavyStrength: number;
  totalNavyMaxStrength: number;
  totalShips: number;
  totalMaxShips: number;
  commandMaintenance: number;
  autoAssignCommandsEnabled: boolean;
  autoReplenishFormationsEnabled: boolean;
}

export interface GetMilitaryDataRequest {
  militaryId: string;
  subscriptionId: string;
  subscribe: boolean;
}

export interface MilitaryUnitSourceEntry {
  id: string;
  name: string;
  count: number;
  daysRemaining: number;
  startsOnDate: number;
  expiresOnDate: number;
  progressAtSnapshot: number;
  dailyProgress: number;
  snapshotDate: number;
}

export interface MilitaryUnitEntry {
  id: string;
  unitId: string;
  rowType: string;
  name: string;
  type: string;
  count: number;
  strength: number;
  maxStrength: number;
  culture: string;
  cultureId: string;
  description: string;
  portrait: string;
  tier: number;
  upkeep: number;
  foodConsumption: number;
  speed: number;
  siegePower: number;
  pierceDamage: number;
  crushDamage: number;
  slashDamage: number;
  pierceArmour: number;
  crushArmour: number;
  slashArmour: number;
  immuneToWinterAttrition: boolean;
  immuneToDesertAttrition: boolean;
  existingCount: number;
  pendingCount: number;
  targetCount: number;
  progress: number;
  statusLabel: string;
  selectable: boolean;
  sources: MilitaryUnitSourceEntry[];
}

export interface MilitaryBattleGroupEntry {
  id: string;
  role: string;
  name: string;
  unitIds: string[];
}

export interface MilitaryUnitTypeStrengthEntry {
  type: string;
  count: number;
}

export interface MilitarySubordinateEntry {
  id: string;
  debugShortId: number;
  depth: number;
  name: string;
  commanderName: string;
  commanderId: string;
  commanderDebugShortId: number;
  strength: number;
  maxStrength: number;
  unitTypes: MilitaryUnitTypeStrengthEntry[];
  withinCommandRange: boolean;
  distanceToSuperior: number;
  superiorCommandRadius: number;
  hierarchyTacticsBonus: number;
  hierarchyMoraleBonus: number;
  hierarchySpeedBonus: number;
}

export interface EmbarkedArmyEntry {
  id: string;
  debugShortId: number;
  name: string;
  strength: number;
}

export interface MilitaryResourceEntry {
  id: string;
  name: string;
  amount: number;
  capacity: number;
  monthlyUsage: number;
  daysRemaining: number;
}

export interface MilitaryAttritionEntry {
  id: string;
  name: string;
  strengthLossRate: number;
  moraleLossRate: number;
  severity: number;
  progress: number;
  nearbyStrength: number;
  strengthThreshold: number;
}

export interface GetMilitaryDataResponse {
  found: boolean;
  id: string;
  updateKind: string;
  debugShortId: number;
  name: string;
  faction: string;
  factionId: string;
  factionDebugShortId: number;
  commanderName: string;
  commanderId: string;
  commanderDebugShortId: number;
  commanderTitle: string;
  strength: number;
  maxStrength: number;
  morale: number;
  units: MilitaryUnitEntry[];
  unitRows: MilitaryUnitEntry[];
  battleGroups: MilitaryBattleGroupEntry[];
  commandRank: string;
  isNavy: boolean;
  currentOrder: string;
  formationTemplate: string;
  garrisonedAt: string;
  embarkedNavyId: string;
  embarkedNavyName: string;
  commandDoctrine: string;
  delegated: boolean;
  autoSquashRebels: boolean;
  subordinates: MilitarySubordinateEntry[];
  commandSubordinateCount: number;
  commandSubordinateCapacity: number;
  commandMaintenance: number;
  commandBuffRadius: number;
  hierarchyTacticsBonus: number;
  hierarchyMoraleBonus: number;
  hierarchySpeedBonus: number;
  parentCommand: string;
  parentCommandId: string;
  parentCommandDebugShortId: number;
  capacity: number;
  usedCapacity: number;
  embarkedArmies: EmbarkedArmyEntry[];
  resources: MilitaryResourceEntry[];
  attritionSources: MilitaryAttritionEntry[];
  supplyDays: number;
  isForcedMarching: boolean;
  isRaiding: boolean;
  isReplenishing: boolean;
  replenishCost: number;
  canReplenish: boolean;
  isFoederatiAuxiliary: boolean;
  foederatiOriginFactionId: string;
  isPlayerControlled: boolean;
}

export interface SetMilitaryParentRequest {
  militaryId: string;
  parentMilitaryId: string;
}

export interface SetMilitaryDelegationRequest {
  militaryId: string;
  delegated: boolean;
}

export interface SetMilitaryDoctrineRequest {
  militaryId: string;
  doctrine: string;
}

export interface SetMilitaryAutoSquashRebelsRequest {
  militaryId: string;
  enabled: boolean;
}

export interface PromoteMilitaryCommandRequest {
  militaryId: string;
}

export interface DemoteMilitaryCommandRequest {
  militaryId: string;
}

export interface ReplaceMilitaryCommanderRequest {
  militaryId: string;
  personId: string;
}

export interface UngarrisonMilitaryRequest {
  militaryId: string;
}

export interface SetMilitaryForcedMarchRequest {
  militaryId: string;
  enabled: boolean;
}

export interface MilitaryTargetingRequest {
  militaryId: string;
}

export interface ReplenishMilitaryRequest {
  militaryId: string;
}

export interface DisbandMilitaryRequest {
  militaryId: string;
}

export interface SetMilitaryFormationTemplateRequest {
  militaryId: string;
  templateId: string;
}

export interface DuplicateMilitaryFormationTemplateRequest {
  militaryId: string;
}

export interface DuplicateMilitaryFormationTemplateResponse {
  duplicated: boolean;
  templateId: string;
  message: string;
}

export interface ToggleFoederatiCallupRequest {
  factionId: string;
  calledUp: boolean;
}

export interface NavigateSettlementRequest {
  settlementId: string;
  direction: number;
}

export interface NavigateSettlementResponse {
  selectedSettlementId: string;
}

export interface NotificationEventsRequest {
  command: string;
  id: string;
}

export interface BattleAfterActionCommanderPayload {
  id: string;
  name: string;
  portraitLayers: PortraitLayerData;
  isAlive: boolean;
  isImprisoned: boolean;
}

export interface BattleAfterActionSidePayload {
  label: string;
  names: string;
  commanders: string;
  commanderDetails: BattleAfterActionCommanderPayload[];
  unitLabel: string;
  factionId: string;
  factionName: string;
  factionColour: string;
  factionSecondaryColour: string;
  factionCultureGroup: string;
  factionEmblem: string;
  initialStrength: number;
  remainingStrength: number;
  losses: number;
  lossPercent: number;
  won: boolean;
}

export interface BattleAfterActionSpoilPayload {
  resourceId: string;
  name: string;
  amount: number;
  iconPath: string;
}

export interface BattleAfterActionUnitDamagePayload {
  side: string;
  unitName: string;
  unitId: string;
  militaryName: string;
  militaryId: string;
  iconPath: string;
  portraitPath: string;
  factionId: string;
  factionName: string;
  factionColour: string;
  factionSecondaryColour: string;
  factionCultureGroup: string;
  factionEmblem: string;
  initialStrength: number;
  remainingStrength: number;
  losses: number;
  kills: number;
  damageDealt: number;
  lossPercent: number;
  destroyed: boolean;
}

export interface BattleAfterActionReportPayload {
  available: boolean;
  battleName: string;
  outcome: string;
  location: string;
  summary: string;
  headerImage: string;
  spoils: string;
  spoilsList: BattleAfterActionSpoilPayload[];
  unitDamage: BattleAfterActionUnitDamagePayload[];
  ourSide: BattleAfterActionSidePayload;
  enemySide: BattleAfterActionSidePayload;
}

export interface NotificationShownPayload {
  id: string;
  title: string;
  description: string;
  type: string;
  notificationTypeId: string;
  notificationTypeLabel: string;
  iconPath: string;
  timestamp: string;
  style: string;
  createdOnDay: number;
  expiresOnDay: number;
  durationDays: number;
  hasPortrait: boolean;
  characterName: string;
  personId: string;
  portraitLayers: PortraitLayerData;
  canAnchorAtSettlement: boolean;
  settlementId: string;
  settlementScreenX: number;
  settlementScreenY: number;
  settlementViewportWidth: number;
  settlementViewportHeight: number;
  battleAfterActionReport: BattleAfterActionReportPayload;
}

export interface SettlementNotificationAnchor {
  id: string;
  screenX: number;
  screenY: number;
  viewportWidth: number;
  viewportHeight: number;
  zOrder: number;
}

export interface NotificationAnchorsFramePayload {
  settlements: SettlementNotificationAnchor[];
}

export interface OpenExternalLinkRequest {
  linkId: string;
}

export interface OpenExternalUrlRequest {
  url: string;
}

export interface PeaceNegotiationReplacementCandidate {
  id: string;
  name: string;
  title: string;
  portrait: string;
  portraitLayers: PortraitLayerData;
  age: number;
  authority: number;
  governance: number;
  fame: number;
}

export interface PeaceNegotiationTermDraft {
  termId: string;
  type: string;
  direction: string;
  targetFactionId: string;
  vassalFactionId: string;
  targetSettlementIds: string[];
  settlementSummary: string;
  settlementCount: number;
  tributeAmount: number;
  tributeDurationDays: number;
  replacementRulerId: string;
  replacementCandidates: PeaceNegotiationReplacementCandidate[];
}

export interface PeaceNegotiationFaction {
  id: string;
  name: string;
  colour: string;
  secondaryColour: string;
  cultureGroup: string;
  emblem: string;
  rulerId: string;
  rulerName: string;
  strength: number;
  gold: number;
  settlements: number;
}

export interface PeaceNegotiationParticipant {
  faction: PeaceNegotiationFaction;
  isLeader: boolean;
  isEnemySide: boolean;
}

export interface PeaceNegotiationTermEntry {
  termId: string;
  type: string;
  direction: string;
  label: string;
  description: string;
  targetFactionId: string;
  targetFactionName: string;
  vassalFactionId: string;
  vassalFactionName: string;
  targetSettlementIds: string[];
  settlementSummary: string;
  settlementCount: number;
  tributeAmount: number;
  tributeDurationDays: number;
  replacementRulerId: string;
  replacementRulerName: string;
  replacementCandidates: PeaceNegotiationReplacementCandidate[];
  warScoreCost: number;
}

export interface PeaceNegotiationTermOption {
  optionId: string;
  type: string;
  direction: string;
  label: string;
  description: string;
  targetFactionId: string;
  targetFactionName: string;
  vassalFactionId: string;
  vassalFactionName: string;
  targetSettlementIds: string[];
  settlementSummary: string;
  settlementCount: number;
  defaultTributeAmount: number;
  defaultTributeDurationDays: number;
  isSelected: boolean;
  replacementRulerId: string;
  replacementCandidates: PeaceNegotiationReplacementCandidate[];
}

export interface PeaceNegotiationPreview {
  currentWarScore: number;
  warScoreBreakdown: DiplomacyWarScoreEntry[];
  demandCost: number;
  concessionCost: number;
  netCostForPlayer: number;
  acceptanceScore: number;
  verdict: string;
  verdictLabel: string;
  canSubmit: boolean;
  blockedReason: string;
  breakdown: string;
}

export interface GetPeaceNegotiationStateRequest {
  targetFactionId: string;
  terms: PeaceNegotiationTermDraft[];
}

export interface GetPeaceNegotiationPreviewRequest {
  targetFactionId: string;
  terms: PeaceNegotiationTermDraft[];
}

export interface GetPeaceNegotiationPreviewResponse {
  found: boolean;
  targetFactionId: string;
  terms: PeaceNegotiationTermEntry[];
  preview: PeaceNegotiationPreview;
  emptyReason: string;
}

export interface GetPeaceNegotiationStateResponse {
  found: boolean;
  targetFactionId: string;
  warId: string;
  warName: string;
  warDurationDays: number;
  battlesFought: number;
  settlementsCaptured: number;
  isWarLeader: boolean;
  isRebellionWar: boolean;
  playerFaction: PeaceNegotiationFaction;
  targetFaction: PeaceNegotiationFaction;
  ourParticipants: PeaceNegotiationParticipant[];
  theirParticipants: PeaceNegotiationParticipant[];
  terms: PeaceNegotiationTermEntry[];
  availableTerms: PeaceNegotiationTermOption[];
  preview: PeaceNegotiationPreview;
  emptyReason: string;
}

export interface SubmitPeaceNegotiationRequest {
  targetFactionId: string;
  terms: PeaceNegotiationTermDraft[];
}

export interface SubmitPeaceNegotiationResponse {
  submitted: boolean;
  result: string;
  message: string;
  state: GetPeaceNegotiationStateResponse;
}

export interface StartPeaceSettlementSelectionRequest {
  targetFactionId: string;
  terms: PeaceNegotiationTermDraft[];
}

export interface StartPeaceSettlementSelectionResponse {
  targetFactionId: string;
  selectionActive: boolean;
  terms: PeaceNegotiationTermDraft[];
}

export interface PerformSiegeCommandRequest {
  settlementId: string;
  command: string;
}

export interface PerformSiegeCommandResponse {
  performed: boolean;
  settlementId: string;
  openedBattle: boolean;
  battleId: string;
}

export interface PersonActivitySegmentEntry {
  text: string;
  linkType: string;
  linkId: string;
}

export interface PickNewGameMapFactionRequest {
  mapId: string;
  x: unknown;
  y: unknown;
}

export interface PickNewGameMapFactionResponse {
  baseName: string;
}

export interface PortraitLayerData {
  background: string;
  backHeadgear: string;
  portrait: string;
  normalMap: string;
  faceMask: string;
  frontHeadgear: string;
}

export interface PortraitInvalidatedEventPayload {
  personId: string;
  appearanceRevision: number;
}

export interface PortraitReadyEventPayload {
  personId: string;
  expression: string;
  appearanceRevision: number;
  colourUrl: string;
  normalUrl: string;
}

export interface PromoteCourtierRequest {
  settlementId: string;
  courtierTypeId: string;
}

export interface PromoteCourtierResponse {
  success: boolean;
  message: string;
}

export interface ProvinceEmperorTakeoverRequest {
  command: string;
  personId: string;
}

export interface ProvinceEmperorTakeoverCandidate {
  id: string;
  name: string;
  title: string;
  sourceFactionName: string;
  portrait: string;
  portraitLayers: PortraitLayerData;
  age: number;
  governance: number;
  loyalty: number;
  fame: number;
  support: number;
  threat: number;
  isSelected: boolean;
}

export interface ProvinceEmperorTakeoverResponse {
  active: boolean;
  provinceFactionId: string;
  provinceFactionName: string;
  imperialFactionId: string;
  imperialFactionName: string;
  selectedPersonId: string;
  message: string;
  candidates: ProvinceEmperorTakeoverCandidate[];
}

export interface QueueSettlementBuildingRequest {
  settlementId: string;
  buildingId: string;
}

export interface RandomiseCharacterCreatorRequest {
  female: boolean;
  age: number;
  seed: number;
}

export interface RandomiseCharacterCreatorResponse {
  facialGenes: number[];
  african: number;
  european: number;
  asian: number;
  melanin: number;
  undertone: number;
  freckling: number;
  eyeMelanin: number;
  hairMelanin: number;
  hairRedness: number;
  hairCurl: number;
  bodyBuild: number;
  hairLoss: number;
  asymmetry: number;
}

export interface RebindActionKeyRequest {
  index: number;
  isAxis: boolean;
  keyName: string;
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
  cmd: boolean;
}

export interface RebindActionKeyResponse {
  clearedActions: string[];
}

export interface RecruitCharacterForRoleRequest {
  role: string;
  contextId: string;
  religionKey: string;
  positionKey: string;
}

export interface RecruitCharacterForRoleResponse {
  recruited: boolean;
  goldCost: number;
  playerGold: number;
  personId: string;
  personName: string;
  message: string;
}

export interface ReligionConversionOptionEntry {
  info: ReligionInfo;
  key: string;
  name: string;
  description: string;
  iconPath: string;
  colour: string;
  realmShare: number;
}

export interface ReligionConversionStageEntry {
  index: number;
  name: string;
  description: string;
  durationDays: number;
  goldCost: number;
  unrestPercent: number;
  targetShareBoostPerYear: number;
  taxEfficiencyPenalty: number;
  courtierLoyaltyPenalty: number;
  changesReligion: boolean;
  state: string;
  progress: number;
  remainingDays: number;
  canActivate: boolean;
  reason: string;
}

export interface ReligionConversionStateEntry {
  active: boolean;
  currentReligionKey: string;
  currentReligionName: string;
  currentReligionIconPath: string;
  currentReligionColour: string;
  currentReligionInfo: ReligionInfo;
  targetReligionKey: string;
  targetReligionName: string;
  targetReligionIconPath: string;
  targetReligionColour: string;
  targetReligionInfo: ReligionInfo;
  currentStageIndex: number;
  currentStageName: string;
  currentStageProgress: number;
  currentStageRemainingDays: number;
  canAdvance: boolean;
  canComplete: boolean;
  playerGold: number;
}

export interface GetReligionConversionResponse {
  state: ReligionConversionStateEntry;
  options: ReligionConversionOptionEntry[];
  stages: ReligionConversionStageEntry[];
}

export interface ReligionConversionActionResponse {
  success: boolean;
  completed: boolean;
  message: string;
}

export interface RenameSettlementRequest {
  settlementId: string;
  name: string;
}

export interface RenameSettlementResponse {
  renamed: boolean;
  name: string;
  message: string;
}

export interface RenderCharacterCreatorPreviewRequest {
  female: boolean;
  age: number;
  expression: string;
  environmentGroup: string;
  environmentRole: string;
  backgroundZoom: number;
  facialGenes: number[];
  african: number;
  european: number;
  asian: number;
  melanin: number;
  undertone: number;
  freckling: number;
  eyeMelanin: number;
  hairMelanin: number;
  hairRedness: number;
  hairCurl: number;
  bodyBuild: number;
  hairLoss: number;
  asymmetry: number;
  bodyCondition: number;
  fatigue: number;
  injurySeverity: number;
  dirt: number;
}

export interface ReorderSettlementBuildingRequest {
  settlementId: string;
  sourceQueueIndex: number;
  targetQueueIndex: number;
}

export interface RequestPortraitRequest {
  personId: string;
  expression: string;
  priority: number;
}

export interface RequestPortraitResponse {
  personId: string;
  appearanceRevision: number;
  colourUrl: string;
  normalUrl: string;
  ready: boolean;
}

export interface ResetSettingsRequest {
  page: string;
}

export interface RespondToProvinceRecallRequest {
  acceptRecall: boolean;
}

export interface RespondToProvinceRecallResponse {
  success: boolean;
  message: string;
}

export interface WebUIRoleTierData {
  stars: number;
  label: string;
  base: number;
}

export interface RunCourtOfficeActionRequest {
  actionId: string;
}

export interface RunCourtOfficeActionResponse {
  success: boolean;
  message: string;
}

export interface RunGovernorMissionActionRequest {
  missionId: string;
  action: string;
}

export interface RunGovernorMissionActionResponse {
  success: boolean;
  message: string;
}

export interface RushBureaucraticActionRequest {
  targetFactionId: string;
  targetId: string;
  actionKind: string;
  actionId: string;
}

export interface RushBureaucraticActionResponse {
  rushed: boolean;
  daysSaved: number;
  addedLoad: number;
  remainingDays: number;
  message: string;
}

export interface SaveGameRequest {
  displayName: string;
  existingSlotName: string;
}

export interface SaveGameResponse {
  saved: boolean;
  failureReason: string;
}

export interface SelectMilitaryRequest {
  militaryId: string;
}

export interface SetAutoAssignClergyRequest {
  enabled: boolean;
}

export interface SetAutoAssignCommandsRequest {
  enabled: boolean;
}

export interface SetAutoAssignCourtRequest {
  enabled: boolean;
}

export interface SetAutoAssignGovernorsRequest {
  enabled: boolean;
}

export interface SetAutoReplenishFormationsRequest {
  enabled: boolean;
}

export interface SetCharacterCreatorCameraRotationRequest {
  framing: string;
  yaw: number;
  pitch: number;
}

export interface SetConvoyGlanceFiltersRequest {
  showConvoys: boolean;
  factionFilterActive: boolean;
  activeFactionIds: string[];
}

export interface SetDesignatedHeirRequest {
  personId: string;
  factionId: string;
}

export interface SetDesignatedHeirResponse {
  success: boolean;
  factionId: string;
  heirId: string;
  heirName: string;
  message: string;
}

export interface SetFactionBorderHighlightRequest {
  factionId: string;
  highlighted: boolean;
}

export interface SetLanguageRequest {
  locale: string;
}

export interface SetMapModeRequest {
  modeId: string;
}

export interface SetMapModeFiltersRequest {
  modeId: string;
  filterActive: boolean;
  activeIds: string[];
  selectedEntryId: string;
}

export interface SetModEnabledRequest {
  modId: string;
  enabled: boolean;
}

export interface SetModEnabledResponse {
  ok: boolean;
}

export interface SetNotificationMutedRequest {
  typeId: string;
  muted: boolean;
}

export interface SetPowerBlocMembershipRequest {
  blocId: string;
  join: boolean;
}

export interface SetPowerBlocMembershipResponse {
  success: boolean;
  message: string;
}

export interface SetSettlementCapitalRequest {
  settlementId: string;
}

export interface SetSettlementCapitalResponse {
  moved: boolean;
  cost: number;
  message: string;
}

export interface SetSettlementSidebarAmbientRequest {
  enabled: boolean;
}

export interface SetSpeedRequest {
  speedLevel: number;
}

export interface ShowScreenRequest {
  screen: string;
}

export interface ShowScreenResponse {
  screen: string;
  id: string;
}

export interface SidebarEventPayload {
  type: string;
  id: string;
  entityType: string;
  tabIndex: number;
}

export interface StartBlocInteractionRequest {
  blocId: string;
  interactionId: string;
}

export interface StartBlocInteractionResponse {
  started: boolean;
  succeeded: boolean;
  message: string;
}

export interface StartFactionInteractionRequest {
  targetFactionId: string;
  interactionId: string;
  selectedPersonId: string;
  confirmSettlementSelection: boolean;
  cancelSettlementSelection: boolean;
  providedInputs: BridgeFactionInteractionProvidedInput[];
}

export interface FactionInteractionPersonCandidate {
  id: string;
  name: string;
  title: string;
  portrait: string;
  portraitLayers: PortraitLayerData;
  age: number;
  factionName: string;
  fame: number;
  authority: number;
  governance: number;
}

export interface StartFactionInteractionResponse {
  targetFactionId: string;
  interactionId: string;
  started: boolean;
  completed: boolean;
  succeeded: boolean;
  selectionStarted: boolean;
  selectionActive: boolean;
  personSelectionRequired: boolean;
  inputSelectionRequired: boolean;
  selectedSettlementCount: number;
  playerGold: number;
  hasSuccessChance: boolean;
  successChancePercent: number;
  selectionImpactText: string;
  selectionSuccessEffect: string;
  selectionFailureEffect: string;
  selectionRiskText: string;
  interactionName: string;
  selectionPrompt: string;
  personSelectionPrompt: string;
  personCandidates: FactionInteractionPersonCandidate[];
  inputSelectionPrompt: string;
  inputRequirements: BridgeFactionInteractionInputRequirement[];
  factionCandidates: BridgeFactionInteractionFactionCandidate[];
  message: string;
}

export interface StartPersonInteractionRequest {
  personId: string;
  interactionId: string;
  initiatorPersonId: string;
  giftTypeIndex: number;
}

export interface StartPersonInteractionResponse {
  started: boolean;
  completed: boolean;
  succeeded: boolean;
  message: string;
}

export interface StartPolicyAdjustmentRequest {
  factionId: string;
  policyId: string;
  direction: string;
}

export interface StartPolicyAdjustmentResponse {
  started: boolean;
  message: string;
}

export interface StartReligionConversionRequest {
  religionKey: string;
}

export interface StartScenarioMapRequest {
  mapId: string;
  playerFactionBaseName: string;
}

export interface StartSettlementInteractionRequest {
  settlementId: string;
  interactionId: string;
}

export interface StartSettlementInteractionResponse {
  started: boolean;
  needsDestinationSelection: boolean;
  message: string;
}

export interface StartSpyInteractionRequest {
  targetFactionId: string;
  interactionId: string;
  providedInputs: BridgeFactionInteractionProvidedInput[];
}

export interface StartSpyInteractionResponse {
  targetFactionId: string;
  interactionId: string;
  started: boolean;
  inputSelectionRequired: boolean;
  playerGold: number;
  interactionName: string;
  inputSelectionPrompt: string;
  inputRequirements: BridgeFactionInteractionInputRequirement[];
  factionCandidates: BridgeFactionInteractionFactionCandidate[];
  message: string;
}

export interface SteamWorkshopItemDto {
  publishedFileId: string;
  title: string;
  description: string;
  previewUrl: string;
  categories: string[];
  ownerSteamId: string;
  createdTimestamp: number;
  updatedTimestamp: number;
  votesUp: number;
  votesDown: number;
  score: number;
  subscribed: boolean;
  installed: boolean;
  needsUpdate: boolean;
  downloading: boolean;
  downloadPending: boolean;
  installedModId: string;
  installedFolder: string;
  downloadBytes: number;
  downloadTotalBytes: number;
}

export interface SteamWorkshopItemOperationResponse {
  started: boolean;
  publishedFileId: string;
  state: string;
  error: string;
  item: SteamWorkshopItemDto;
}

export interface BrowseSteamWorkshopRequest {
  searchText: string;
  page: number;
  category: string;
  subscribedOnly: boolean;
}

export interface BrowseSteamWorkshopResponse {
  started: boolean;
  queryInProgress: boolean;
  subscribedOnly: boolean;
  error: string;
  searchText: string;
  category: string;
  categories: string[];
  page: number;
  totalResults: number;
  items: SteamWorkshopItemDto[];
}

export interface SteamWorkshopItemOperationRequest {
  publishedFileId: string;
}

export interface TogglePauseResponse {
  isPaused: boolean;
}

export interface TogglePinRequest {
  itemType: string;
  itemId: string;
}

export interface TogglePinResponse {
  pinned: boolean;
}

export interface TutorialSpotlightRequest {
  command: string;
  eventId: string;
  direction: number;
}

export interface TutorialSpotlightResponse {
  isVisible: boolean;
  eventId: string;
  target: string;
  targetDetail: string;
  title: string;
  body: string;
  currentPage: number;
  totalPages: number;
  canGoBack: boolean;
  canGoForward: boolean;
  isBuildingTarget: boolean;
  isUnitTarget: boolean;
  requiredUnitCount: number;
}

export interface UnqueueBuildQueueItemRequest {
  settlementId: string;
  queueIndex: number;
}

export interface UnqueueSettlementBuildingRequest {
  settlementId: string;
  queueIndex: number;
}

export interface UploadModToWorkshopRequest {
  modId: string;
}

export interface UploadModToWorkshopResponse {
  started: boolean;
  modId: string;
  state: string;
  error: string;
  publishedFileId: string;
  needsLegalAgreement: boolean;
  url: string;
}

export interface VictoryConditionDomainProgressInfo {
  name: string;
  controlledSettlements: number;
  totalSettlements: number;
  bMet: boolean;
}

export interface VictoryConditionInfo {
  kind: string;
  label: string;
  summaryText: string;
  domainProgress: VictoryConditionDomainProgressInfo[];
  progress: number;
  detailText: string;
  bMet: boolean;
}

export interface CampaignVictoryTierDefinition {
  id: string;
  name: string;
  iconPath: string;
  outcomeTitle: string;
  outcomeSubtitle: string;
  outcomeDescription: string;
  conditions: VictoryConditionInfo[];
}

export interface WarningEventsRequest {
  command: string;
  key: string;
  targetIndex: number;
}

export interface WarningEventPayload {
  id: string;
  title: string;
  description: string;
  severity: string;
  iconKey: string;
  targetCount: number;
  screenToOpen: string;
  screenTab: string;
  powerBlocId: string;
  targetLabels: string[];
}

export interface WarningRemovedPayload {
  id: string;
}

export interface WebUIDisplaySegment {
  text: string;
  tone: string;
  conceptId: string;
  linkType: string;
  linkId: string;
  isStrong: boolean;
}

export interface WebUIDisplayLine {
  kind: string;
  tone: string;
  conceptId: string;
  segments: WebUIDisplaySegment[];
}

export interface ZoomToRequest {
  itemType: string;
  itemId: string;
}

export interface ZoomToResponse {
  zoomed: boolean;
}

export interface BridgeActions {
  'game.achievement_events': { request: void; response: AchievementEventStatusResponse };
  'game.adjust_subject_tax_rate': { request: AdjustSubjectTaxRateRequest; response: void };
  'game.advance_religion_conversion': { request: void; response: ReligionConversionActionResponse };
  'game.apply_formation_template': { request: ApplyFormationTemplateRequest; response: ApplyFormationTemplateResponse };
  'game.apply_settings': { request: ApplySettingsRequest; response: ApplySettingsResponse };
  'game.appoint_agent': { request: AppointAgentRequest; response: AppointAgentResponse };
  'game.appoint_bishop': { request: AppointBishopRequest; response: AppointBishopResponse };
  'game.appoint_region_governor': { request: AppointRegionGovernorRequest; response: AppointRegionGovernorResponse };
  'game.appoint_to_court_position': { request: AppointToCourtPositionRequest; response: AppointToCourtPositionResponse };
  'game.break_treaty': { request: BreakTreatyRequest; response: BreakTreatyResponse };
  'game.browse_steam_workshop': { request: BrowseSteamWorkshopRequest; response: BrowseSteamWorkshopResponse };
  'game.building_placement': { request: BuildingPlacementRequest; response: BuildingPlacementResponse };
  'game.buy_resource': { request: TradeEconomyResourceRequest; response: void };
  'game.cancel_bloc_interaction': { request: CancelBlocInteractionRequest; response: CancelBlocInteractionResponse };
  'game.cancel_faction_interaction': { request: CancelFactionInteractionRequest; response: CancelFactionInteractionResponse };
  'game.cancel_person_interaction': { request: CancelPersonInteractionRequest; response: CancelPersonInteractionResponse };
  'game.cancel_religion_conversion': { request: void; response: ReligionConversionActionResponse };
  'game.cancel_settlement_interaction': { request: CancelSettlementInteractionRequest; response: CancelSettlementInteractionResponse };
  'game.cancel_spy_interaction': { request: CancelSpyInteractionRequest; response: CancelSpyInteractionResponse };
  'game.choose_event_option': { request: ChooseEventOptionRequest; response: ChooseEventOptionResponse };
  'game.clear_military_selection': { request: void; response: void };
  'game.complete_initial_setup': { request: void; response: CompleteInitialSetupResponse };
  'game.continue': { request: void; response: ContinueGameResponse };
  'game.create_province_from_candidate': { request: CreateProvinceFromCandidateRequest; response: void };
  'game.delete_formation_template': { request: DeleteFormationTemplateRequest; response: DeleteFormationTemplateResponse };
  'game.delete_save': { request: DeleteSaveRequest; response: DeleteSaveResponse };
  'game.demolish_settlement_building': { request: DemolishSettlementBuildingRequest; response: void };
  'game.demote_military_command': { request: DemoteMilitaryCommandRequest; response: void };
  'game.diplomatic_notification_events': { request: DiplomaticNotificationEventsRequest; response: void };
  'game.disband_military': { request: DisbandMilitaryRequest; response: void };
  'game.disembark_military': { request: MilitaryTargetingRequest; response: void };
  'game.dismiss_campaign_outcome': { request: void; response: void };
  'game.downgrade_settlement_building': { request: DowngradeSettlementBuildingRequest; response: void };
  'game.download_steam_workshop_item': { request: SteamWorkshopItemOperationRequest; response: SteamWorkshopItemOperationResponse };
  'game.duplicate_military_formation_template': { request: DuplicateMilitaryFormationTemplateRequest; response: DuplicateMilitaryFormationTemplateResponse };
  'game.enter_court_appointment_contest': { request: EnterCourtAppointmentContestRequest; response: EnterCourtAppointmentContestResponse };
  'game.form_personal_power_bloc': { request: void; response: FormPersonalPowerBlocResponse };
  'game.generate_formation_template_name': { request: GenerateFormationTemplateNameRequest; response: GenerateFormationTemplateNameResponse };
  'game.get_achievements': { request: void; response: GetAchievementsResponse };
  'game.get_agent_candidates': { request: GetAgentCandidatesRequest; response: GetAgentCandidatesResponse };
  'game.get_app_mode': { request: void; response: GetAppModeResponse };
  'game.get_battle_data': { request: GetBattleDataRequest; response: GetBattleDataResponse };
  'game.get_battle_frame': { request: GetBattleFrameRequest; response: GetBattleFrameResponse };
  'game.get_bishop_candidates': { request: GetBishopCandidatesRequest; response: GetBishopCandidatesResponse };
  'game.get_bloc_interactions': { request: GetBlocInteractionsRequest; response: GetBlocInteractionsResponse };
  'game.get_build_queue': { request: GetBuildQueueRequest; response: GetBuildQueueResponse };
  'game.get_bureaucratic_throughput': { request: void; response: GetBureaucraticThroughputResponse };
  'game.get_character_list': { request: GetCharacterListRequest; response: GetCharacterListResponse };
  'game.get_content_pack_webui_manifest': { request: void; response: GetContentPackWebUIManifestResponse };
  'game.get_convoy_glance_filters': { request: void; response: GetConvoyGlanceFiltersResponse };
  'game.get_court_appointment_contests': { request: void; response: GetCourtAppointmentContestsResponse };
  'game.get_court_candidates': { request: GetCourtCandidatesRequest; response: GetCourtCandidatesResponse };
  'game.get_court_positions': { request: void; response: GetCourtPositionsResponse };
  'game.get_courtier_types': { request: GetCourtierTypesRequest; response: GetCourtierTypesResponse };
  'game.get_current_event': { request: void; response: GetCurrentEventResponse };
  'game.get_dioceses': { request: GetDiocesesRequest; response: GetDiocesesResponse };
  'game.get_diplomacy_overview': { request: GetDiplomacyOverviewRequest; response: GetDiplomacyOverviewResponse };
  'game.get_diplomatic_negotiation_preview': { request: GetDiplomaticNegotiationPreviewRequest; response: GetDiplomaticNegotiationPreviewResponse };
  'game.get_diplomatic_negotiation_state': { request: GetDiplomaticNegotiationStateRequest; response: GetDiplomaticNegotiationStateResponse };
  'game.get_economy_overview': { request: GetEconomyOverviewRequest; response: GetEconomyOverviewResponse };
  'game.get_economy_resource_details': { request: GetEconomyResourceDetailsRequest; response: GetEconomyResourceDetailsResponse };
  'game.get_encyclopedia_entries': { request: void; response: GetEncyclopediaEntriesResponse };
  'game.get_faction_daily_data': { request: GetFactionDailyDataRequest; response: GetFactionDailyDataResponse };
  'game.get_faction_data': { request: GetFactionDataRequest; response: GetFactionDataResponse };
  'game.get_faction_interactions': { request: GetFactionInteractionsRequest; response: GetFactionInteractionsResponse };
  'game.get_family_tree': { request: GetFamilyTreeRequest; response: GetFamilyTreeResponse };
  'game.get_formation_template_catalogue': { request: void; response: GetFormationTemplateCatalogueResponse };
  'game.get_formation_templates': { request: void; response: GetFormationTemplatesResponse };
  'game.get_game_state': { request: void; response: GetGameStateResponse };
  'game.get_game_version': { request: void; response: GetGameVersionResponse };
  'game.get_geographic_summary': { request: GetGeographicSummaryRequest; response: GetGeographicSummaryResponse };
  'game.get_heir_candidates': { request: GetHeirCandidatesRequest; response: GetHeirCandidatesResponse };
  'game.get_income_breakdown': { request: void; response: GetIncomeBreakdownResponse };
  'game.get_initial_setup': { request: void; response: GetInitialSetupResponse };
  'game.get_languages': { request: void; response: GetLanguagesResponse };
  'game.get_ledger_overview': { request: GetLedgerOverviewRequest; response: GetLedgerOverviewResponse };
  'game.get_map_mode_filters': { request: void; response: GetMapModeFiltersResponse };
  'game.get_map_modes': { request: void; response: GetMapModesResponse };
  'game.get_military_commander_candidates': { request: GetMilitaryCommanderCandidatesRequest; response: GetMilitaryCommanderCandidatesResponse };
  'game.get_military_data': { request: GetMilitaryDataRequest; response: GetMilitaryDataResponse };
  'game.get_military_overview': { request: void; response: GetMilitaryOverviewResponse };
  'game.get_new_game_map_faction_geometry': { request: GetNewGameMapFactionGeometryRequest; response: GetNewGameMapFactionGeometryResponse };
  'game.get_new_game_map_faction_selection': { request: GetNewGameMapFactionSelectionRequest; response: GetNewGameMapFactionSelectionResponse };
  'game.get_peace_negotiation_preview': { request: GetPeaceNegotiationPreviewRequest; response: GetPeaceNegotiationPreviewResponse };
  'game.get_peace_negotiation_state': { request: GetPeaceNegotiationStateRequest; response: GetPeaceNegotiationStateResponse };
  'game.get_person_data': { request: GetPersonDataRequest; response: GetPersonDataResponse };
  'game.get_person_interaction_options': { request: GetPersonInteractionOptionsRequest; response: GetPersonInteractionOptionsResponse };
  'game.get_person_interactions': { request: GetPersonInteractionsRequest; response: GetPersonInteractionsResponse };
  'game.get_person_quick_interactions': { request: GetPersonQuickInteractionsRequest; response: GetPersonInteractionsResponse };
  'game.get_pinned_items': { request: void; response: GetPinnedItemsResponse };
  'game.get_player_faction': { request: void; response: GetPlayerFactionResponse };
  'game.get_portrait_mode': { request: void; response: GetPortraitModeResponse };
  'game.get_power_bloc_detail': { request: GetPowerBlocDetailRequest; response: GetPowerBlocDetailResponse };
  'game.get_power_blocs': { request: void; response: GetPowerBlocsResponse };
  'game.get_province_mode_overview': { request: void; response: GetProvinceModeOverviewResponse };
  'game.get_province_tooltip': { request: void; response: GetProvinceTooltipResponse };
  'game.get_region_governor_candidates': { request: GetRegionGovernorCandidatesRequest; response: GetRegionGovernorCandidatesResponse };
  'game.get_religion_conversion': { request: void; response: GetReligionConversionResponse };
  'game.get_resources': { request: void; response: GetResourcesResponse };
  'game.get_selected_militaries': { request: void; response: GetSelectedMilitariesResponse };
  'game.get_settings': { request: void; response: GetSettingsResponse };
  'game.get_settlement_buildings': { request: GetSettlementBuildingsRequest; response: GetSettlementBuildingsResponse };
  'game.get_settlement_data': { request: GetSettlementDataRequest; response: GetSettlementDataResponse };
  'game.get_settlement_interactions': { request: GetSettlementInteractionsRequest; response: GetSettlementInteractionsResponse };
  'game.get_settlement_siege_data': { request: GetSettlementSiegeDataRequest; response: GetSettlementSiegeDataResponse };
  'game.get_spy_interactions': { request: GetSpyInteractionsRequest; response: GetSpyInteractionsResponse };
  'game.get_tutorial_campaign_state': { request: void; response: GetTutorialCampaignStateResponse };
  'game.get_tutorial_progress': { request: void; response: GetTutorialProgressResponse };
  'game.get_victory_conditions': { request: void; response: GetVictoryConditionsResponse };
  'game.get_warnings': { request: void; response: GetWarningsResponse };
  'game.get_world_glance_tooltip': { request: GetWorldGlanceTooltipRequest; response: GetWorldGlanceTooltipResponse };
  'game.get_world_glances': { request: void; response: GetWorldGlancesResponse };
  'game.governor_assignment': { request: GovernorAssignmentRequest; response: GovernorAssignmentResponse };
  'game.handle_world_glance_hover': { request: HandleWorldGlanceHoverRequest; response: void };
  'game.handle_world_glance_input': { request: HandleWorldGlanceInputRequest; response: HandleWorldGlanceInputResponse };
  'game.hint_events': { request: HintEventsRequest; response: HintEventsResponse };
  'game.list_mods': { request: void; response: ListModsResponse };
  'game.list_new_game_maps': { request: void; response: ListNewGameMapsResponse };
  'game.list_saves': { request: void; response: ListSavesResponse };
  'game.load_save': { request: LoadSaveRequest; response: LoadSaveResponse };
  'game.loading_screen': { request: void; response: LoadingScreenResponse };
  'game.navigate_settlement': { request: NavigateSettlementRequest; response: NavigateSettlementResponse };
  'game.notification_events': { request: NotificationEventsRequest; response: void };
  'game.perform_siege_command': { request: PerformSiegeCommandRequest; response: PerformSiegeCommandResponse };
  'game.pick_new_game_map_faction': { request: PickNewGameMapFactionRequest; response: PickNewGameMapFactionResponse };
  'game.portrait_invalidated': { request: void; response: PortraitInvalidatedEventPayload };
  'game.portrait_ready': { request: void; response: PortraitReadyEventPayload };
  'game.promote_courtier': { request: PromoteCourtierRequest; response: PromoteCourtierResponse };
  'game.promote_military_command': { request: PromoteMilitaryCommandRequest; response: void };
  'game.province_emperor_takeover': { request: ProvinceEmperorTakeoverRequest; response: ProvinceEmperorTakeoverResponse };
  'game.queue_settlement_building': { request: QueueSettlementBuildingRequest; response: void };
  'game.quit': { request: void; response: void };
  'game.randomise_character_creator': { request: RandomiseCharacterCreatorRequest; response: RandomiseCharacterCreatorResponse };
  'game.rebind_action_key': { request: RebindActionKeyRequest; response: RebindActionKeyResponse };
  'game.recruit_character_for_role': { request: RecruitCharacterForRoleRequest; response: RecruitCharacterForRoleResponse };
  'game.rename_settlement': { request: RenameSettlementRequest; response: RenameSettlementResponse };
  'game.render_character_creator_preview': { request: RenderCharacterCreatorPreviewRequest; response: void };
  'game.reorder_settlement_building': { request: ReorderSettlementBuildingRequest; response: void };
  'game.replace_military_commander': { request: ReplaceMilitaryCommanderRequest; response: void };
  'game.replenish_military': { request: ReplenishMilitaryRequest; response: void };
  'game.request_battle_retreat': { request: RequestBattleRetreatRequest; response: RequestBattleRetreatResponse };
  'game.request_portrait': { request: RequestPortraitRequest; response: RequestPortraitResponse };
  'game.reset_notification_mutes': { request: void; response: void };
  'game.reset_settings': { request: ResetSettingsRequest; response: GetSettingsResponse };
  'game.respond_to_province_recall': { request: RespondToProvinceRecallRequest; response: RespondToProvinceRecallResponse };
  'game.restart': { request: void; response: void };
  'game.return_to_main_menu': { request: void; response: void };
  'game.run_court_office_action': { request: RunCourtOfficeActionRequest; response: RunCourtOfficeActionResponse };
  'game.run_governor_mission_action': { request: RunGovernorMissionActionRequest; response: RunGovernorMissionActionResponse };
  'game.rush_bureaucratic_action': { request: RushBureaucraticActionRequest; response: RushBureaucraticActionResponse };
  'game.save_formation_template': { request: SaveFormationTemplateRequest; response: SaveFormationTemplateResponse };
  'game.save_game': { request: SaveGameRequest; response: SaveGameResponse };
  'game.select_military': { request: SelectMilitaryRequest; response: void };
  'game.sell_resource': { request: TradeEconomyResourceRequest; response: void };
  'game.set_auto_assign_clergy': { request: SetAutoAssignClergyRequest; response: void };
  'game.set_auto_assign_commands': { request: SetAutoAssignCommandsRequest; response: void };
  'game.set_auto_assign_court': { request: SetAutoAssignCourtRequest; response: void };
  'game.set_auto_assign_governors': { request: SetAutoAssignGovernorsRequest; response: void };
  'game.set_auto_replenish_formations': { request: SetAutoReplenishFormationsRequest; response: void };
  'game.set_battle_formation_order': { request: SetBattleFormationOrderRequest; response: SetBattleFormationOrderResponse };
  'game.set_battle_formation_stance': { request: SetBattleFormationStanceRequest; response: SetBattleFormationStanceResponse };
  'game.set_character_creator_camera_rotation': { request: SetCharacterCreatorCameraRotationRequest; response: void };
  'game.set_convoy_glance_filters': { request: SetConvoyGlanceFiltersRequest; response: void };
  'game.set_designated_heir': { request: SetDesignatedHeirRequest; response: SetDesignatedHeirResponse };
  'game.set_economy_auto_buy': { request: SetEconomyAutoBuyRequest; response: void };
  'game.set_faction_border_highlight': { request: SetFactionBorderHighlightRequest; response: void };
  'game.set_language': { request: SetLanguageRequest; response: void };
  'game.set_map_mode': { request: SetMapModeRequest; response: void };
  'game.set_map_mode_filters': { request: SetMapModeFiltersRequest; response: void };
  'game.set_military_auto_squash_rebels': { request: SetMilitaryAutoSquashRebelsRequest; response: void };
  'game.set_military_delegation': { request: SetMilitaryDelegationRequest; response: void };
  'game.set_military_doctrine': { request: SetMilitaryDoctrineRequest; response: void };
  'game.set_military_forced_march': { request: SetMilitaryForcedMarchRequest; response: void };
  'game.set_military_formation_template': { request: SetMilitaryFormationTemplateRequest; response: void };
  'game.set_military_parent': { request: SetMilitaryParentRequest; response: void };
  'game.set_mod_enabled': { request: SetModEnabledRequest; response: SetModEnabledResponse };
  'game.set_notification_muted': { request: SetNotificationMutedRequest; response: void };
  'game.set_power_bloc_membership': { request: SetPowerBlocMembershipRequest; response: SetPowerBlocMembershipResponse };
  'game.set_province_build_focus': { request: SetProvinceBuildFocusRequest; response: void };
  'game.set_resource_auto_sell': { request: SetResourceAutoSellRequest; response: void };
  'game.set_resource_priority': { request: SetResourcePriorityRequest; response: void };
  'game.set_settlement_capital': { request: SetSettlementCapitalRequest; response: SetSettlementCapitalResponse };
  'game.set_settlement_sidebar_ambient': { request: SetSettlementSidebarAmbientRequest; response: void };
  'game.set_speed': { request: SetSpeedRequest; response: void };
  'game.show_military_sidebar': { request: MilitaryTargetingRequest; response: void };
  'game.start_battle_action': { request: StartBattleActionRequest; response: StartBattleActionResponse };
  'game.start_bloc_interaction': { request: StartBlocInteractionRequest; response: StartBlocInteractionResponse };
  'game.start_faction_interaction': { request: StartFactionInteractionRequest; response: StartFactionInteractionResponse };
  'game.start_military_embark_targeting': { request: MilitaryTargetingRequest; response: void };
  'game.start_military_merge_targeting': { request: MilitaryTargetingRequest; response: void };
  'game.start_peace_settlement_selection': { request: StartPeaceSettlementSelectionRequest; response: StartPeaceSettlementSelectionResponse };
  'game.start_person_interaction': { request: StartPersonInteractionRequest; response: StartPersonInteractionResponse };
  'game.start_policy_adjustment': { request: StartPolicyAdjustmentRequest; response: StartPolicyAdjustmentResponse };
  'game.start_religion_conversion': { request: StartReligionConversionRequest; response: ReligionConversionActionResponse };
  'game.start_scenario_map': { request: StartScenarioMapRequest; response: void };
  'game.start_settlement_interaction': { request: StartSettlementInteractionRequest; response: StartSettlementInteractionResponse };
  'game.start_spy_interaction': { request: StartSpyInteractionRequest; response: StartSpyInteractionResponse };
  'game.submit_diplomatic_negotiation': { request: SubmitDiplomaticNegotiationRequest; response: SubmitDiplomaticNegotiationResponse };
  'game.submit_peace_negotiation': { request: SubmitPeaceNegotiationRequest; response: SubmitPeaceNegotiationResponse };
  'game.subscribe_steam_workshop_item': { request: SteamWorkshopItemOperationRequest; response: SteamWorkshopItemOperationResponse };
  'game.toggle_foederati_callup': { request: ToggleFoederatiCallupRequest; response: void };
  'game.toggle_pause': { request: void; response: TogglePauseResponse };
  'game.toggle_pin': { request: TogglePinRequest; response: TogglePinResponse };
  'game.tutorial_spotlight': { request: TutorialSpotlightRequest; response: TutorialSpotlightResponse };
  'game.ungarrison_military': { request: UngarrisonMilitaryRequest; response: void };
  'game.unqueue_build_queue_item': { request: UnqueueBuildQueueItemRequest; response: void };
  'game.unqueue_settlement_building': { request: UnqueueSettlementBuildingRequest; response: void };
  'game.unsubscribe_steam_workshop_item': { request: SteamWorkshopItemOperationRequest; response: SteamWorkshopItemOperationResponse };
  'game.upload_mod_to_workshop': { request: UploadModToWorkshopRequest; response: UploadModToWorkshopResponse };
  'game.warning_events': { request: WarningEventsRequest; response: void };
  'game.withdraw_battle_formation': { request: WithdrawBattleFormationRequest; response: WithdrawBattleFormationResponse };
  'game.zoom_to': { request: ZoomToRequest; response: ZoomToResponse };
  'ui.ally_call_dialog': { request: AllyCallDialogRequest; response: AllyCallDialogEvent };
  'ui.campaign_outcome_events': { request: void; response: void };
  'ui.courtier_promotion_event': { request: void; response: void };
  'ui.escape_pressed': { request: void; response: void };
  'ui.hide_current_screen': { request: void; response: void };
  'ui.hide_left_sidebar': { request: void; response: void };
  'ui.hide_right_sidebar': { request: void; response: void };
  'ui.hide_sidebars': { request: void; response: void };
  'ui.open_external_link': { request: OpenExternalLinkRequest; response: void };
  'ui.open_external_url': { request: OpenExternalUrlRequest; response: void };
  'ui.show_screen': { request: ShowScreenRequest; response: ShowScreenResponse };
  'ui.sidebar_event': { request: void; response: void };
}

type HasPayload<A extends keyof BridgeActions> =
  BridgeActions[A]['request'] extends void ? false : true;

export async function bridgeCall<A extends keyof BridgeActions>(
  action: A,
  ...args: HasPayload<A> extends true ? [BridgeActions[A]['request']] : []
): Promise<BridgeActions[A]['response']> {
  return await callRuntimeBridge({ action, payload: args[0] }) as BridgeActions[A]['response'];
}

type EventCallback<A extends keyof BridgeActions> =
  (data: BridgeActions[A]['response']) => void;

export function onBridgeEvent<A extends keyof BridgeActions>(
  action: A,
  callback: EventCallback<A>,
): () => void {
  const handler = (e: CustomEvent<BridgeActions[A]['response']>) => callback(e.detail);
  window.addEventListener(`bridge:${action}`, handler as EventListener);
  return () => window.removeEventListener(`bridge:${action}`, handler as EventListener);
}
