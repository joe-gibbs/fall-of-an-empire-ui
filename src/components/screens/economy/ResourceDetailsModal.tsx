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
import CloseButton from '../../common/buttons/CloseButton';
import GameButton from '../../common/buttons/GameButton';
import EntityLink from '../../common/entities/EntityLink';
import Tooltip from '../../common/tooltips/Tooltip';
import './ResourceDetailsModal.css';

const TRADE_AMOUNT = 100;
const AUTO_SELL_STEP = 500;

type HistoryRange = '12' | '24' | 'all';

interface Props {
  resource: EconomyOverviewResourceRow | null;
  gold: number;
  autoBuyEnabled: boolean;
  onClose: () => void;
}

function number(value: number | null | undefined): string {
  return formatNumber(value, { maximumFractionDigits: 1 });
}

function signed(value: number | null | undefined): string {
  return formatSignedNumber(value, { maximumFractionDigits: 1 });
}

function valueClass(value: number): string {
  if (value > 0.0001) return 'erd-positive';
  if (value < -0.0001) return 'erd-negative';
  return 'erd-neutral';
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

function LineChart({
  series,
}: {
  series: Array<{ className: string; values: number[] }>;
}) {
  const values = series.flatMap(item => item.values);
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const range = Math.max(1, max - min);
  const points = (items: number[]) => {
    if (items.length === 1) {
      const y = 44 - (items[0] - min) / range * 38;
      return `0,${y.toFixed(2)} 100,${y.toFixed(2)}`;
    }
    return items.map((value, index) => {
    const x = items.length <= 1 ? 50 : index / (items.length - 1) * 100;
    const y = 44 - (value - min) / range * 38;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');
  };

  return (
    <svg className="erd-chart__svg" viewBox="0 0 100 48" preserveAspectRatio="none" aria-hidden="true">
      <line className="erd-chart__grid" x1="0" y1="6" x2="100" y2="6" />
      <line className="erd-chart__grid" x1="0" y1="25" x2="100" y2="25" />
      <line className="erd-chart__grid" x1="0" y1="44" x2="100" y2="44" />
      {series.map(item => item.values.length > 0 && (
        <polyline key={item.className} className={`erd-chart__line erd-chart__line--${item.className}`} points={points(item.values)} />
      ))}
    </svg>
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
        <LineChart series={[{ className: 'stock', values: history.map(point => point.stockpile) }]} />
      </div>
      <div className="erd-chart">
        <div className="erd-chart__header">
          <span>{t('Economy.ProductionAndUse')}</span>
          <strong className={valueClass(last.net)}>{signed(last.net)}</strong>
        </div>
        <LineChart series={[
          { className: 'production', values: history.map(point => point.production) },
          { className: 'use', values: history.map(point => point.consumption) },
        ]} />
        <div className="erd-chart__legend">
          <span><i className="erd-chart__key erd-chart__key--production" />{t('Economy.Production')}</span>
          <span><i className="erd-chart__key erd-chart__key--use" />{t('Economy.Use')}</span>
        </div>
      </div>
      <div className="erd-chart">
        <div className="erd-chart__header">
          <span>{t('Economy.MarketValueHistory')}</span>
          <strong>{t('Economy.Multiplier', { Value: number(last.marketMultiplier) })}</strong>
        </div>
        <LineChart series={[{ className: 'market', values: history.map(point => point.marketMultiplier) }]} />
      </div>
      <div className="erd-history-dates"><span>{first.dateText}</span><span>{last.dateText}</span></div>
    </div>
  );
}

export default function ResourceDetailsModal({ resource, gold, autoBuyEnabled, onClose }: Props) {
  const t = useWebUIText();
  const details = useEconomyResourceDetailsBridge(resource?.id ?? null);
  const buildQueue = useBuildQueueBridge(!!resource);
  const [historyRange, setHistoryRange] = useState<HistoryRange>('12');
  const { mounted, closing, close, stopPropagation } = useModalPresence({
    open: !!resource,
    onClose,
    escapeId: 'modal.economy-resource-details',
    closeStrategy: 'request',
  });

  const history = useMemo(() => {
    const points = details?.history ?? [];
    if (points.length === 0 && resource) {
      return [{
        dateText: t('Economy.Current'),
        stockpile: resource.amount,
        production: resource.production + resource.vassalContribution + resource.treatyIncome,
        consumption: resource.armyUsage + resource.queuedUsage + resource.settlementConsumption + resource.decayLoss,
        net: resource.netPerMonth,
        marketMultiplier: resource.marketMultiplier,
      }];
    }
    if (historyRange === 'all') return points;
    return points.slice(-Number(historyRange));
  }, [details?.history, historyRange, resource, t]);

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

  if (!mounted || !resource) return null;

  const isFood = resource.category.toLowerCase() === 'food';
  const buyCost = Math.ceil(TRADE_AMOUNT * resource.buyPrice);
  const sellAmount = Math.min(TRADE_AMOUNT, resource.amount);
  const sellReturn = Math.floor(sellAmount * resource.sellPrice);
  const canBuy = buyCost > 0 && gold >= buyCost;
  const canSell = sellReturn > 0;
  const totalIn = resource.production + resource.vassalContribution + resource.treatyIncome;
  const totalOut = resource.armyUsage + resource.queuedUsage + resource.settlementConsumption + resource.decayLoss;
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
            <span className="erd-header__kicker">{t('Economy.ResourceDetails')}</span>
            <h1>{details?.name || resource.name}</h1>
            <span className="erd-header__category">
              {details?.tier === 'secondary' ? t('Economy.SecondaryResource') : t('Economy.PrimaryResource')}
              {' - '}{categoryLabel(details?.category || resource.category, t)}
            </span>
          </div>
          <CloseButton size="md" onClick={close} />
        </header>

        <div className="erd-body">
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
              <Metric label={t('Economy.MarketPrice')} value={t('Economy.Multiplier', { Value: number(resource.marketMultiplier) })} icon="/assets/icons/I_Coins.png" />
              {isFood && <Metric label={t('Economy.FoodValue')} value={number(details?.foodValue)} />}
              {(details?.decayRate ?? 0) > 0 && <Metric label={t('Economy.DecayRate')} value={`${number((details?.decayRate ?? 0) * 100)}%`} />}
            </div>
          </section>

          <section className="erd-trade">
            <div className="erd-trade__buttons">
              <GameButton
                variant="outline"
                className="erd-trade__button erd-trade__button--buy"
                disabled={!canBuy}
                onClick={() => buyEconomyResourceBridge(resource.id, TRADE_AMOUNT).catch(() => undefined)}
              >
                <span>{t('Economy.BuyAmount', { Amount: number(TRADE_AMOUNT) })}</span>
                <small><img className="erd-gold-icon" src="/assets/icons/I_Coins.png" alt="" />{t('Economy.CostsGold', { Amount: number(buyCost) })}</small>
              </GameButton>
              <GameButton
                variant="burgundy"
                className="erd-trade__button erd-trade__button--sell"
                disabled={!canSell}
                onClick={() => sellEconomyResourceBridge(resource.id, sellAmount).catch(() => undefined)}
              >
                <span>{t('Economy.SellAmount', { Amount: number(sellAmount) })}</span>
                <small><img className="erd-gold-icon" src="/assets/icons/I_Coins.png" alt="" />{t('Economy.ReturnsGold', { Amount: number(sellReturn) })}</small>
              </GameButton>
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
                  }}
                  position="left"
                  wrapperClassName="erd-threshold-tooltip"
                >
                  <div className="erd-threshold">
                    <button type="button" onMouseDown={() => setAutoSellThreshold(threshold - AUTO_SELL_STEP)}>-</button>
                    <div><span style={{ width: `${Math.min(100, threshold / thresholdMax * 100)}%` }} /></div>
                    <strong><small>{t('Economy.AutoSellReserveShort')}</small>{number(threshold)}</strong>
                    <button type="button" onMouseDown={() => setAutoSellThreshold(threshold + AUTO_SELL_STEP)}>+</button>
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
              {(details?.producers ?? []).length === 0 && (details?.externalSources ?? []).length === 0 ? (
                <div className="erd-empty">{t('Economy.NoProducers')}</div>
              ) : (
                <>
                  {(details?.producers ?? []).map(producer => (
                    <div className="erd-source" key={producer.settlementId}>
                      <div className="erd-source__main">
                        <EntityLink type="settlement" id={producer.settlementId} inline>{producer.settlementName}</EntityLink>
                        <strong className="erd-positive">+{number(producer.amount)}</strong>
                      </div>
                      <div className="erd-source__parts">
                        {producer.naturalAmount > 0 && <span>{t('Economy.NaturalProduction')} <b>+{number(producer.naturalAmount)}</b></span>}
                        {producer.processedAmount > 0 && <span>{t('Economy.Processing')} <b>+{number(producer.processedAmount)}</b></span>}
                      </div>
                      {producer.buildings.length > 0 && (
                        <div className="erd-detail-list">
                          {producer.buildings.map((building, index) => <span key={`${building.name}:${index}`}>{building.name} <b>+{number(building.value)}</b></span>)}
                        </div>
                      )}
                      {producer.modifiers.length > 0 && (
                        <div className="erd-modifiers">
                          <em>{t('Economy.Modifiers')}</em>
                          {producer.modifiers.map((modifier, index) => (
                            <span className={valueClass(modifier.value)} key={`${modifier.name}:${index}`}>{modifier.name} {signed(modifier.value)}%</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {(details?.externalSources ?? []).length > 0 && (
                    <div className="erd-flow-group">
                      <h3>{t('Economy.ExternalSources')}</h3>
                      {details?.externalSources.map(flow => (
                        <div className="erd-flow-row" key={flow.id}><FlowName flow={flow} /><strong className="erd-positive">+{number(flow.amount)}</strong></div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>

            <section className="erd-ledger">
              <h2>{t('Economy.WhereUsed')}</h2>
              {requirements.length === 0 && (details?.consumers ?? []).length === 0 && !(isFood && (details?.sharedFoodDemand ?? 0) > 0) ? (
                <div className="erd-empty">{t('Economy.NoConsumers')}</div>
              ) : (
                <>
                  {requirements.length > 0 && (
                    <div className="erd-flow-group erd-requirements">
                      <h3>{t('Economy.CommittedDemand')}</h3>
                      {requirements.map(requirement => (
                        <div className="erd-requirement" key={requirement.id}>
                          <div className="erd-requirement__main">
                            <strong>{requirement.item.itemName}</strong>
                            <span className="erd-negative">{t('Economy.AmountRequired', { Amount: number(requirement.required) })}</span>
                          </div>
                          <div className="erd-requirement__place">
                            <EntityLink type="settlement" id={requirement.item.settlementId} inline>{requirement.item.settlementName}</EntityLink>
                            <span>{requirement.item.statusLabel}</span>
                            {requirement.missing > 0 && <b className="erd-negative">{t('Economy.AmountStillNeeded', { Amount: number(requirement.missing) })}</b>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {isFood && (details?.sharedFoodDemand ?? 0) > 0 && (
                    <div className="erd-flow-row"><span>{t('Economy.SharedFoodDemand')}</span><strong className="erd-negative">-{number(details?.sharedFoodDemand)}</strong></div>
                  )}
                  {(details?.consumers ?? []).map(flow => (
                    <div className="erd-flow-row" key={flow.id}><FlowName flow={flow} /><strong className="erd-negative">-{number(flow.amount)}</strong></div>
                  ))}
                </>
              )}
            </section>
          </div>

        </div>
      </article>
    </div>,
    document.body,
  );
}
