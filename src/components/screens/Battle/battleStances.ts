import { webUIText } from '../../../localization/WebUITextContext';

export type BattleStanceId = 'neutral' | 'hold' | 'aggressive' | 'defensive' | 'charge';

export interface BattleStancePresentation {
  id: BattleStanceId;
  icon: string;
  readonly label: string;
  readonly description: string;
}

export const BATTLE_STANCES: BattleStancePresentation[] = [
  {
    id: 'neutral',
    icon: '/assets/icons/FormationStance/I_Line.png',
    get label() { return webUIText('Battle.Stance.Line'); },
    get description() { return webUIText('Battle.Stance.LineBody'); },
  },
  {
    id: 'hold',
    icon: '/assets/icons/FormationStance/I_HoldPosition.png',
    get label() { return webUIText('Battle.Stance.Hold'); },
    get description() { return webUIText('Battle.Stance.HoldBody'); },
  },
  {
    id: 'aggressive',
    icon: '/assets/icons/FormationStance/I_Aggressive.png',
    get label() { return webUIText('Battle.Stance.Press'); },
    get description() { return webUIText('Battle.Stance.PressBody'); },
  },
  {
    id: 'defensive',
    icon: '/assets/icons/FormationStance/I_Defensive.png',
    get label() { return webUIText('Battle.Stance.Brace'); },
    get description() { return webUIText('Battle.Stance.BraceBody'); },
  },
  {
    id: 'charge',
    icon: '/assets/icons/FormationStance/I_Charge.png',
    get label() { return webUIText('Battle.Stance.Charge'); },
    get description() { return webUIText('Battle.Stance.ChargeBody'); },
  },
];

const BATTLE_STANCE_BY_ID = Object.fromEntries(
  BATTLE_STANCES.map(stance => [stance.id, stance]),
) as Record<BattleStanceId, BattleStancePresentation>;

export function battleStancePresentation(stance: string): BattleStancePresentation {
  return BATTLE_STANCE_BY_ID[stance as BattleStanceId];
}
