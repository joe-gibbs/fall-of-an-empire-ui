import { useState } from 'react';
import { bridgeCall, type KinshipGroupEntry } from '../../../bridge-types.generated';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import { useWebUIText } from '../../../localization/WebUITextContext';
import { formatNumber } from '../../../utils/numberFormat';
import GameButton from '../../common/buttons/GameButton';
import Tooltip from '../../common/tooltips/Tooltip';
import { reconciliationTooltip } from './kinshipTooltips';
import './ClanFeudActions.css';

export default function ClanFeudActions({ group, onSelectClan }: {
  group: KinshipGroupEntry;
  onSelectClan: (id: string) => void;
}) {
  const t = useWebUIText();
  const [pending, setPending] = useState(false);
  const resolve = async (feudId: string, payBloodPrice: boolean) => {
    setPending(true);
    try {
      await bridgeCall('game.resolve_clan_feud', { feudId, payBloodPrice });
    } catch (error) {
      acknowledgeBridgeFailure(error);
    } finally {
      setPending(false);
    }
  };
  if (group.feuds.length === 0) return null;
  return <div className="clan-feuds">
    {group.feuds.map(feud => {
      const first = group.id === feud.firstClanId;
      const enemyId = first ? feud.secondClanId : feud.firstClanId;
      const enemyName = first ? feud.secondClanName : feud.firstClanName;
      const enemyHasLocalHead = first ? feud.secondHead.hasLocalHead : feud.firstHead.hasLocalHead;
      return <article className="clan-feud" key={feud.id}>
        <Tooltip content={{ title: t('ClanFeud.Enemy', { Clan: enemyName }), body: [feud.cause, t(enemyHasLocalHead ? 'ClanFeud.Effects' : 'ClanFeud.NoLocalHeadHelp')].join('\n\n') }}>
          <GameButton variant="ghost" className="clan-feud-enemy" disabled={!enemyHasLocalHead} onClick={() => onSelectClan(enemyId)}>
            {t('ClanFeud.Enemy', { Clan: enemyName })}
          </GameButton>
        </Tooltip>
        <div className="clan-feud-actions">
          <Tooltip content={{
            title: t('ClanFeud.Pay'), body: t('ClanFeud.PayHelp'),
            lines: [
              { label: t('ClanFeud.BloodPrice'), value: formatNumber(feud.bloodPrice), valueIcon: '/assets/icons/I_Coins.png' },
            ],
            footer: feud.payReason,
          }}>
            <GameButton variant="burgundy" disabled={pending || !feud.canPay} onClick={() => void resolve(feud.id, true)}>
              {t('ClanFeud.Pay')} <span className="clan-feud-cost"><img src="/assets/icons/I_Coins.png" alt="" />{formatNumber(feud.bloodPrice)}</span>
            </GameButton>
          </Tooltip>
          <Tooltip content={reconciliationTooltip(feud)}>
            <GameButton variant="outline" disabled={pending || !feud.canReconcile} onClick={() => void resolve(feud.id, false)}>
              {t('ClanFeud.Reconcile')} <span className="clan-feud-cost"><img src="/assets/icons/I_Fame.png" alt="" />{formatNumber(feud.reconciliationFameCost)}</span>
            </GameButton>
          </Tooltip>
        </div>
      </article>;
    })}
  </div>;
}
