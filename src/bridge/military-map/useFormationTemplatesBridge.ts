import { bridgeCall } from '../../bridge-types.generated.ts';
import type {
  ApplyFormationTemplateResponse,
  DeleteFormationTemplateResponse,
  GenerateFormationTemplateNameResponse,
  GetFormationTemplateCatalogueResponse,
  GetFormationTemplatesResponse,
  SaveFormationTemplateRequest,
  SaveFormationTemplateResponse,
  SaveFormationTemplateUnitRequest,
} from '../../bridge-types.generated.ts';
import { clearBridgeQueryCache, useBridgeQuery } from '../core/useBridgeQuery';

let formationTemplatesCache: GetFormationTemplatesResponse | null = null;
let formationTemplateCatalogueCache: GetFormationTemplateCatalogueResponse | null = null;
let goldPatchListenerInstalled = false;
let dynamicPatchListenerInstalled = false;

interface FormationTemplateGoldChangedEvent {
  playerGold: number;
  insufficientGoldReason: string;
  noSettlementsCanBuildReason: string;
}

interface FormationTemplatesDynamicChangedEvent {
  activeBuildTemplateId: string;
  playerGold: number;
  pendingFormations: GetFormationTemplatesResponse['pendingFormations'];
  templates: Array<Pick<GetFormationTemplatesResponse['templates'][number],
    'id' | 'canApply' | 'applyReason' | 'isActiveBuildTemplate' | 'assignedForces'>>;
}

function ensureGoldPatchListener(): void {
  if (goldPatchListenerInstalled) return;
  goldPatchListenerInstalled = true;
  window.addEventListener('bridge:game.formation_template_gold_changed', (event: Event) => {
    const detail = (event as CustomEvent<unknown>).detail as Partial<FormationTemplateGoldChangedEvent> | null;
    if (!detail || typeof detail.playerGold !== 'number' || !formationTemplatesCache) return;
    const playerGold = detail.playerGold;

    formationTemplatesCache = {
      ...formationTemplatesCache,
      playerGold,
      templates: formationTemplatesCache.templates.map((template) => {
        if (template.units.length === 0) return template;
        const canProduceAnyUnit = template.units.some(unit => unit.availableSettlementCount > 0);
        if (playerGold < template.creationCost) {
          return {
            ...template,
            canApply: false,
            applyReason: typeof detail.insufficientGoldReason === 'string'
              ? detail.insufficientGoldReason
              : template.applyReason,
          };
        }
        return {
          ...template,
          canApply: canProduceAnyUnit,
          applyReason: canProduceAnyUnit
            ? ''
            : typeof detail.noSettlementsCanBuildReason === 'string'
              ? detail.noSettlementsCanBuildReason
              : template.applyReason,
        };
      }),
    };
    dispatchBridgeResponse('game.get_formation_templates', formationTemplatesCache);
  });
}

function ensureDynamicPatchListener(): void {
  if (dynamicPatchListenerInstalled) return;
  dynamicPatchListenerInstalled = true;
  window.addEventListener('bridge:game.formation_templates_dynamic_changed', (event: Event) => {
    const detail = (event as CustomEvent<unknown>).detail as Partial<FormationTemplatesDynamicChangedEvent> | null;
    if (!detail || !formationTemplatesCache || !Array.isArray(detail.templates)) return;

    const dynamicById = new Map(detail.templates.map(template => [template.id, template]));
    formationTemplatesCache = {
      ...formationTemplatesCache,
      activeBuildTemplateId: typeof detail.activeBuildTemplateId === 'string'
        ? detail.activeBuildTemplateId
        : formationTemplatesCache.activeBuildTemplateId,
      playerGold: typeof detail.playerGold === 'number'
        ? detail.playerGold
        : formationTemplatesCache.playerGold,
      pendingFormations: Array.isArray(detail.pendingFormations)
        ? detail.pendingFormations
        : formationTemplatesCache.pendingFormations,
      templates: formationTemplatesCache.templates.map((template) => {
        const dynamic = dynamicById.get(template.id);
        return dynamic ? { ...template, ...dynamic } : template;
      }),
    };
    dispatchBridgeResponse('game.get_formation_templates', formationTemplatesCache);
  });
}

export function clearFormationTemplateCache(templateId: string | undefined): void {
  clearBridgeQueryCache('game.get_formation_templates');
  if (!templateId || !formationTemplatesCache) return;
  formationTemplatesCache = {
    ...formationTemplatesCache,
    templates: formationTemplatesCache.templates.filter((template) => template.id !== templateId),
    activeBuildTemplateId: formationTemplatesCache.activeBuildTemplateId === templateId
      ? ''
      : formationTemplatesCache.activeBuildTemplateId,
  };
}

export function clearFormationTemplateCaches(): void {
  formationTemplatesCache = null;
  clearBridgeQueryCache('game.get_formation_templates');
}

export function clearFormationTemplateCatalogueCache(): void {
  formationTemplateCatalogueCache = null;
  clearBridgeQueryCache('game.get_formation_template_catalogue');
}

function dispatchBridgeResponse(action: string, detail: unknown): void {
  window.dispatchEvent(new CustomEvent(`bridge:${action}`, { detail }));
}

export function useFormationTemplatesBridge(fetchTemplates = true): GetFormationTemplatesResponse | null {
  ensureGoldPatchListener();
  ensureDynamicPatchListener();
  const live = useBridgeQuery({
    action: 'game.get_formation_templates',
    payload: fetchTemplates ? undefined : null,
    cacheResponse: true,
    map: (data) => {
      formationTemplatesCache = data;
      return data;
    },
  });

  return live ?? formationTemplatesCache;
}

export function useFormationTemplateCatalogueBridge(fetchCatalogue = true): GetFormationTemplateCatalogueResponse | null {
  const live = useBridgeQuery({
    action: 'game.get_formation_template_catalogue',
    payload: fetchCatalogue ? undefined : null,
    map: (data) => {
      formationTemplateCatalogueCache = data;
      return data;
    },
  });

  return live ?? formationTemplateCatalogueCache;
}

export function saveFormationTemplateBridge(
  request: SaveFormationTemplateRequest,
): Promise<SaveFormationTemplateResponse> {
  return bridgeCall('game.save_formation_template', request).then(response => {
    clearFormationTemplateCaches();
    clearFormationTemplateCatalogueCache();
    return response;
  });
}

export function generateFormationTemplateNameBridge(
  type: string,
  units: SaveFormationTemplateUnitRequest[],
): Promise<GenerateFormationTemplateNameResponse> {
  return bridgeCall('game.generate_formation_template_name', { type, units });
}

export function deleteFormationTemplateBridge(templateId: string): Promise<DeleteFormationTemplateResponse> {
  return bridgeCall('game.delete_formation_template', { templateId }).then(response => {
    clearFormationTemplateCache(templateId);
    return response;
  });
}

export function applyFormationTemplateBridge(templateId: string, settlementId?: string): Promise<ApplyFormationTemplateResponse> {
  return bridgeCall('game.apply_formation_template', {
    templateId,
    settlementId: settlementId ?? '',
    cancelSelection: false,
    confirmSelection: false,
  }).then(response => {
    clearBridgeQueryCache('game.get_formation_templates');
    dispatchBridgeResponse('game.apply_formation_template', response);
    return response;
  });
}
