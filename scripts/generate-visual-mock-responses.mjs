import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';

const root = process.cwd();
const outputPath = path.resolve(
  root,
  '../Plugins/Runtime/FoaeCefUI/Source/FoaeCefUI/Private/Tests/Fixtures/visual-comparison/packaged-webui-mock-responses.json',
);

globalThis.window = {
  innerWidth: 1920,
  innerHeight: 1080,
};

function successResult(response, action) {
  if (!response || response.ok !== true) {
    throw new Error(`Mock action did not return a successful bridge response: ${action}`);
  }
  return response.result;
}

function handle(runtime, action, payload, emittedResponses) {
  const emit = (eventName, eventPayload) => {
    emittedResponses[eventName] = eventPayload;
  };
  return successResult(runtime.handle(action, payload, emit), action);
}

function baseCurrentEvent() {
  return {
    hasEvent: false,
    id: '',
    title: '',
    body: '',
    imageId: '',
    presentationStyle: 'standard',
    chosenOptionIndex: -1,
    options: [],
    regnalNameInput: { isRequired: false, label: '', value: '', randomButtonText: '', randomOptions: [], targetPersonId: '', targetFactionId: '', previousNameCounts: [] },
    personNameInput: { isRequired: false, label: '', value: '', randomButtonText: '', randomOptions: [], targetPersonId: '', targetFactionId: '' },
  };
}

function fixtureCurrentEvent() {
  return {
    hasEvent: true,
    id: 'fixture-court-pressure',
    title: 'A Court Divided',
    body: 'A faction of courtiers asks you to remove Marcia Vennor from Aurelion before her reforms weaken their patronage.',
    imageId: '',
    presentationStyle: 'standard',
    chosenOptionIndex: -1,
    options: [
      { text: 'Remove her from office', tooltip: 'Strip the governor of Aurelion.', objective: 'Satisfy the court faction', isLocked: false, effects: [] },
      { text: 'Refuse the petition', tooltip: 'Keep the current governor in place.', objective: 'Hold the line', isLocked: false, effects: [] },
    ],
    regnalNameInput: { isRequired: false, label: '', value: '', randomButtonText: '', randomOptions: [], targetPersonId: '', targetFactionId: '', previousNameCounts: [] },
    personNameInput: { isRequired: false, label: '', value: '', randomButtonText: '', randomOptions: [], targetPersonId: '', targetFactionId: '' },
  };
}

const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom' });
try {
  const { createMockBridgeRuntime, MOCK_IDS } = await server.ssrLoadModule('/src/dev/mockBridgeData.ts');
  const runtime = createMockBridgeRuntime(new URLSearchParams('mode=ingame'));
  const provinceRuntime = createMockBridgeRuntime(new URLSearchParams('mode=ingame&provinceMode=1'));

  const emittedResponses = {};
  const actions = {
    'game.loading_screen': { visible: false, progress: 0, background: '', tip: '' },
    'game.get_content_pack_webui_manifest': { manifestJson: '{"packs":[{"id":"test","rootPath":"test","styles":["noop.css"],"entries":[]}] }' },
    'game.get_languages': handle(runtime, 'game.get_languages', undefined, emittedResponses),
    'game.get_webui_text': handle(runtime, 'game.get_webui_text', undefined, emittedResponses),
    'game.get_map_modes': handle(runtime, 'game.get_map_modes', undefined, emittedResponses),
    'game.get_map_mode_filters': handle(runtime, 'game.get_map_mode_filters', undefined, emittedResponses),
    'game.get_convoy_glance_filters': handle(runtime, 'game.get_convoy_glance_filters', undefined, emittedResponses),
    'game.get_income_breakdown': handle(runtime, 'game.get_income_breakdown', undefined, emittedResponses),
    'game.get_bureaucratic_throughput': handle(runtime, 'game.get_bureaucratic_throughput', undefined, emittedResponses),
    'game.get_province_tooltip': handle(runtime, 'game.get_province_tooltip', undefined, emittedResponses),
    'game.get_geographic_summary': handle(runtime, 'game.get_geographic_summary', { key: 'Heartland', tier: 'region' }, emittedResponses),
    'game.hint_events': { hintKey: '', title: '', paragraphs: [], paragraphPages: [] },
    'game.get_bloc_interactions': handle(runtime, 'game.get_bloc_interactions', { blocId: MOCK_IDS.powerBloc }, emittedResponses),
    'game.get_person_data': handle(runtime, 'game.get_person_data', { personId: MOCK_IDS.character }, emittedResponses),
    'game.get_person_interactions': handle(runtime, 'game.get_person_interactions', { personId: MOCK_IDS.character }, emittedResponses),
    'game.get_settlement_data': handle(runtime, 'game.get_settlement_data', { settlementId: MOCK_IDS.settlement }, emittedResponses),
    'game.get_settlement_buildings': handle(runtime, 'game.get_settlement_buildings', { settlementId: MOCK_IDS.settlement }, emittedResponses),
    'game.get_settlement_interactions': handle(runtime, 'game.get_settlement_interactions', { settlementId: MOCK_IDS.settlement }, emittedResponses),
    'game.get_settlement_siege_data': {},
    'game.get_military_data': handle(runtime, 'game.get_military_data', { militaryId: MOCK_IDS.military }, emittedResponses),
    'game.get_military_overview': handle(runtime, 'game.get_military_overview', undefined, emittedResponses),
    'game.get_selected_militaries': handle(runtime, 'game.get_selected_militaries', undefined, emittedResponses),
    'game.get_military_commander_candidates': handle(runtime, 'game.get_military_commander_candidates', { militaryId: MOCK_IDS.military }, emittedResponses),
    'game.get_formation_templates': handle(runtime, 'game.get_formation_templates', undefined, emittedResponses),
    'game.get_game_state': handle(runtime, 'game.get_game_state', undefined, emittedResponses),
    'game.get_resources': handle(runtime, 'game.get_resources', undefined, emittedResponses),
    'game.get_player_faction': handle(runtime, 'game.get_player_faction', undefined, emittedResponses),
    'game.get_faction_data': handle(runtime, 'game.get_faction_data', { factionId: MOCK_IDS.playerFaction, scope: 'full' }, emittedResponses),
    'game.get_faction_interactions': handle(runtime, 'game.get_faction_interactions', { targetFactionId: MOCK_IDS.rivalFaction }, emittedResponses),
    'game.get_family_tree': handle(runtime, 'game.get_family_tree', { factionId: MOCK_IDS.playerFaction, scope: 'lineage' }, emittedResponses),
    'game.get_power_blocs': handle(runtime, 'game.get_power_blocs', undefined, emittedResponses),
    'game.get_economy_overview': handle(runtime, 'game.get_economy_overview', { scope: 'overview' }, emittedResponses),
    'game.get_diplomacy_overview': handle(runtime, 'game.get_diplomacy_overview', { scope: 'full' }, emittedResponses),
    'game.get_diplomatic_negotiation_state': {},
    'game.get_ledger_overview': handle(runtime, 'game.get_ledger_overview', { scope: 'full' }, emittedResponses),
    'game.get_character_list': handle(runtime, 'game.get_character_list', { factionId: MOCK_IDS.playerFaction }, emittedResponses),
    'game.get_build_queue': {},
    'game.get_religion_conversion': handle(runtime, 'game.get_religion_conversion', undefined, emittedResponses),
    'game.get_dioceses': handle(runtime, 'game.get_dioceses', { religionKey: 'RephsianPantheon' }, emittedResponses),
    'game.get_court_positions': handle(runtime, 'game.get_court_positions', undefined, emittedResponses),
    'game.get_court_appointment_contests': handle(runtime, 'game.get_court_appointment_contests', undefined, emittedResponses),
    'game.get_heir_candidates': handle(runtime, 'game.get_heir_candidates', { factionId: MOCK_IDS.playerFaction }, emittedResponses),
    'game.get_peace_negotiation_state': handle(runtime, 'game.get_peace_negotiation_state', { targetFactionId: MOCK_IDS.rivalFaction }, emittedResponses),
    'game.get_battle_data': handle(runtime, 'game.get_battle_data', { battleId: MOCK_IDS.battle }, emittedResponses),
    'game.get_battle_frame': {},
    'game.get_spy_interactions': handle(runtime, 'game.get_spy_interactions', { targetFactionId: MOCK_IDS.rivalFaction }, emittedResponses),
    'game.get_agent_candidates': handle(runtime, 'game.get_agent_candidates', { role: 'spy' }, emittedResponses),
    'game.get_court_candidates': handle(runtime, 'game.get_court_candidates', { positionKey: 'MasterOfSoldiers' }, emittedResponses),
    'game.get_bishop_candidates': handle(runtime, 'game.get_bishop_candidates', { religionKey: 'RephsianPantheon' }, emittedResponses),
    'game.get_region_governor_candidates': {},
    'game.get_province_mode_overview': handle(provinceRuntime, 'game.get_province_mode_overview', undefined, emittedResponses),
    'game.get_encyclopedia_entries': handle(runtime, 'game.get_encyclopedia_entries', undefined, emittedResponses),
    'game.get_pinned_items': handle(runtime, 'game.get_pinned_items', undefined, emittedResponses),
    'game.get_tutorial_progress': handle(runtime, 'game.get_tutorial_progress', undefined, emittedResponses),
    'game.tutorial_spotlight': handle(runtime, 'game.tutorial_spotlight', undefined, emittedResponses),
    'game.get_current_event': baseCurrentEvent(),
    'game.get_world_glances': handle(runtime, 'game.get_world_glances', undefined, emittedResponses),
    'game.get_warnings': handle(runtime, 'game.get_warnings', undefined, emittedResponses),
    'game.list_saves': handle(runtime, 'game.list_saves', undefined, emittedResponses),
    'game.list_new_game_maps': handle(runtime, 'game.list_new_game_maps', undefined, emittedResponses),
    'game.get_new_game_map_faction_selection': handle(runtime, 'game.get_new_game_map_faction_selection', { mapId: 'Campaign' }, emittedResponses),
    'game.list_mods': handle(runtime, 'game.list_mods', undefined, emittedResponses),
    'game.get_settings': handle(runtime, 'game.get_settings', undefined, emittedResponses),
    'game.get_victory_conditions': handle(runtime, 'game.get_victory_conditions', undefined, emittedResponses),
    'game.get_game_version': handle(runtime, 'game.get_game_version', undefined, emittedResponses),
  };

  for (const [eventName, eventPayload] of Object.entries(emittedResponses)) {
    if (!(eventName in actions)) {
      actions[eventName] = eventPayload;
    }
  }

  const provinceActions = {
    'game.get_player_faction': handle(provinceRuntime, 'game.get_player_faction', undefined, {}),
    'game.get_faction_data': handle(provinceRuntime, 'game.get_faction_data', { factionId: MOCK_IDS.playerFaction, scope: 'full' }, {}),
    'game.get_province_mode_overview': actions['game.get_province_mode_overview'],
  };

  // Fixtures want a quiet shell: the dev mock's tutorial panel and warning toasts
  // would otherwise appear in every ingame capture.
  actions['game.get_tutorial_progress'] = { isVisible: false, hasLiveObjectives: false, steps: [] };
  actions['game.get_warnings'] = { warnings: [] };
  actions['game.get_settlement_siege_data'] = { settlementId: MOCK_IDS.settlement, hasSiege: false };
  actions['game.get_build_queue'] = {
    items: [
      {
        id: 'aurelion-forum-0',
        settlementId: MOCK_IDS.settlement,
        settlementName: 'Aurelion',
        factionId: MOCK_IDS.playerFaction,
        factionName: 'Rephsian Dominion',
        isVassal: false,
        itemId: 'forum',
        assetKey: 'Forum',
        itemName: 'Forum',
        itemKind: 'building',
        itemKindLabel: 'Building',
        count: 1,
        firstQueueIndex: 0,
        cancelQueueIndex: 0,
        queueIndices: [0],
        hasActiveItem: true,
        state: 'active',
        statusLabel: 'Building',
        statusReason: '',
        goldCost: 420,
        populationCost: 0,
        resourceCost: [{ name: 'Timber', label: 'Timber', amount: 36 }],
        missingResources: [],
        durationDays: 120,
        remainingDays: 74,
        progressPercent: 38,
      },
      {
        id: 'namaris-docks-0',
        settlementId: MOCK_IDS.portSettlement,
        settlementName: 'Namaris',
        factionId: MOCK_IDS.playerFaction,
        factionName: 'Rephsian Dominion',
        isVassal: false,
        itemId: 'docks',
        assetKey: 'Harbour',
        itemName: 'Harbour Works',
        itemKind: 'building',
        itemKindLabel: 'Building',
        count: 1,
        firstQueueIndex: 0,
        cancelQueueIndex: 0,
        queueIndices: [0],
        hasActiveItem: false,
        state: 'awaiting_resources',
        statusLabel: 'Awaiting stone',
        statusReason: 'Needs 18 Stone.',
        goldCost: 360,
        populationCost: 0,
        resourceCost: [{ name: 'Stone', label: 'Stone', amount: 18 }],
        missingResources: [{ name: 'Stone', label: 'Stone', amount: 18 }],
        durationDays: 96,
        remainingDays: 96,
        progressPercent: 0,
      },
    ],
    totalItems: 2,
    activeItems: 1,
    awaitingResources: 1,
    settlementCount: 2,
    vassalItems: 0,
  };
  actions['game.get_diplomatic_negotiation_state'] = {
    found: true,
    targetFactionId: MOCK_IDS.rivalFaction,
    playerFaction: {
      id: MOCK_IDS.playerFaction,
      name: 'Rephsian Dominion',
      colour: '#7E2636',
      secondaryColour: '#C9A85A',
      cultureGroup: 'Rephsian',
      emblem: 'Rephsian_1',
    },
    targetFaction: {
      id: MOCK_IDS.rivalFaction,
      name: 'Aurestian League',
      colour: '#5D7F89',
      secondaryColour: '#B8A56F',
      cultureGroup: 'Aurestian',
      emblem: '',
    },
    diplomaticStatus: 'neutral',
    opinion: 18,
    proposals: [{
      proposalId: 'offer-trade',
      type: 'Trade',
      side: 'offer',
      label: 'Trade agreement',
      description: 'Open market rights between both courts.',
      tributeAmount: 0,
      durationDays: 336,
      resourceName: '',
      resourceLabel: '',
      resourceAmount: 0,
      vassalageSubtype: '',
      value: 24,
    }],
    availableOffers: [{
      optionId: 'offer-trade',
      type: 'Trade',
      side: 'offer',
      label: 'Trade agreement',
      description: 'Offer market access for one year.',
      defaultTributeAmount: 0,
      defaultDurationDays: 336,
      defaultResourceName: '',
      defaultResourceLabel: '',
      defaultResourceAmount: 0,
      defaultVassalageSubtype: '',
      isSelected: true,
    }],
    availableRequests: [],
    ourResources: [{ name: 'Grain', label: 'Grain', amount: 1285 }],
    theirResources: [{ name: 'Timber', label: 'Timber', amount: 524 }],
    preview: {
      acceptanceScore: 62,
      verdict: 'likely',
      verdictLabel: 'Likely to accept',
      canSubmit: true,
      blockedReason: '',
      breakdown: '+24 trade value, +18 opinion, +20 diplomatic room',
    },
    emptyReason: '',
  };
  actions['game.get_battle_frame'] = { found: true, id: MOCK_IDS.battle, formations: [] };
  actions['game.get_region_governor_candidates'] = {
    candidates: [{
      id: MOCK_IDS.governor,
      name: 'Marcia Vennor',
      title: 'Governor of Aurelion',
      portrait: '',
      portraitLayers: { background: '', backHeadgear: '', portrait: '', faceMask: '', frontHeadgear: '' },
      age: 42,
      activity: 'Governing Aurelion',
      tactics: 4,
      authority: 7,
      cunning: 5,
      governance: 9,
      loyalty: 71,
      constitution: 5,
      fame: 120,
      currentRegionCount: 1,
      maxRegionCount: 3,
      isCurrentGovernor: true,
      traits: [{ id: 'administrator', name: 'Administrator', description: 'Keeps records and tax rolls in order.', isPositive: true }],
    }],
  };

  const catalogue = {
    generatedFrom: 'WebUI/src/dev/mockBridgeData.ts',
    actions,
    provinceActions,
    eventActions: {
      'game.get_current_event': fixtureCurrentEvent(),
    },
    nullActions: [
      'game.set_faction_border_highlight',
      'ui.escape_pressed',
      'game.notification_events',
      'game.diplomatic_notification_events',
      'game.warning_events',
      'game.set_speed',
      'game.set_map_mode',
      'ui.show_screen',
      'ui.open_external_link',
      'game.continue',
      'game.quit',
      'game.restart',
      'game.start_scenario_map',
      'game.start_bloc_interaction',
      'game.cancel_bloc_interaction',
      'game.handle_world_glance_input',
      'game.toggle_pin',
      'game.set_notification_muted',
      'game.apply_settings',
      'game.reset_settings',
      'game.set_settlement_sidebar_ambient',
      'game.set_power_bloc_membership',
      'game.form_personal_power_bloc',
      'game.choose_event_option',
    ],
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(catalogue, null, 2)}\n`);
  console.log(outputPath);
} finally {
  await server.close();
}
