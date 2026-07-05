import { bridgeCall } from '../../bridge-types.generated.ts';
import type {
  ApplyFormationTemplateResponse,
  DeleteFormationTemplateResponse,
  GetFormationTemplatesResponse,
  SaveFormationTemplateRequest,
  SaveFormationTemplateResponse,
} from '../../bridge-types.generated.ts';
import { clearBridgeQueryCache, useBridgeQuery } from '../core/useBridgeQuery';

let formationTemplatesCache: GetFormationTemplatesResponse | null = null;

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

function dispatchBridgeResponse(action: string, detail: unknown): void {
  window.dispatchEvent(new CustomEvent(`bridge:${action}`, { detail }));
}

export function useFormationTemplatesBridge(): GetFormationTemplatesResponse | null {
  const live = useBridgeQuery({
    action: 'game.get_formation_templates',
    cacheResponse: true,
    map: (data) => {
      formationTemplatesCache = data;
      return data;
    },
  });

  return live ?? formationTemplatesCache;
}

export function saveFormationTemplateBridge(
  request: SaveFormationTemplateRequest,
): Promise<SaveFormationTemplateResponse> {
  return bridgeCall('game.save_formation_template', request).then(response => {
    clearFormationTemplateCaches();
    return response;
  });
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
