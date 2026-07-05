/**
 * Type definitions for courtier promotion data. The actual values come from
 * the game's JSON-backed courtier type registry via the
 * game.get_courtier_types bridge action - see useCourtierPromotionBridge.
 */
export type StatKey =
  | 'tactics'
  | 'authority'
  | 'cunning'
  | 'governance'
  | 'loyalty'
  | 'constitution';

export interface StatRange { min: number; max: number }
export interface CourtierTraitHint { name: string; icon: string; weight: number }

export interface CourtierType {
  id: string;
  title: string;
  description: string;
  background: string;
  foreground: string;
  ageRange: StatRange;
  stats: Record<StatKey, StatRange>;
  traitPool: CourtierTraitHint[];
  minTraits: number;
  maxTraits: number;
}
