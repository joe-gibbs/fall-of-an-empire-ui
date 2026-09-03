import { memo, useMemo, useState } from 'react';
import type {
  EconomyOverviewResourceRow,
  EconomyOverviewResourceSource,
  EconomyResourceFlowDetail,
  EconomyResourceHistoryPoint,
  EconomyResourcePotentialUseDetail,
  EconomyResourceProducerDetail,
  GetEconomyOverviewResponse,
} from '../../../bridge-types.generated.ts';
import {
  buyEconomyResourceBridge,
  sellEconomyResourceBridge,
  setResourceAutoBuyBridge,
  setResourceAutoSellBridge,
  useEconomyResourceDetailsBridge,
} from '../../../bridge/settlements-economy/useEconomyOverviewBridge';
import { useWebUIText, type WebUITextFormatter } from '../../../localization/WebUITextContext';
import { formatNumber, formatResourceNumber, formatSignedResourceNumber } from '../../../utils/numberFormat';
import {
  noteModifierKeysFromEvent,
  stepAmountFromEvent,
  stepAmountFromMultiplier,
  useStepMultiplier,
} from '../../../utils/stepModifiers';
import { useResourceDetails } from '../../../context/ResourceDetailsContext';
import GameButton from '../../common/buttons/GameButton';
import NumberStepper from '../../common/forms/NumberStepper';
import Tooltip, { type TooltipContent, type TooltipLine } from '../../common/tooltips/Tooltip';
import './ResourceWorkspace.css';

const RESOURCE_CATEGORY_ORDER = ['food', 'strategic', 'rawmaterials', 'luxury'];
const FOOD_RESOURCE_IDS = ['grain', 'fish', 'meat', 'garum'];

interface ResourceWorkspaceProps {
  data: GetEconomyOverviewResponse | null;
}

interface ResourceFlowEntry {
  id: string;
  label: string;
  amount?: number;
  icon?: string;
  tooltip: TooltipContent;
  potential?: boolean;
}

function fmt(value: number | null | undefined): string {
  return formatResourceNumber(value);
}

function signed(value: number | null | undefined): string {
  return formatSignedResourceNumber(value);
}

function categoryLabel(category: string, t: WebUITextFormatter): string {
  const id = category.toLowerCase();
  if (id === 'food') return t('Economy.ResourceCategoryFood');
  if (id === 'strategic') return t('Economy.ResourceCategoryStrategic');
  if (id === 'luxury') return t('Economy.ResourceCategoryLuxury');
  if (id === 'rawmaterials') return t('Economy.ResourceCategoryRawMaterials');
  return category;
}

function resourceRunway(resource: EconomyOverviewResourceRow): number | null {
  if (resource.netPerMonth >= -0.0001) return null;
  return resource.amount / Math.abs(resource.netPerMonth);
}

function coverageTone(resource: EconomyOverviewResourceRow): 'empty' | 'critical' | 'warning' | 'healthy' {
  if (resource.amount <= 0.0001 && resource.netPerMonth < -0.0001) return 'empty';
  const months = resourceRunway(resource);
  if (months === null || months >= 12) return 'healthy';
  if (months < 3) return 'critical';
  return 'warning';
}

function coverageLabel(resource: EconomyOverviewResourceRow, t: WebUITextFormatter): string {
  if (resource.netPerMonth > 0.0001) return t('Economy.Growing');
  if (resource.netPerMonth >= -0.0001) return t('Economy.Stable');
  if (resource.amount <= 0.0001) return t('Economy.ShortNow');
  return t('Economy.MonthsRemaining', { Count: fmt(resourceRunway(resource)) });
}

function coverageWidth(resource: EconomyOverviewResourceRow): number {
  const months = resourceRunway(resource);
  if (months !== null) return Math.max(2, Math.min(100, months / 12 * 100));
  if (resource.stockpileCap <= 0) return resource.amount > 0 ? 100 : 0;
  return Math.max(resource.amount > 0 ? 2 : 0, Math.min(100, resource.amount / resource.stockpileCap * 100));
}

function monthlyValue(value: number, positive: boolean, t: WebUITextFormatter): string {
  return `${positive ? '+' : '-'}${fmt(Math.abs(value))}${t('Economy.PerMonth')}`;
}

function emptyBreakdownLine(label: string): TooltipLine {
  return { label, labelColor: 'var(--text-muted)' };
}

function producerSubTooltip(producer: EconomyResourceProducerDetail, t: WebUITextFormatter): TooltipContent {
  const lines: TooltipLine[] = [];
  if (producer.naturalAmount > 0.0001) {
    lines.push({
      label: t('Economy.NaturalProduction'),
      value: monthlyValue(producer.naturalAmount, true, t),
      valueColor: 'var(--green)',
    });
  }
  if (producer.processedAmount > 0.0001) {
    lines.push({
      label: t('Economy.Processing'),
      value: monthlyValue(producer.processedAmount, true, t),
      valueColor: 'var(--green)',
    });
  }
  if (producer.buildings.length > 0) {
    lines.push({ label: t('Economy.Buildings'), isHeader: true });
    lines.push(...producer.buildings.map(building => ({
      label: building.name,
      value: monthlyValue(building.value, true, t),
      valueColor: 'var(--green)',
    })));
  }
  if (producer.modifiers.length > 0) {
    lines.push({ label: t('Economy.Modifiers'), isHeader: true });
    lines.push(...producer.modifiers.map(modifier => ({
      label: modifier.name,
      value: `${signed(modifier.value)}%`,
      valueColor: modifier.value >= 0 ? 'var(--green)' : 'var(--red)',
    })));
  }
  return {
    title: producer.settlementName,
    subtitle: monthlyValue(producer.amount, true, t),
    lines,
  };
}

function producerBreakdownTooltip(
  title: string,
  total: number,
  producers: EconomyResourceProducerDetail[],
  t: WebUITextFormatter,
): TooltipContent {
  const lines: TooltipLine[] = producers.map(producer => ({
    label: producer.settlementName,
    value: monthlyValue(producer.amount, true, t),
    valueColor: 'var(--green)',
    subTooltip: producerSubTooltip(producer, t),
  }));
  return {
    title,
    subtitle: monthlyValue(total, true, t),
    lines: lines.length > 0 ? lines : [emptyBreakdownLine(t('Economy.NoProducers'))],
  };
}

function flowBreakdownTooltip(
  title: string,
  total: number,
  flows: EconomyResourceFlowDetail[],
  positive: boolean,
  t: WebUITextFormatter,
): TooltipContent {
  const colour = positive ? 'var(--green)' : 'var(--red)';
  const lines: TooltipLine[] = flows.map(flow => {
    const subLines: TooltipLine[] = [{
      label: t('Economy.TotalPerMonth'),
      value: monthlyValue(flow.amount, positive, t),
      valueColor: colour,
    }];
    if (flow.unitUsage.length > 0) {
      subLines.push({ label: t('Economy.UnitUsage'), isHeader: true });
      subLines.push(...flow.unitUsage.map(unit => ({
        label: t('Economy.UnitCount', { Name: unit.name, Count: unit.count }),
        value: monthlyValue(unit.amount, false, t),
        valueColor: 'var(--red)',
      })));
    }
    if (flow.breakdown.length > 0) {
      subLines.push({ label: t('Economy.Processing'), isHeader: true });
      subLines.push(...flow.breakdown.map(item => ({
        label: item.name,
        value: monthlyValue(item.value, false, t),
        valueColor: 'var(--red)',
      })));
    }
    return {
      label: flow.name,
      value: monthlyValue(flow.amount, positive, t),
      valueColor: colour,
      subTooltip: {
        title: flow.name,
        lines: subLines,
      },
    };
  });
  return {
    title,
    subtitle: monthlyValue(total, positive, t),
    lines: lines.length > 0
      ? lines
      : [emptyBreakdownLine(positive ? t('Economy.NoProducers') : t('Economy.NoConsumers'))],
  };
}

function potentialUsesTooltip(uses: EconomyResourcePotentialUseDetail[], t: WebUITextFormatter): TooltipContent {
  const processing = uses.filter(use => use.kind === 'processing');
  const military = uses.filter(use => use.kind === 'military');
  const population = uses.filter(use => use.kind === 'population');
  const lines: TooltipLine[] = [];
  if (processing.length > 0) {
    lines.push({ label: t('Economy.Processing'), isHeader: true });
    lines.push(...processing.map(use => ({ label: use.name })));
  }
  if (military.length > 0) {
    lines.push({ label: t('Economy.UsedByMilitary'), isHeader: true });
    lines.push(...military.map(use => ({ label: use.name })));
  }
  if (population.length > 0) {
    lines.push({ label: t('Economy.Population'), isHeader: true });
    lines.push(...population.map(use => ({ label: use.name })));
  }
  return { title: t('Economy.PotentialUses'), lines };
}

function storesBreakdownTooltip(
  amount: number,
  stockpiles: EconomyOverviewResourceSource[],
  t: WebUITextFormatter,
): TooltipContent {
  const lines: TooltipLine[] = stockpiles.map(stockpile => ({
    label: stockpile.name,
    value: fmt(stockpile.amount),
    valueColor: 'var(--gold-light)',
    subTooltip: {
      title: stockpile.name,
      subtitle: t('Economy.StoredAmount', { Amount: fmt(stockpile.amount) }),
    },
  }));
  return {
    title: t('Economy.Stores'),
    subtitle: t('Economy.StoredAmount', { Amount: fmt(amount) }),
    lines: lines.length > 0 ? lines : [emptyBreakdownLine(t('Economy.NoResourceStockpiles'))],
  };
}

function overviewFlowTooltip(
  title: string,
  total: number,
  flows: EconomyOverviewResourceSource[],
  positive: boolean,
  t: WebUITextFormatter,
): TooltipContent {
  const colour = positive ? 'var(--green)' : 'var(--red)';
  return {
    title,
    subtitle: monthlyValue(total, positive, t),
    lines: flows.length > 0
      ? flows.map(flow => ({
          label: flow.name,
          value: monthlyValue(flow.amount, positive, t),
          valueColor: colour,
          subTooltip: {
            title: flow.name,
            subtitle: monthlyValue(flow.amount, positive, t),
          },
        }))
      : [emptyBreakdownLine(positive ? t('Economy.NoProducers') : t('Economy.NoConsumers'))],
  };
}

function ResourceCard({
  resource,
  selected,
  onSelect,
}: {
  resource: EconomyOverviewResourceRow;
  selected: boolean;
  onSelect: () => void;
}) {
  const t = useWebUIText();
  const tone = coverageTone(resource);
  return (
    <button
      type="button"
      className={`erw-resource-card erw-resource-card--${tone}${selected ? ' erw-resource-card--selected' : ''}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className="erw-resource-card__heading">
        <img src={`/assets/resources/${resource.id}.png`} alt="" draggable={false} />
        <span>{resource.name}</span>
      </span>
      <span className="erw-resource-card__metrics">
        <strong>{fmt(resource.amount)}</strong>
        <b className={resource.netPerMonth < -0.0001 ? 'erw-negative' : resource.netPerMonth > 0.0001 ? 'erw-positive' : ''}>
          {signed(resource.netPerMonth)}{t('Economy.PerMonth')}
        </b>
      </span>
      <span className="erw-resource-card__coverage">{coverageLabel(resource, t)}</span>
      <span className="erw-reserve-track" aria-hidden="true">
        <span className={`erw-reserve-fill erw-reserve-fill--${tone}`} style={{ width: `${coverageWidth(resource)}%` }} />
      </span>
    </button>
  );
}

function FoodResourceGroup({
  food,
  ingredients,
  selectedId,
  onSelect,
}: {
  food: EconomyOverviewResourceRow;
  ingredients: EconomyOverviewResourceRow[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const t = useWebUIText();
  return (
    <div className="erw-food-group">
      <ResourceCard resource={food} selected={food.id === selectedId} onSelect={() => onSelect(food.id)} />
      <div className="erw-food-group__ingredients">
        {ingredients.map(ingredient => (
          <button
            type="button"
            className={`erw-food-ingredient${ingredient.id === selectedId ? ' erw-food-ingredient--selected' : ''}`}
            aria-pressed={ingredient.id === selectedId}
            onClick={() => onSelect(ingredient.id)}
            key={ingredient.id}
          >
            <span>
              <img src={`/assets/resources/${ingredient.id}.png`} alt="" draggable={false} />
              <b>{ingredient.name}</b>
            </span>
            <strong>{fmt(ingredient.amount)}</strong>
            <em className={ingredient.netPerMonth < -0.0001 ? 'erw-negative' : ingredient.netPerMonth > 0.0001 ? 'erw-positive' : ''}>
              {signed(ingredient.netPerMonth)}{t('Economy.PerMonth')}
            </em>
          </button>
        ))}
      </div>
    </div>
  );
}

function ResourceBoard({
  resources,
  selectedId,
  shortagesOnly,
  onToggleShortages,
  onSelect,
}: {
  resources: EconomyOverviewResourceRow[];
  selectedId: string;
  shortagesOnly: boolean;
  onToggleShortages: () => void;
  onSelect: (id: string) => void;
}) {
  const t = useWebUIText();
  const food = resources.find(resource => resource.aggregate && resource.category.toLowerCase() === 'food');
  const foodIngredients = resources
    .filter(resource => !resource.aggregate && FOOD_RESOURCE_IDS.includes(resource.id.toLowerCase()))
    .filter(resource => !shortagesOnly || resource.netPerMonth < -0.0001)
    .sort((left, right) => FOOD_RESOURCE_IDS.indexOf(left.id.toLowerCase()) - FOOD_RESOURCE_IDS.indexOf(right.id.toLowerCase()));
  const showFood = !!food && (!shortagesOnly || food.netPerMonth < -0.0001 || foodIngredients.length > 0);
  const visibleResources = resources.filter(resource => (
    !resource.aggregate
    && resource.category.toLowerCase() !== 'food'
    && !FOOD_RESOURCE_IDS.includes(resource.id.toLowerCase())
    && (!shortagesOnly || resource.netPerMonth < -0.0001)
  ));
  const extraCategories = [...new Set(visibleResources.map(resource => resource.category.toLowerCase()))]
    .filter(category => !RESOURCE_CATEGORY_ORDER.includes(category));
  const categories = [...RESOURCE_CATEGORY_ORDER.filter(category => category !== 'food'), ...extraCategories]
    .map(category => ({
      id: category,
      rows: visibleResources
        .filter(resource => resource.category.toLowerCase() === category)
        .sort((left, right) => left.name.localeCompare(right.name)),
    }))
    .filter(category => category.rows.length > 0);

  return (
    <section className="erw-board">
      <div className="erw-cover-legend">
        <strong>{t('Economy.ReserveCover')}</strong>
        <span><i className="erw-cover-key erw-cover-key--empty" />{t('Economy.CoverEmpty')}</span>
        <span><i className="erw-cover-key erw-cover-key--critical" />{t('Economy.CoverUnderThree')}</span>
        <span><i className="erw-cover-key erw-cover-key--warning" />{t('Economy.CoverThreeToTwelve')}</span>
        <span><i className="erw-cover-key erw-cover-key--healthy" />{t('Economy.CoverTwelvePlus')}</span>
        <button
          type="button"
          className={`erw-shortages-toggle${shortagesOnly ? ' erw-shortages-toggle--active' : ''}`}
          aria-pressed={shortagesOnly}
          onClick={onToggleShortages}
        >
          <i aria-hidden="true" />
          {t('Economy.ShortagesOnly')}
        </button>
      </div>
      <div className="erw-board-scroll erw-board-scroll__body">
        {!showFood && categories.length === 0 ? (
          <div className="erw-board-empty">{t('Economy.NoShortages')}</div>
        ) : <>
          {showFood && food && (
            <section className="erw-category">
              <h2>{categoryLabel('food', t)}</h2>
              <FoodResourceGroup
                food={food}
                ingredients={foodIngredients}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            </section>
          )}
          {categories.map(category => (
          <section className="erw-category" key={category.id}>
            <h2>{categoryLabel(category.id, t)}</h2>
            <div className="erw-resource-grid">
              {category.rows.map(resource => (
                <ResourceCard
                  resource={resource}
                  selected={resource.id === selectedId}
                  onSelect={() => onSelect(resource.id)}
                  key={resource.id}
                />
              ))}
            </div>
          </section>
          ))}
        </>}
      </div>
    </section>
  );
}

function FlowList({
  title,
  entries,
  tone,
  potentialEntry,
}: {
  title: string;
  entries: ResourceFlowEntry[];
  tone: 'positive' | 'negative';
  potentialEntry?: ResourceFlowEntry;
}) {
  const t = useWebUIText();
  return (
    <section className="erw-flow-list">
      <h3>{title}</h3>
      <div className="erw-flow-list__rows">
        {entries.length === 0 && (
          <span className={`erw-flow-empty${potentialEntry ? ' erw-flow-empty--compact' : ''}`}>{tone === 'positive' ? t('Economy.NoProducers') : t('Economy.NoConsumers')}</span>
        )}
        {entries.map(entry => (
          <Tooltip
            content={entry.tooltip}
            position={tone === 'positive' ? 'left' : 'right'}
            delay={150}
            variant="sidebar"
            wrapperClassName="erw-flow-tooltip"
            key={entry.id}
          >
            <div className={`erw-flow-row${entry.potential ? ' erw-flow-row--potential' : ''}`}>
              <span>{entry.icon && <img src={entry.icon} alt="" draggable={false} />}{entry.label}</span>
              <strong className={tone === 'positive' ? 'erw-positive' : 'erw-negative'}>
                {entry.amount === undefined ? '›' : `${tone === 'positive' ? '+' : '-'}${fmt(entry.amount)}`}
              </strong>
            </div>
          </Tooltip>
        ))}
        {potentialEntry && (
          <Tooltip
            content={potentialEntry.tooltip}
            position="right"
            delay={150}
            variant="sidebar"
            wrapperClassName="erw-flow-tooltip"
          >
            <div className="erw-flow-row erw-flow-row--potential">
              <span>{potentialEntry.label}</span>
              <strong>›</strong>
            </div>
          </Tooltip>
        )}
      </div>
    </section>
  );
}

function niceChartStep(rawStep: number): number {
  if (rawStep <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const fraction = rawStep / magnitude;
  const niceFraction = fraction < 1.5 ? 1 : fraction < 3 ? 2 : fraction < 7 ? 5 : 10;
  return niceFraction * magnitude;
}

function ResourceTrendChart({ points }: { points: EconomyResourceHistoryPoint[] }) {
  const t = useWebUIText();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  if (points.length === 0) return <div className="erw-chart-empty">{t('Economy.NoResourceHistory')}</div>;

  const rawMaximum = Math.max(1, ...points.flatMap(point => [point.stockpile, point.production, point.consumption]));
  const tickCount = 4;
  const tickStep = niceChartStep(rawMaximum / tickCount);
  const maximum = Math.ceil(rawMaximum / tickStep) * tickStep;
  const ticks = Array.from({ length: tickCount + 1 }, (_, index) => index * tickStep);
  const series = [
    { id: 'stock', label: t('Economy.StockpileHistory'), values: points.map(point => point.stockpile) },
    { id: 'production', label: t('Economy.Production'), values: points.map(point => point.production) },
    { id: 'use', label: t('Economy.Use'), values: points.map(point => point.consumption) },
  ];
  const plotLeft = 8;
  const plotTop = 4;
  const plotBottom = 38;
  const xForIndex = (index: number) => points.length <= 1 ? (plotLeft + 100) / 2 : plotLeft + index / (points.length - 1) * (100 - plotLeft);
  const yForValue = (value: number) => plotBottom - Math.max(0, value) / maximum * (plotBottom - plotTop);
  const linePoints = (values: number[]) => values.map((value, index) => {
    const x = values.length <= 1 ? (plotLeft + 100) / 2 : plotLeft + index / (values.length - 1) * (100 - plotLeft);
    const y = yForValue(value);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
  const updateHoveredPoint = (clientX: number, bounds: DOMRect) => {
    if (bounds.width <= 0) return;
    const ratio = Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width));
    setHoveredIndex(Math.round(ratio * Math.max(0, points.length - 1)));
  };
  const hoverX = hoveredIndex === null ? 0 : xForIndex(hoveredIndex);

  return (
    <section className="erw-chart-panel">
      <header>
        <h3>{t('Economy.StoresAndUse')}</h3>
        <div className="erw-chart-legend">
          <span><i className="erw-chart-key erw-chart-key--stock" />{t('Economy.StockpileHistory')}</span>
          <span><i className="erw-chart-key erw-chart-key--production" />{t('Economy.Production')}</span>
          <span><i className="erw-chart-key erw-chart-key--use" />{t('Economy.Use')}</span>
        </div>
      </header>
      <div className="erw-chart" role="img" aria-label={t('Economy.StoresAndUse')}>
        <svg className="erw-chart__svg" viewBox="0 0 100 42" preserveAspectRatio="none" aria-hidden="true">
          {ticks.map(value => (
            <line className="erw-chart__grid" x1={plotLeft} y1={yForValue(value)} x2="100" y2={yForValue(value)} key={value} />
          ))}
          {[plotLeft, 31, 54, 77, 100].map(x => (
            <line className="erw-chart__grid" x1={x} y1={plotTop} x2={x} y2={plotBottom} key={x} />
          ))}
          {series.map(item => (
            <polyline className={`erw-chart__line erw-chart__line--${item.id}`} points={linePoints(item.values)} key={item.id} />
          ))}
          {hoveredIndex !== null && (
            <line className="erw-chart__hover-line" x1={hoverX} y1={plotTop} x2={hoverX} y2={plotBottom} />
          )}
        </svg>
        <div className="erw-chart__y-axis" aria-hidden="true">
          {ticks.map(value => (
            <span style={{ top: `${yForValue(value) / 42 * 100}%` }} key={value}>{fmt(value)}</span>
          ))}
        </div>
        {series.flatMap(item => item.values.map((value, index) => (
          <i
            className={`erw-chart__point erw-chart__point--${item.id}`}
            style={{ left: `${xForIndex(index)}%`, top: `${yForValue(value) / 42 * 100}%` }}
            key={`${item.id}-${index}`}
          />
        )))}
        {hoveredIndex !== null && series.map(item => (
          <i
            className={`erw-chart__hover-point erw-chart__hover-point--${item.id}`}
            style={{ left: `${hoverX}%`, top: `${yForValue(item.values[hoveredIndex]) / 42 * 100}%` }}
            key={item.id}
          />
        ))}
        <div
          className="erw-chart__hit-area"
          onMouseMove={event => updateHoveredPoint(event.clientX, event.currentTarget.getBoundingClientRect())}
          onMouseLeave={() => setHoveredIndex(null)}
        />
        {hoveredIndex !== null && (
          <div className={`erw-chart__value-card${hoverX > 50 ? ' erw-chart__value-card--left' : ''}`} style={{ left: `${hoverX}%` }}>
            <strong>{points[hoveredIndex].dateText}</strong>
            {series.map(item => (
              <span key={item.id}>
                <i className={`erw-chart-key--${item.id}`} />
                <em>{item.label}</em>
                <b>{item.id === 'stock' ? fmt(item.values[hoveredIndex]) : monthlyValue(item.values[hoveredIndex], item.id === 'production', t)}</b>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="erw-chart-dates"><span>{points[0].dateText}</span><span>{points[points.length - 1].dateText}</span></div>
    </section>
  );
}

function ResourceManagement({
  resource,
  gold,
  tradeAmount,
  thresholdStep,
}: {
  resource: EconomyOverviewResourceRow;
  gold: number;
  tradeAmount: number;
  thresholdStep: number;
}) {
  const t = useWebUIText();
  const multiplier = useStepMultiplier();
  const effectiveTradeAmount = stepAmountFromMultiplier(multiplier, tradeAmount);
  const [autoBuyEnabled, setAutoBuyEnabled] = useState(resource.autoBuyEnabled);
  const [autoSellEnabled, setAutoSellEnabled] = useState(resource.autoSellEnabled);
  const [buyDraft, setBuyDraft] = useState(Math.max(0, resource.autoBuyThreshold));
  const [sellDraft, setSellDraft] = useState(Math.max(0, resource.autoSellThreshold));
  const resourceAutomationKey = `${resource.id}:${resource.autoBuyEnabled}:${resource.autoBuyThreshold}:${resource.autoSellEnabled}:${resource.autoSellThreshold}`;
  const [draftKey, setDraftKey] = useState(resourceAutomationKey);
  if (resourceAutomationKey !== draftKey) {
    setDraftKey(resourceAutomationKey);
    setAutoBuyEnabled(resource.autoBuyEnabled);
    setAutoSellEnabled(resource.autoSellEnabled);
    setBuyDraft(Math.max(0, resource.autoBuyThreshold));
    setSellDraft(Math.max(0, resource.autoSellThreshold));
  }

  const buyCost = Math.ceil(effectiveTradeAmount * resource.buyPrice);
  const sellAmount = Math.min(effectiveTradeAmount, resource.capitalAmount);
  const sellReturn = Math.floor(sellAmount * resource.sellPrice);
  const canBuy = buyCost > 0 && gold >= buyCost && resource.storageAvailable >= effectiveTradeAmount;
  const canSell = sellReturn > 0;

  const toggleAutoBuy = () => {
    const enabled = !autoBuyEnabled;
    setAutoBuyEnabled(enabled);
    setResourceAutoBuyBridge(resource.id, enabled, buyDraft).catch(() => undefined);
  };
  const toggleAutoSell = () => {
    const enabled = !autoSellEnabled;
    setAutoSellEnabled(enabled);
    setResourceAutoSellBridge(resource.id, enabled, sellDraft).catch(() => undefined);
  };

  return (
    <section className="erw-manage">
      <h3>
        {t('Economy.Manage')}
        <small>{t('Economy.CapitalStoredAmount', { Amount: fmt(resource.capitalAmount) })}</small>
      </h3>
      <div
        className="erw-manage__trade"
        onPointerEnter={noteModifierKeysFromEvent}
        onPointerMove={noteModifierKeysFromEvent}
      >
        <Tooltip content={{ title: t('Economy.Sell'), body: t('Economy.SellTradeTooltip') }} position="top" delay={150} wrapperClassName="erw-manage__trade-tooltip">
          <GameButton
            variant="burgundy"
            className="erw-manage__trade-button"
            disabled={!canSell}
            onClick={(event) => {
              noteModifierKeysFromEvent(event);
              sellEconomyResourceBridge(resource.id, stepAmountFromEvent(event, tradeAmount)).catch(() => undefined);
            }}
          >
            <strong>{t('Economy.SellAmount', { Amount: fmt(sellAmount) })}</strong>
            <small><img src="/assets/icons/I_Coins.png" alt="" />{t('Economy.ReturnsGold', { Amount: fmt(sellReturn) })}</small>
          </GameButton>
        </Tooltip>
        <Tooltip content={{ title: t('Economy.Buy'), body: t('Economy.BuyTradeTooltip') }} position="top" delay={150} wrapperClassName="erw-manage__trade-tooltip">
          <GameButton
            variant="burgundy"
            className="erw-manage__trade-button"
            disabled={!canBuy}
            onClick={(event) => {
              noteModifierKeysFromEvent(event);
              buyEconomyResourceBridge(resource.id, stepAmountFromEvent(event, tradeAmount)).catch(() => undefined);
            }}
          >
            <strong>{t('Economy.BuyAmount', { Amount: fmt(effectiveTradeAmount) })}</strong>
            <small><img src="/assets/icons/I_Coins.png" alt="" />{t('Economy.CostsGold', { Amount: fmt(buyCost) })}</small>
          </GameButton>
        </Tooltip>
      </div>
      <div className="erw-manage__automation">
        <div className="erw-automation-row">
          <button type="button" className={`erw-check${autoBuyEnabled ? ' erw-check--active' : ''}`} aria-pressed={autoBuyEnabled} onClick={toggleAutoBuy}>
            <i aria-hidden="true" />
            {t('Economy.AutoBuyTarget')}
          </button>
          <NumberStepper
            value={buyDraft}
            min={0}
            max={Math.max(1, resource.autoBuySliderMax)}
            step={thresholdStep}
            disabled={!autoBuyEnabled}
            className="erw-threshold"
            inputClassName="erw-threshold__input"
            buttonClassName="erw-threshold__button"
            formatValue={value => formatNumber(value, { maximumFractionDigits: 0 })}
            onChange={setBuyDraft}
            onCommit={(value) => {
              setBuyDraft(value);
              setResourceAutoBuyBridge(resource.id, true, value).catch(() => undefined);
            }}
          />
        </div>
        <div className="erw-automation-row">
          <button type="button" className={`erw-check${autoSellEnabled ? ' erw-check--active' : ''}`} aria-pressed={autoSellEnabled} onClick={toggleAutoSell}>
            <i aria-hidden="true" />
            {t('Economy.AutoSellReserve')}
          </button>
          <NumberStepper
            value={sellDraft}
            min={0}
            max={Math.max(1, resource.autoSellSliderMax)}
            step={thresholdStep}
            disabled={!autoSellEnabled}
            className="erw-threshold"
            inputClassName="erw-threshold__input"
            buttonClassName="erw-threshold__button"
            formatValue={value => formatNumber(value, { maximumFractionDigits: 0 })}
            onChange={setSellDraft}
            onCommit={(value) => {
              setSellDraft(value);
              setResourceAutoSellBridge(resource.id, true, value).catch(() => undefined);
            }}
          />
        </div>
      </div>
    </section>
  );
}

function ResourceAnalysis({ resource, data }: { resource: EconomyOverviewResourceRow; data: GetEconomyOverviewResponse }) {
  const t = useWebUIText();
  const { openResource } = useResourceDetails();
  const isAggregateFood = resource.aggregate && resource.category.toLowerCase() === 'food';
  const details = useEconomyResourceDetailsBridge(resource.id);
  const totalOut = resource.militaryUsage + resource.queuedUsage + resource.settlementConsumption + resource.courtConsumption + resource.liegeTribute + resource.decayLoss;
  const capacity = details?.stockpileCap ?? resource.stockpileCap;
  const capacityWidth = capacity > 0 ? Math.min(100, resource.amount / capacity * 100) : 0;
  const runway = resourceRunway(resource);
  const settlementProducers = details?.producers ?? [];
  const subjectSources = (details?.externalSources ?? []).filter(source => source.kind === 'subject');
  const liegeSources = (details?.externalSources ?? []).filter(source => source.kind === 'liege');
  const treatySources = (details?.externalSources ?? []).filter(source => source.kind === 'treaty');
  const settlementConsumers = (details?.consumers ?? []).filter(consumer => consumer.kind === 'settlement');
  const courtConsumers = (details?.consumers ?? []).filter(consumer => consumer.kind === 'court');
  const recruitmentConsumers = (details?.consumers ?? []).filter(consumer => consumer.kind === 'queued');
  const militaryConsumers = (details?.consumers ?? []).filter(consumer => consumer.kind === 'army' || consumer.kind === 'navy');
  const decayConsumers = (details?.consumers ?? []).filter(consumer => consumer.kind === 'decay');
  const liegeConsumers = (details?.consumers ?? []).filter(consumer => consumer.kind === 'liege');
  const potentialUses = details?.potentialUses ?? [];
  const sourceEntries: ResourceFlowEntry[] = [
    {
      id: 'settlements',
      label: t('Economy.Settlements'),
      amount: resource.production,
      icon: '/assets/icons/I_BuildingsQuickButton.png',
      tooltip: isAggregateFood
        ? overviewFlowTooltip(t('Economy.Settlements'), resource.production, resource.producers.filter(source => source.linkType === 'settlement'), true, t)
        : producerBreakdownTooltip(t('Economy.Settlements'), resource.production, settlementProducers, t),
    },
    {
      id: 'subjects',
      label: t('Economy.Subjects'),
      amount: resource.vassalContribution,
      icon: '/assets/icons/I_DependentFactions.png',
      tooltip: isAggregateFood
        ? overviewFlowTooltip(t('Economy.Subjects'), resource.vassalContribution, resource.producers.filter(source => source.linkType === 'subject'), true, t)
        : flowBreakdownTooltip(t('Economy.Subjects'), resource.vassalContribution, subjectSources, true, t),
    },
    ...(data.isVassal ? [{
      id: 'liege',
      label: t('Economy.Overlord'),
      amount: resource.liegeContribution,
      icon: '/assets/icons/I_DependentFactions.png',
      tooltip: isAggregateFood
        ? overviewFlowTooltip(t('Economy.Overlord'), resource.liegeContribution, resource.producers.filter(source => source.linkType === 'liege'), true, t)
        : flowBreakdownTooltip(t('Economy.Overlord'), resource.liegeContribution, liegeSources, true, t),
    }] : []),
    {
      id: 'treaties',
      label: t('Economy.Treaties'),
      amount: resource.treatyIncome,
      icon: '/assets/icons/I_Diplomacy.png',
      tooltip: isAggregateFood
        ? overviewFlowTooltip(t('Economy.Treaties'), resource.treatyIncome, resource.producers.filter(source => source.linkType === 'treaty'), true, t)
        : flowBreakdownTooltip(t('Economy.Treaties'), resource.treatyIncome, treatySources, true, t),
    },
  ];
  const useEntries: ResourceFlowEntry[] = [
    {
      id: 'recruitment',
      label: t('Economy.UsedByRecruitment'),
      amount: resource.queuedUsage,
      icon: '/assets/icons/I_ArmiesQuickButton.png',
      tooltip: isAggregateFood
        ? overviewFlowTooltip(t('Economy.UsedByRecruitment'), resource.queuedUsage, resource.consumers.filter(consumer => consumer.linkType === 'queued'), false, t)
        : flowBreakdownTooltip(t('Economy.UsedByRecruitment'), resource.queuedUsage, recruitmentConsumers, false, t),
    },
    {
      id: 'settlements',
      label: t('Economy.UsedBySettlements'),
      amount: resource.settlementConsumption,
      icon: '/assets/icons/I_City.png',
      tooltip: isAggregateFood
        ? overviewFlowTooltip(t('Economy.UsedBySettlements'), resource.settlementConsumption, resource.consumers.filter(consumer => consumer.linkType === 'settlement'), false, t)
        : flowBreakdownTooltip(t('Economy.UsedBySettlements'), resource.settlementConsumption, settlementConsumers, false, t),
    },
    {
      id: 'court',
      label: t('Common.Court'),
      amount: resource.courtConsumption,
      icon: '/assets/icons/I_VacantCourt.png',
      tooltip: flowBreakdownTooltip(t('Common.Court'), resource.courtConsumption, courtConsumers, false, t),
    },
    {
      id: 'military',
      label: t('Economy.UsedByMilitary'),
      amount: resource.militaryUsage,
      icon: '/assets/icons/I_Swords.png',
      tooltip: isAggregateFood
        ? overviewFlowTooltip(t('Economy.UsedByMilitary'), resource.militaryUsage, resource.consumers.filter(consumer => consumer.linkType === 'military'), false, t)
        : flowBreakdownTooltip(t('Economy.UsedByMilitary'), resource.militaryUsage, militaryConsumers, false, t),
    },
    {
      id: 'decay',
      label: t('Economy.Spoilage'),
      amount: resource.decayLoss,
      icon: '/assets/icons/I_Caution.png',
      tooltip: isAggregateFood
        ? overviewFlowTooltip(t('Economy.Spoilage'), resource.decayLoss, resource.consumers.filter(consumer => consumer.linkType === 'decay'), false, t)
        : flowBreakdownTooltip(t('Economy.Spoilage'), resource.decayLoss, decayConsumers, false, t),
    },
    ...(data.isVassal ? [{
      id: 'liege',
      label: t('Economy.Overlord'),
      amount: resource.liegeTribute,
      icon: '/assets/icons/I_DependentFactions.png',
      tooltip: isAggregateFood
        ? overviewFlowTooltip(t('Economy.Overlord'), resource.liegeTribute, resource.consumers.filter(consumer => consumer.linkType === 'liege'), false, t)
        : flowBreakdownTooltip(t('Economy.Overlord'), resource.liegeTribute, liegeConsumers, false, t),
    }] : []),
  ].filter(entry => (entry.amount ?? 0) > 0.0001);
  const potentialUseEntry: ResourceFlowEntry | undefined = potentialUses.length > 0 ? {
    id: 'potential-uses',
    label: t('Economy.PotentialUses'),
    tooltip: potentialUsesTooltip(potentialUses, t),
    potential: true,
  } : undefined;
  const storesTooltip = storesBreakdownTooltip(resource.amount, resource.stockpiles, t);
  const history = useMemo(() => {
    const points = details?.history ?? [];
    if (points.length > 0) return points.slice(-24);
    return [{
      dateText: t('Economy.Current'),
      stockpile: resource.amount,
      production: resource.production + resource.vassalContribution + resource.liegeContribution + resource.treatyIncome,
      consumption: totalOut,
      net: resource.netPerMonth,
      marketPrice: Math.ceil(data.tradeTransactionAmount * resource.buyPrice),
    }];
  }, [data.tradeTransactionAmount, details?.history, resource, t, totalOut]);

  return (
    <section className="erw-analysis">
      <div className="erw-analysis-scroll erw-analysis-scroll__body">
        <header className="erw-analysis__header">
          <img src={`/assets/resources/${resource.id}.png`} alt="" draggable={false} />
          <h2>{resource.name}</h2>
          <span>{t('Economy.StoredAmount', { Amount: fmt(resource.amount) })}</span>
          <strong className={resource.netPerMonth < -0.0001 ? 'erw-negative' : 'erw-positive'}>{signed(resource.netPerMonth)}{t('Economy.PerMonth')}</strong>
          <b className={resource.netPerMonth < -0.0001 ? 'erw-warning' : 'erw-positive'}>{coverageLabel(resource, t)}</b>
          {!isAggregateFood && (
            <GameButton variant="outline" className="erw-details-button" onClick={() => openResource(resource.id)}>
              {t('Economy.FullDetails')}
            </GameButton>
          )}
        </header>
        <div className="erw-flow">
          <FlowList title={t('Economy.Sources')} entries={sourceEntries} tone="positive" />
          <i className="erw-flow-arrow" aria-hidden="true" />
          <Tooltip content={storesTooltip} position="top" delay={150} variant="sidebar" wrapperClassName="erw-stores-tooltip">
            <section className="erw-stores">
              <h3>{t('Economy.Stores')}</h3>
              <img src={`/assets/resources/${resource.id}.png`} alt="" draggable={false} />
              <strong>{fmt(resource.amount)}</strong>
              <span>{t('Economy.CapacityValue', { Current: fmt(resource.amount), Maximum: fmt(capacity) })}</span>
              <span className="erw-capacity-track" aria-hidden="true"><i style={{ width: `${capacityWidth}%` }} /></span>
            </section>
          </Tooltip>
          <i className="erw-flow-arrow" aria-hidden="true" />
          <FlowList title={t('Economy.Uses')} entries={useEntries} tone="negative" potentialEntry={potentialUseEntry} />
        </div>
        <div className="erw-flow-summary">
          {runway !== null
            ? t('Economy.MonthsAtCurrentUse', { Count: formatNumber(runway, { maximumFractionDigits: 0 }) })
            : coverageLabel(resource, t)}
        </div>
        <div className={`erw-analysis__bottom${isAggregateFood ? ' erw-analysis__bottom--chart-only' : ''}`}>
          <ResourceTrendChart points={history} />
          {!isAggregateFood && (
            <ResourceManagement
              resource={resource}
              gold={data.gold}
              tradeAmount={data.tradeTransactionAmount}
              thresholdStep={data.autoSellThresholdStep}
            />
          )}
        </div>
      </div>
    </section>
  );
}

const ResourceWorkspace = memo(function ResourceWorkspace({ data }: ResourceWorkspaceProps) {
  const t = useWebUIText();
  const resources = useMemo(
    () => data?.resources ?? [],
    [data?.resources],
  );
  const [selectedId, setSelectedId] = useState('');
  const [shortagesOnly, setShortagesOnly] = useState(false);
  const selectedResource = resources.find(resource => resource.id === selectedId)
    ?? resources.filter(resource => resource.netPerMonth < -0.0001).sort((left, right) => left.netPerMonth - right.netPerMonth)[0]
    ?? resources[0]
    ?? null;

  const toggleShortages = () => {
    const nextValue = !shortagesOnly;
    setShortagesOnly(nextValue);
    if (nextValue && selectedResource && selectedResource.netPerMonth >= -0.0001) {
      const mostUrgentShortage = resources
        .filter(resource => resource.netPerMonth < -0.0001)
        .sort((left, right) => left.netPerMonth - right.netPerMonth)[0];
      if (mostUrgentShortage) setSelectedId(mostUrgentShortage.id);
    }
  };

  if (!data || resources.length === 0 || !selectedResource) {
    return <section className="erw-empty">{t('Economy.NoResourceStockpiles')}</section>;
  }

  return (
    <div className="erw-layout">
      <ResourceBoard
        resources={resources}
        selectedId={selectedResource.id}
        shortagesOnly={shortagesOnly}
        onToggleShortages={toggleShortages}
        onSelect={setSelectedId}
      />
      <ResourceAnalysis resource={selectedResource} data={data} key={selectedResource.id} />
    </div>
  );
});

export default ResourceWorkspace;
