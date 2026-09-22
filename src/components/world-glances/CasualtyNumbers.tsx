import { useState } from 'react';
import { formatNumber } from '../../utils/numberFormat';

interface CasualtyBurst {
  id: number;
  losses: number;
}

/** Each increase in recorded casualties gets its own animation, even during rapid combat. */
export default function CasualtyNumbers({ casualties, alignment }: {
  casualties: number;
  alignment: 'attacker' | 'defender' | 'military';
}) {
  const [sample, setSample] = useState(() => ({ total: casualties, bursts: [] as CasualtyBurst[] }));
  if (sample.total !== casualties) {
    setSample({
      total: casualties,
      bursts: casualties > sample.total
        ? [...sample.bursts, { id: casualties, losses: casualties - sample.total }]
        : [],
    });
  }

  return sample.bursts.map(burst => (
    <span
      key={burst.id}
      className={`battle-loss-float battle-loss-float--${alignment} comparison-strength-value`}
      aria-hidden="true"
      onAnimationEnd={() => setSample(current => ({
        ...current,
        bursts: current.bursts.filter(active => active.id !== burst.id),
      }))}
    >
      {formatNumber(-burst.losses)}
    </span>
  ));
}
