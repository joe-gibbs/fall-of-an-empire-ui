import { useLayoutEffect, useRef } from 'react';
import type { EconomyResourceRecipeDetail } from '../../../bridge-types.generated';
import { buildingPortrait } from '../../../bridge/settlements-economy/useSettlementBuildingsBridge';
import { useWebUIText } from '../../../localization/WebUITextContext';
import { WebkilnAssetPath } from '../../../utils/assets';
import { formatNumber } from '../../../utils/numberFormat';
import GameButton from '../../common/buttons/GameButton';

interface Props {
  recipe: EconomyResourceRecipeDetail;
  resourceId: string;
  expanded: boolean;
  onSelectResource: (id: string) => void;
  onSelectBuilding: () => void;
}

export default function ResourceRecipeDiagram({ recipe, resourceId, expanded, onSelectResource, onSelectBuilding }: Props) {
  const t = useWebUIText();
  const diagramRef = useRef<HTMLDivElement>(null);
  const connectorsRef = useRef<SVGSVGElement>(null);
  const unitOutput = recipe.outputs.find(output => output.id === resourceId)!;
  const quantity = (amount: number) => formatNumber(amount / unitOutput.amount, { maximumFractionDigits: 6 });

  useLayoutEffect(() => {
    const diagram = diagramRef.current;
    const svg = connectorsRef.current;
    if (!diagram || !svg) return;

    const building = diagram.querySelector<HTMLElement>('.erp-building')!;
    const inputs = Array.from(diagram.querySelectorAll<HTMLElement>('[data-recipe-input]'));
    const outputs = Array.from(diagram.querySelectorAll<HTMLElement>('[data-recipe-output]'));
    const groups = Array.from(svg.querySelectorAll('g'));

    const updateConnectors = () => {
      const bounds = svg.getBoundingClientRect();
      if (bounds.width === 0 || bounds.height === 0) return;
      svg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
      const buildingBounds = building.getBoundingClientRect();
      const links = [
        ...inputs.map(node => [node.getBoundingClientRect(), buildingBounds]),
        ...outputs.map(node => [buildingBounds, node.getBoundingClientRect()]),
      ];
      links.forEach(([start, end], index) => {
        const x1 = start.right - bounds.left;
        const y1 = start.top + start.height / 2 - bounds.top;
        const x2 = end.left - bounds.left;
        const y2 = end.top + end.height / 2 - bounds.top;
        const bend = (x2 - x1) * 0.5;
        groups[index].querySelector('path')!.setAttribute('d', `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`);
        const endpoint = groups[index].querySelector('circle')!;
        endpoint.setAttribute('cx', String(x2));
        endpoint.setAttribute('cy', String(y2));
      });
    };

    updateConnectors();
    const observer = new ResizeObserver(updateConnectors);
    [diagram, building, ...inputs, ...outputs].forEach(node => observer.observe(node));
    return () => observer.disconnect();
  }, [recipe]);

  return (
    <div className="erp-recipe" ref={diagramRef}>
      <svg ref={connectorsRef} className="erp-connectors" aria-hidden="true">
        {[...recipe.inputs, ...recipe.outputs].map((resource, index) => (
          <g key={`${resource.id}:${index}`}>
            <path className="erp-connector" />
            <circle className="erp-connector-endpoint" r="2.5" />
          </g>
        ))}
      </svg>
      <div className="erp-recipe__resources">
        {recipe.inputs.map(input => (
          <div className="erp-recipe__node" data-recipe-input key={input.id}>
            <GameButton
              variant="outline"
              className={`erp-button erp-resource${input.id === resourceId ? ' erp-resource--selected' : ''}`}
              icon={WebkilnAssetPath(`/assets/resources/${input.id}.png`)}
              onClick={() => onSelectResource(input.id)}
            >{t('Economy.RecipeQuantity', { Amount: quantity(input.amount), Resource: input.name })}</GameButton>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="btn--outline erp-button erp-building"
        aria-expanded={expanded}
        onClick={onSelectBuilding}
      >
        <img src={buildingPortrait(recipe.buildingAssetKey)} className="erp-building__image" alt="" draggable={false} />
        <span>{recipe.buildingName}</span>
      </button>
      <div className="erp-recipe__resources">
        {recipe.outputs.map(output => (
          <div className="erp-recipe__node" data-recipe-output key={output.id}>
            <GameButton
              variant="outline"
              className={`erp-button erp-resource${output.id === resourceId ? ' erp-resource--selected' : ''}`}
              icon={WebkilnAssetPath(`/assets/resources/${output.id}.png`)}
              onClick={() => onSelectResource(output.id)}
            >{t('Economy.RecipeQuantity', { Amount: quantity(output.amount), Resource: output.name })}</GameButton>
          </div>
        ))}
      </div>
    </div>
  );
}
