import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type {
  EconomyOverviewResourceRow,
  EconomyResourceFlowDetail,
  EconomyResourceHistoryPoint,
} from '../../../bridge-types.generated.ts';
import {
  buyEconomyResourceBridge,
  sellEconomyResourceBridge,
  setEconomyAutoBuyBridge,
  setResourceAutoSellBridge,
  useEconomyResourceDetailsBridge,
} from '../../../bridge/settlements-economy/useEconomyOverviewBridge';
import { useBuildQueueBridge } from '../../../bridge/settlements-economy/useBuildQueueBridge';
import { useModalPresence } from '../../../hooks/useModalPresence';
import { useWebUIText } from '../../../localization/WebUITextContext';
import { formatNumber, formatSignedNumber } from '../../../utils/numberFormat';
import {
  stepAmountFromEvent,
  stepAmountFromMultiplier,
  stepButtonLabel,
  useStepMultiplier,
} from '../../../utils/stepModifiers';
import { useSettingsBridge } from '../../../bridge/app/useSettingsBridge';
import { formatActionBinding, stepModifiersHelpText } from '../../../utils/actionBindings';
import CloseButton from '../../common/buttons/CloseButton';
import GameButton from '../../common/buttons/GameButton';
import EntityLink from '../../common/entities/EntityLink';
import StyledScrollArea from '../../common/layout/scrolling/StyledScrollArea';
import SortableHeader from '../../common/layout/tables/SortableHeader';
import { compareSortValuesWithDirection, toggleSortState, type SortState } from '../../common/layout/tables/sortUtils';
import Tooltip from '../../common/tooltips/Tooltip';
import './ResourceDetailsModal.css';

type HistoryRange = '12' | '24' | 'all';
type LedgerSortKey = 'name' | 'amount';

interface Props {
  resource: EconomyOverviewResourceRow | null;
  gold: number;
  autoBuyEnabled: boolean;
  tradeAmount: number;
  autoSellThresholdStep: number;
  onClose: () => void;
}

function number(value: number | null | undefined): string {
  return formatNumber(value, { maximumFractionDigits: 1 });
}

function price(value: number | null | undefined): string {
  return formatNumber(value, { maximumFractionDigits: 0 });
}

function signed(value: number | null | undefined): string {
  return formatSignedNumber(value, { maximumFractionDigits: 1 });
}

function valueClass(value: number): string {
  if (value > 0.0001) return 'erd-positive';
  if (value < -0.0001) return 'erd-negative';
  return 'erd-neutral';
}

function sortLedgerRows<T extends { name: string; amount: number }>(rows: T[], sort: SortState<LedgerSortKey>): T[] {
  return [...rows].sort((a, b) => {
    const aValue = sort.key === 'name' ? a.name : a.amount;
    const bValue = sort.key === 'name' ? b.name : b.amount;
    const result = compareSortValuesWithDirection(aValue, bValue, sort.direction);
    return result || a.name.localeCompare(b.name);
  });
}

function categoryLabel(category: string, t: ReturnType<typeof useWebUIText>): string {
  const id = category.toLowerCase();
  if (id === 'food') return t('Economy.ResourceCategoryFood');
  if (id === 'strategic') return t('Economy.ResourceCategoryStrategic');
  if (id === 'luxury') return t('Economy.ResourceCategoryLuxury');
  if (id === 'rawmaterials') return t('Economy.ResourceCategoryRawMaterials');
  return category;
}

function FlowName({ flow }: { flow: EconomyResourceFlowDetail }) {
  if (!flow.linkId || !flow.linkType) return <span>{flow.name}</span>;
  return <EntityLink type={flow.linkType} id={flow.linkId} inline>{flow.name}</EntityLink>;
}

function Metric({ label, value, tone, icon }: { label: string; value: string; tone?: string; icon?: string }) {
  return (
    <div className="erd-metric">
      <span className="erd-metric__label">{label}</span>
      <strong className={tone}>{icon && <img className="erd-gold-icon" src={icon} alt="" />}{value}</strong>
    </div>
  );
}

interface ChartSeries {
  className: string;
  label: string;
  values: number[];
  formatValue: (value: number) => string;
  colour: string;
}

function LineChart({ series, dates }: { series: ChartSeries[]; dates: string[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const values = series.flatMap(item => item.values);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = Math.max(0.0001, max - min);
  const pointCount = Math.max(0, ...series.map(item => item.values.length));
  const xForIndex = (index: number, count: number) => count <= 1 ? 50 : index / (count - 1) * 100;
  const yForValue = (value: number) => 44 - (value - min) / range * 38;
  const points = (items: number[]) => {
    if (items.length === 1) {
      const y = yForValue(items[0]);
      return `0,${y.toFixed(2)} 100,${y.toFixed(2)}`;
    }
    return items.map((value, index) => {
      const x = xForIndex(index, items.length);
      const y = yForValue(value);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');
  };

  const updateHoveredPoint = (clientX: number, bounds: DOMRect) => {
    if (pointCount === 0 || bounds.width <= 0) return;
    const ratio = Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width));
    setHoveredIndex(Math.round(ratio * Math.max(0, pointCount - 1)));
  };

  const hoverX = hoveredIndex === null ? 0 : xForIndex(hoveredIndex, pointCount);

  return (
    <div className="erd-chart__plot">
      <svg
        className="erd-chart__svg"
        viewBox="0 0 100 48"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line className="erd-chart__grid" x1="0" y1="6" x2="100" y2="6" />
        <line className="erd-chart__grid" x1="0" y1="25" x2="100" y2="25" />
        <line className="erd-chart__grid" x1="0" y1="44" x2="100" y2="44" />
        {series.map(item => item.values.length > 0 && (
          <polyline key={item.className} className={`erd-chart__line erd-chart__line--${item.className}`} points={points(item.values)} />
        ))}
        {hoveredIndex !== null && (
          <>
            <line
              className="erd-chart__hover-line"
              x1={xForIndex(hoveredIndex, pointCount)}
              y1="6"
              x2={xForIndex(hoveredIndex, pointCount)}
              y2="44"
            />
            {series.map(item => item.values[hoveredIndex] !== undefined && (
              <circle
                key={item.className}
                className={`erd-chart__hover-point erd-chart__hover-point--${item.className}`}
                cx={xForIndex(hoveredIndex, item.values.length)}
                cy={yForValue(item.values[hoveredIndex])}
                r="1.15"
              />
            ))}
          </>
        )}
      </svg>
      <div
        className="erd-chart__hit-area"
        onMouseMove={event => updateHoveredPoint(event.clientX, event.currentTarget.getBoundingClientRect())}
        onMouseLeave={() => setHoveredIndex(null)}
      />
      {hoveredIndex !== null && (
        <div
          className={`erd-chart__value-card${hoverX > 50 ? ' erd-chart__value-card--left' : ''}`}
          style={{ left: `${hoverX}%` }}
        >
          <strong>{dates[hoveredIndex]}</strong>
          {series.map(item => (
            <span key={item.className}>
              <i style={{ backgroundColor: item.colour }} />
              <em>{item.label}</em>
              <b>{item.formatValue(item.values[hoveredIndex])}</b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryCharts({ history }: { history: EconomyResourceHistoryPoint[] }) {
  const t = useWebUIText();
  if (history.length === 0) {
    return <div className="erd-empty erd-empty--history">{t('Economy.NoResourceHistory')}</div>;
  }

  const first = history[0];
  const last = history[history.length - 1];
  return (
    <div className="erd-charts">
      <div className="erd-chart">
        <div className="erd-chart__header">
          <span>{t('Economy.StockpileHistory')}</span>
          <strong>{number(last.stockpile)}</strong>
        </div>
        <LineChart
          dates={history.map(point => point.dateText)}
          series={[{
            className: 'stock',
            label: t('Economy.StockpileHistory'),
            values: history.map(point => point.stockpile),
            formatValue: number,
            colour: '#d6ad52',
          }]}
        />
      </div>
      <div className="erd-chart">
        <div className="erd-chart__header">
          <span>{t('Economy.ProductionAndUse')}</span>
          <strong className={valueClass(last.net)}>{signed(last.net)}</strong>
        </div>
        <LineChart
          dates={history.map(point => point.dateText)}
          series={[
            {
              className: 'production',
              label: t('Economy.Production'),
              values: history.map(point => point.production),
              formatValue: value => `+${number(value)}`,
              colour: '#63a94d',
            },
            {
              className: 'use',
              label: t('Economy.Use'),
              values: history.map(point => point.consumption),
              formatValue: value => `-${number(value)}`,
              colour: '#b64d45',
            },
          ]}
        />
        <div className="erd-chart__legend">
          <span><i className="erd-chart__key erd-chart__key--production" />{t('Economy.Production')}</span>
          <span><i className="erd-chart__key erd-chart__key--use" />{t('Economy.Use')}</span>
        </div>
      </div>
      <div className="erd-chart">
        <div className="erd-chart__header">
          <span>{t('Economy.MarketPrice')}</span>
          <strong><img className="erd-gold-icon" src="/assets/icons/I_Coins.png" alt="" />{price(last.marketPrice)}</strong>
        </div>
        <LineChart
          dates={history.map(point => point.dateText)}
          series={[{
            className: 'market',
            label: t('Economy.MarketPrice'),
            values: history.map(point => point.marketPrice),
            formatValue: price,
            colour: '#5b91bd',
          }]}
        />
      </div>
      <div className="erd-history-dates"><span>{first.dateText}</span><span>{last.dateText}</span></div>
    </div>
  );
}

export default function ResourceDetailsModal({
  resource,
  gold,
  autoBuyEnabled,
  tradeAmount,
  autoSellThresholdStep,
  onClose,
}: Props) {
  const t = useWebUIText();
  const { settings } = useSettingsBridge();
  const details = useEconomyResourceDetailsBridge(resource?.id ?? null);
  const buildQueue = useBuildQueueBridge(!!resource);
  const [historyRange, setHistoryRange] = useState<HistoryRange>('12');
  const [producerSort, setProducerSort] = useState<SortState<LedgerSortKey>>({ key: 'amount', direction: 'desc' });
  const [consumerSort, setConsumerSort] = useState<SortState<LedgerSortKey>>({ key: 'amount', direction: 'desc' });
  const { mounted, closing, close, stopPropagation } = useModalPresence({
    open: !!resource,
    onClose,
    escapeId: 'modal.economy-resource-details',
    closeStrategy: 'request',
  });
  const multiplier = useStepMultiplier();
  const effectiveTradeAmount = stepAmountFromMultiplier(multiplier, tradeAmount);
  const effectiveThresholdStep = stepAmountFromMultiplier(multiplier, autoSellThresholdStep);
  const stepModifiersBody = stepModifiersHelpText(
    t,
    formatActionBinding(settings?.controls, 'IncreaseUnitProduction'),
  );

  const history = useMemo(() => {
    const points = details?.history ?? [];
    if (points.length === 0 && resource) {
      return [{
        dateText: t('Economy.Current'),
        stockpile: resource.amount,
        production: resource.production + resource.vassalContribution + resource.treatyIncome,
        consumption: resource.militaryUsage + resource.queuedUsage + resource.settlementConsumption + resource.decayLoss,
        net: resource.netPerMonth,
        marketPrice: Math.ceil(tradeAmount * resource.buyPrice),
      }];
    }
    if (historyRange === 'all') return points;
    return points.slice(-Number(historyRange));
  }, [details?.history, historyRange, resource, t, tradeAmount]);

  const requirements = useMemo(() => {
    if (!resource) return [];
    return (buildQueue?.items ?? []).filter(item => !item.isVassal).flatMap(item => {
      const cost = item.resourceCost.find(entry => entry.name === resource.id);
      if (!cost) return [];
      const missing = item.missingResources.find(entry => entry.name === resource.id)?.amount ?? 0;
      return [{
        id: `${item.id}:${resource.id}`,
        item,
        required: cost.amount * item.count,
        missing,
      }];
    });
  }, [buildQueue?.items, resource]);

  const isFood = resource?.category.toLowerCase() === 'food';
  const producerRows = useMemo(() => sortLedgerRows([
    ...(details?.producers ?? []).map(producer => ({
      id: `producer:${producer.settlementId}`,
      name: producer.settlementName,
      amount: producer.amount,
      kind: 'producer' as const,
      producer,
    })),
    ...(details?.externalSources ?? []).map(flow => ({
      id: `external:${flow.id}`,
      name: flow.name,
      amount: flow.amount,
      kind: 'flow' as const,
      flow,
    })),
  ], producerSort), [details?.externalSources, details?.producers, producerSort]);

  const consumerRows = useMemo(() => sortLedgerRows([
    ...requirements.map(requirement => ({
      id: `requirement:${requirement.id}`,
      name: requirement.item.itemName,
      amount: requirement.required,
      kind: 'requirement' as const,
      requirement,
    })),
    ...(isFood && (details?.sharedFoodDemand ?? 0) > 0 ? [{
      id: 'shared-food-demand',
      name: t('Economy.SharedFoodDemand'),
      amount: details?.sharedFoodDemand ?? 0,
      kind: 'shared' as const,
    }] : []),
    ...(details?.consumers ?? []).map(flow => ({
      id: `consumer:${flow.id}`,
      name: flow.name,
      amount: flow.amount,
      kind: 'flow' as const,
      flow,
    })),
  ], consumerSort), [consumerSort, details?.consumers, details?.sharedFoodDemand, isFood, requirements, t]);

  const toggleProducerSort = (key: LedgerSortKey) => {
    setProducerSort(current => toggleSortState(current, key, key === 'amount' ? 'desc' : 'asc'));
  };
  const toggleConsumerSort = (key: LedgerSortKey) => {
    setConsumerSort(current => toggleSortState(current, key, key === 'amount' ? 'desc' : 'asc'));
  };

  if (!mounted || !resource) return null;

  const marketPrice = Math.ceil(tradeAmount * resource.buyPrice);
  const buyCost = Math.ceil(effectiveTradeAmount * resource.buyPrice);
  const sellAmount = Math.min(effectiveTradeAmount, resource.amount);
  const sellReturn = Math.floor(sellAmount * resource.sellPrice);
  const canBuy = buyCost > 0 && gold >= buyCost;
  const canSell = sellReturn > 0;
  const totalIn = resource.production + resource.vassalContribution + resource.treatyIncome;
  const totalOut = resource.militaryUsage + resource.queuedUsage + resource.settlementConsumption + resource.decayLoss;
  const threshold = Math.max(0, resource.autoSellThreshold);
  const thresholdMax = Math.max(1, resource.autoSellSliderMax);
  const setAutoSellThreshold = (next: number) => {
    setResourceAutoSellBridge(resource.id, true, Math.max(0, Math.min(thresholdMax, next))).catch(() => undefined);
  };

  return createPortal(
    <div className={`erd-overlay${closing ? ' erd-overlay--closing' : ''}`} onMouseDown={close}>
      <article className={`erd-modal${closing ? ' erd-modal--closing' : ''}`} onMouseDown={stopPropagation}>
        <header className="erd-header">
          <img className="erd-header__icon" src={`/assets/resources/${resource.id}.png`} alt="" draggable={false} />
          <div className="erd-header__copy">
            <h1>{details?.name || resource.name}</h1>
            <span className="erd-header__category">
              {details?.tier === 'secondary' ? t('Economy.SecondaryResource') : t('Economy.PrimaryResource')}
              {' - '}{categoryLabel(details?.category || resource.category, t)}
            </span>
          </div>
          <CloseButton size="md" onClick={close} />
        </header>

        <StyledScrollArea className="erd-scroll" viewportClassName="erd-body">
          <section className="erd-summary">
            <div className="erd-summary__description">
              <p>{details?.description || resource.name}</p>
              {details?.effects && <p className="erd-summary__effects"><strong>{t('Economy.Effects')}:</strong> {details.effects}</p>}
            </div>
            <div className="erd-metrics">
              <Metric label={t('Economy.Stockpile')} value={number(resource.amount)} />
              <Metric label={t('Economy.Production')} value={`+${number(totalIn)}${t('Economy.PerMonth')}`} tone="erd-positive" />
              <Metric label={t('Economy.Use')} value={`-${number(totalOut)}${t('Economy.PerMonth')}`} tone="erd-negative" />
              <Metric label={t('Economy.NetPerMonth')} value={signed(resource.netPerMonth)} tone={valueClass(resource.netPerMonth)} />
              <Metric label={t('Economy.MarketPrice')} value={price(marketPrice)} icon="/assets/icons/I_Coins.png" />
              {isFood && <Metric label={t('Economy.FoodValue')} value={number(details?.foodValue)} />}
              {(details?.decayRate ?? 0) > 0 && <Metric label={t('Economy.DecayRate')} value={`${number((details?.decayRate ?? 0) * 100)}%`} />}
            </div>
          </section>

          <section className="erd-trade">
            <div className="erd-trade__buttons">
              <Tooltip
                content={{ title: t('Economy.Buy'), body: t('Economy.BuyTradeTooltip') }}
                position="top"
                delay={150}
                wrapperClassName="erd-trade-btn-tooltip"
              >
                <GameButton
                  variant="outline"
                  className="erd-trade__button erd-trade__button--buy"
                  disabled={!canBuy}
                  onClick={(event) => {
                    buyEconomyResourceBridge(resource.id, stepAmountFromEvent(event, tradeAmount)).catch(() => undefined);
                  }}
                >
                  <span>{t('Economy.BuyAmount', { Amount: number(effectiveTradeAmount) })}</span>
                  <small><img className="erd-gold-icon" src="/assets/icons/I_Coins.png" alt="" />{t('Economy.CostsGold', { Amount: number(buyCost) })}</small>
                </GameButton>
              </Tooltip>
              <Tooltip
                content={{ title: t('Economy.Sell'), body: t('Economy.SellTradeTooltip') }}
                position="top"
                delay={150}
                wrapperClassName="erd-trade-btn-tooltip"
              >
                <GameButton
                  variant="burgundy"
                  className="erd-trade__button erd-trade__button--sell"
                  disabled={!canSell}
                  onClick={(event) => {
                    sellEconomyResourceBridge(resource.id, stepAmountFromEvent(event, tradeAmount)).catch(() => undefined);
                  }}
                >
                  <span>{t('Economy.SellAmount', { Amount: number(sellAmount) })}</span>
                  <small><img className="erd-gold-icon" src="/assets/icons/I_Coins.png" alt="" />{t('Economy.ReturnsGold', { Amount: number(sellReturn) })}</small>
                </GameButton>
              </Tooltip>
            </div>
            <div className="erd-automation">
              {isFood && (
                <button
                  type="button"
                  className={`erd-toggle${autoBuyEnabled ? ' erd-toggle--active' : ''}`}
                  onMouseDown={() => setEconomyAutoBuyBridge(!autoBuyEnabled).catch(() => undefined)}
                >
                  {t('Economy.AutoBuy')}: {autoBuyEnabled ? t('Economy.Enabled') : t('Economy.Disabled')}
                </button>
              )}
              <button
                type="button"
                className={`erd-toggle${resource.autoSellEnabled ? ' erd-toggle--active' : ''}`}
                onMouseDown={() => setResourceAutoSellBridge(resource.id, !resource.autoSellEnabled, threshold).catch(() => undefined)}
              >
                {t('Economy.AutoSell')}: {resource.autoSellEnabled ? t('Economy.Enabled') : t('Economy.Disabled')}
              </button>
              {resource.autoSellEnabled && (
                <Tooltip
                  content={{
                    title: t('Economy.AutoSellReserve'),
                    body: t('Economy.AutoSellReserveExplanation'),
                    footer: stepModifiersBody,
                  }}
                  position="left"
                  wrapperClassName="erd-threshold-tooltip"
                >
                  <div className="erd-threshold">
                    <button
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setAutoSellThreshold(threshold - stepAmountFromEvent(event, autoSellThresholdStep));
                      }}
                    >
                      {stepButtonLabel(-1, effectiveThresholdStep)}
                    </button>
                    <div><span style={{ width: `${Math.min(100, threshold / thresholdMax * 100)}%` }} /></div>
                    <strong><small>{t('Economy.AutoSellReserveShort')}</small>{number(threshold)}</strong>
                    <button
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setAutoSellThreshold(threshold + stepAmountFromEvent(event, autoSellThresholdStep));
                      }}
                    >
                      {stepButtonLabel(1, effectiveThresholdStep)}
                    </button>
                  </div>
                </Tooltip>
              )}
            </div>
          </section>

          <section className="erd-history">
            <div className="erd-section-header">
              <h2>{t('Economy.ResourceHistory')}</h2>
              <div className="erd-range-tabs">
                {(['12', '24', 'all'] as HistoryRange[]).map(range => (
                  <button
                    type="button"
                    className={historyRange === range ? 'erd-range-tab erd-range-tab--active' : 'erd-range-tab'}
                    onMouseDown={() => setHistoryRange(range)}
                    key={range}
                  >
                    {range === '12' ? t('Economy.Range12Months') : range === '24' ? t('Economy.Range24Months') : t('Economy.RangeAll')}
                  </button>
                ))}
              </div>
            </div>
            <HistoryCharts history={history} />
          </section>

          <div className="erd-ledgers">
            <section className="erd-ledger">
              <h2>{t('Economy.WhereProduced')}</h2>
              {producerRows.length === 0 ? (
                <div className="erd-empty">{t('Economy.NoProducers')}</div>
              ) : (
                <div className="erd-ledger-table" role="table">
                  <div className="erd-ledger-table__header" role="row">
                    <SortableHeader id="name" label={t('Economy.Source')} sort={producerSort} onSort={toggleProducerSort} />
                    <SortableHeader id="amount" label={t('Economy.Production')} sort={producerSort} onSort={toggleProducerSort} className="erd-ledger-table__amount-header" />
                  </div>
                  {producerRows.map(row => row.kind === 'producer' ? (
                    <div className="erd-source" role="row" key={row.id}>
                      <div className="erd-source__main">
                        <EntityLink type="settlement" id={row.producer.settlementId} inline>{row.producer.settlementName}</EntityLink>
                        <strong className="erd-positive">+{number(row.amount)}</strong>
                      </div>
                      <div className="erd-source__parts">
                        {row.producer.naturalAmount > 0 && <span>{t('Economy.NaturalProduction')} <b>+{number(row.producer.naturalAmount)}</b></span>}
                        {row.producer.processedAmount > 0 && <span>{t('Economy.Processing')} <b>+{number(row.producer.processedAmount)}</b></span>}
                      </div>
                      {row.producer.buildings.length > 0 && (
                        <div className="erd-detail-list">
                          {row.producer.buildings.map((building, index) => <span key={`${building.name}:${index}`}>{building.name} <b>+{number(building.value)}</b></span>)}
                        </div>
                      )}
                      {row.producer.modifiers.length > 0 && (
                        <div className="erd-modifiers">
                          <em>{t('Economy.Modifiers')}</em>
                          {row.producer.modifiers.map((modifier, index) => (
                            <span className={valueClass(modifier.value)} key={`${modifier.name}:${index}`}>{modifier.name} {signed(modifier.value)}%</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="erd-flow-row" role="row" key={row.id}>
                      <FlowName flow={row.flow} />
                      <strong className="erd-positive">+{number(row.amount)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="erd-ledger">
              <h2>{t('Economy.WhereUsed')}</h2>
              {consumerRows.length === 0 ? (
                <div className="erd-empty">{t('Economy.NoConsumers')}</div>
              ) : (
                <div className="erd-ledger-table" role="table">
                  <div className="erd-ledger-table__header" role="row">
                    <SortableHeader id="name" label={t('Economy.Source')} sort={consumerSort} onSort={toggleConsumerSort} />
                    <SortableHeader id="amount" label={t('Economy.Use')} sort={consumerSort} onSort={toggleConsumerSort} className="erd-ledger-table__amount-header" />
                  </div>
                  {consumerRows.map(row => row.kind === 'requirement' ? (
                        <div className="erd-requirement" role="row" key={row.id}>
                          <div className="erd-requirement__main">
                            <strong>{row.requirement.item.itemName}</strong>
                            <span className="erd-negative">-{number(row.amount)}</span>
                          </div>
                          <div className="erd-requirement__place">
                            <EntityLink type="settlement" id={row.requirement.item.settlementId} inline>{row.requirement.item.settlementName}</EntityLink>
                            <span>{row.requirement.item.statusLabel}</span>
                            {row.requirement.missing > 0 && <b className="erd-negative">{t('Economy.AmountStillNeeded', { Amount: number(row.requirement.missing) })}</b>}
                          </div>
                        </div>
                  ) : row.kind === 'shared' ? (
                    <div className="erd-flow-row" role="row" key={row.id}>
                      <span>{row.name}</span>
                      <strong className="erd-negative">-{number(row.amount)}</strong>
                    </div>
                  ) : (
                    <div className="erd-flow-row" role="row" key={row.id}>
                      <FlowName flow={row.flow} />
                      <strong className="erd-negative">-{number(row.amount)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

        </StyledScrollArea>
      </article>
    </div>,
    document.body,
  );
}
