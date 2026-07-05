import { webUIText } from '../../../localization/WebUITextContext';
export type Rank = 'Dux' | 'Praefectus' | 'Legatus';

export type Doctrine = 'concentrate' | 'screen' | 'garrison' | 'independent';

export interface Force {
  id: string;
  name: string;
  parentId: string | null;
  rank: Rank;
  commanderName: string;
  strength: number;
  maxStrength: number;
  morale: number;
  supplyDays: number;
  isNavy: boolean;
  doctrine: Doctrine;
  template: string;
  location: string;
  delegated: boolean;
  autoSquashRebels: boolean;
  isPlayerControlled: boolean;
}

export function strengthPct(f: Force): number {
  return f.maxStrength > 0 ? (f.strength / f.maxStrength) * 100 : 0;
}

export function subtree(all: Force[], rootId: string): Force[] {
  const byParent = new Map<string | null, Force[]>();
  for (const f of all) {
    const arr = byParent.get(f.parentId) ?? [];
    arr.push(f);
    byParent.set(f.parentId, arr);
  }
  const out: Force[] = [];
  const root = all.find(f => f.id === rootId);
  if (!root) return out;
  const walk = (f: Force) => {
    out.push(f);
    const children = byParent.get(f.id) ?? [];
    for (const c of children) walk(c);
  };
  walk(root);
  return out;
}

export const RANK_META: Record<Rank, {
  label: string;
  navalLabel: string;
  tier: 1 | 2 | 3;
  icon: string;
  desc: string;
}> = {
  Dux: {
    get label() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryForces.54.1'); },
    get navalLabel() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryForces.55.8'); },
    tier: 3,
    icon: '/assets/icons/Ranks/I_Rank_Dux.png',
    get desc() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryForces.57.9'); },
  },
  Praefectus: {
    get label() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryForces.61.2'); },
    get navalLabel() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryForces.62.10'); },
    tier: 2,
    icon: '/assets/icons/Ranks/I_Rank_Praefectus.png',
    get desc() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryForces.64.11'); },
  },
  Legatus: {
    get label() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryForces.68.3'); },
    get navalLabel() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryForces.69.12'); },
    tier: 1,
    icon: '/assets/icons/Ranks/I_Rank_Legatus.png',
    get desc() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryForces.71.13'); },
  },
};

export function rankLabel(f: Force): string {
  const meta = RANK_META[f.rank];
  return f.isNavy ? meta.navalLabel : meta.label;
}

export const DOCTRINE_META: Record<Doctrine, { label: string; icon: string; desc: string }> = {
  concentrate: {
    get label() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryForces.83.4'); },
    icon: '/assets/icons/Doctrines/I_Doctrine_Concentrate.png',
    get desc() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryForces.85.14'); },
  },
  screen: {
    get label() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryForces.88.5'); },
    icon: '/assets/icons/Doctrines/I_Doctrine_Screen.png',
    get desc() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryForces.90.15'); },
  },
  garrison: {
    get label() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryForces.93.6'); },
    icon: '/assets/icons/Doctrines/I_Doctrine_Garrison.png',
    get desc() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryForces.95.16'); },
  },
  independent: {
    get label() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryForces.98.7'); },
    icon: '/assets/icons/Doctrines/I_Doctrine_Independent.png',
    get desc() { return webUIText('Auto.TopProp.ComponentsScreensMilitaryForces.100.17'); },
  },
};

export const DELEGATION_ICON = '/assets/icons/Command/I_Command_Delegated.png';
export const DIRECT_ICON = '/assets/icons/Command/I_Command_Direct.png';
export const SQUASH_ICON = '/assets/icons/I_Mutiny.png';
