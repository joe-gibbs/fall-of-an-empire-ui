export type FormationTemplateIconKind =
  | 'balanced'
  | 'command'
  | 'guard'
  | 'infantry'
  | 'heavy_infantry'
  | 'spears'
  | 'light_infantry'
  | 'cavalry'
  | 'heavy_cavalry'
  | 'scouts'
  | 'ranged'
  | 'archers'
  | 'skirmishers'
  | 'siege'
  | 'logistics'
  | 'garrison'
  | 'naval'
  | 'warships'
  | 'transport'
  | 'patrol';

export interface FormationTemplateIconUnit {
  type?: string;
  category?: string;
  unitTypeLabel?: string;
  name?: string;
  unitName?: string;
  count?: number;
  range?: number;
  siegePower?: number;
}

export interface FormationTemplateIconMeta {
  kind: FormationTemplateIconKind;
  icon: string;
  labelKey: string;
  tint: string;
}

const ICON_META: Record<FormationTemplateIconKind, FormationTemplateIconMeta> = {
  balanced: {
    kind: 'balanced',
    icon: '/assets/icons/FormationTemplates/I_Formation_Balanced.png',
    labelKey: 'FormationTemplate.Icon.Balanced',
    tint: '#705333',
  },
  command: {
    kind: 'command',
    icon: '/assets/icons/FormationTemplates/I_Formation_Command.png',
    labelKey: 'FormationTemplate.Icon.Command',
    tint: '#74523d',
  },
  guard: {
    kind: 'guard',
    icon: '/assets/icons/FormationTemplates/I_Formation_Guard.png',
    labelKey: 'FormationTemplate.Icon.Guard',
    tint: '#635945',
  },
  infantry: {
    kind: 'infantry',
    icon: '/assets/icons/FormationTemplates/I_Formation_Infantry.png',
    labelKey: 'FormationTemplate.Icon.Infantry',
    tint: '#5f6541',
  },
  heavy_infantry: {
    kind: 'heavy_infantry',
    icon: '/assets/icons/FormationTemplates/I_Formation_HeavyInfantry.png',
    labelKey: 'FormationTemplate.Icon.HeavyInfantry',
    tint: '#625b49',
  },
  spears: {
    kind: 'spears',
    icon: '/assets/icons/FormationTemplates/I_Formation_Spears.png',
    labelKey: 'FormationTemplate.Icon.Spears',
    tint: '#5e6147',
  },
  light_infantry: {
    kind: 'light_infantry',
    icon: '/assets/icons/FormationTemplates/I_Formation_LightInfantry.png',
    labelKey: 'FormationTemplate.Icon.LightInfantry',
    tint: '#566546',
  },
  cavalry: {
    kind: 'cavalry',
    icon: '/assets/icons/FormationTemplates/I_Formation_Cavalry.png',
    labelKey: 'FormationTemplate.Icon.Cavalry',
    tint: '#6c5138',
  },
  heavy_cavalry: {
    kind: 'heavy_cavalry',
    icon: '/assets/icons/FormationTemplates/I_Formation_HeavyCavalry.png',
    labelKey: 'FormationTemplate.Icon.HeavyCavalry',
    tint: '#6a5743',
  },
  scouts: {
    kind: 'scouts',
    icon: '/assets/icons/FormationTemplates/I_Formation_Scouts.png',
    labelKey: 'FormationTemplate.Icon.Scouts',
    tint: '#55624d',
  },
  ranged: {
    kind: 'ranged',
    icon: '/assets/icons/FormationTemplates/I_Formation_Ranged.png',
    labelKey: 'FormationTemplate.Icon.Ranged',
    tint: '#4d6355',
  },
  archers: {
    kind: 'archers',
    icon: '/assets/icons/FormationTemplates/I_Formation_Archers.png',
    labelKey: 'FormationTemplate.Icon.Archers',
    tint: '#51664f',
  },
  skirmishers: {
    kind: 'skirmishers',
    icon: '/assets/icons/FormationTemplates/I_Formation_Skirmishers.png',
    labelKey: 'FormationTemplate.Icon.Skirmishers',
    tint: '#4f6759',
  },
  siege: {
    kind: 'siege',
    icon: '/assets/icons/FormationTemplates/I_Formation_Siege.png',
    labelKey: 'FormationTemplate.Icon.Siege',
    tint: '#6c4b35',
  },
  logistics: {
    kind: 'logistics',
    icon: '/assets/icons/FormationTemplates/I_Formation_Logistics.png',
    labelKey: 'FormationTemplate.Icon.Logistics',
    tint: '#6c5938',
  },
  garrison: {
    kind: 'garrison',
    icon: '/assets/icons/FormationTemplates/I_Formation_Garrison.png',
    labelKey: 'FormationTemplate.Icon.Garrison',
    tint: '#5f5f4b',
  },
  naval: {
    kind: 'naval',
    icon: '/assets/icons/FormationTemplates/I_Formation_Naval.png',
    labelKey: 'FormationTemplate.Icon.Naval',
    tint: '#345f7a',
  },
  warships: {
    kind: 'warships',
    icon: '/assets/icons/FormationTemplates/I_Formation_Warships.png',
    labelKey: 'FormationTemplate.Icon.Warships',
    tint: '#3c6076',
  },
  transport: {
    kind: 'transport',
    icon: '/assets/icons/FormationTemplates/I_Formation_Transport.png',
    labelKey: 'FormationTemplate.Icon.Transport',
    tint: '#526778',
  },
  patrol: {
    kind: 'patrol',
    icon: '/assets/icons/FormationTemplates/I_Formation_Patrol.png',
    labelKey: 'FormationTemplate.Icon.Patrol',
    tint: '#456775',
  },
};

export const FORMATION_TEMPLATE_ICON_OPTIONS: readonly FormationTemplateIconMeta[] = [
  ICON_META.balanced,
  ICON_META.command,
  ICON_META.guard,
  ICON_META.infantry,
  ICON_META.heavy_infantry,
  ICON_META.spears,
  ICON_META.light_infantry,
  ICON_META.cavalry,
  ICON_META.heavy_cavalry,
  ICON_META.scouts,
  ICON_META.ranged,
  ICON_META.archers,
  ICON_META.skirmishers,
  ICON_META.siege,
  ICON_META.logistics,
  ICON_META.garrison,
  ICON_META.naval,
  ICON_META.warships,
  ICON_META.transport,
  ICON_META.patrol,
];

function scoreUnit(unit: FormationTemplateIconUnit, scores: Record<FormationTemplateIconKind, number>) {
  const count = unit.count && unit.count > 0 ? unit.count : 1;
  const profile = `${unit.type ?? ''} ${unit.category ?? ''} ${unit.unitTypeLabel ?? ''} ${unit.name ?? ''} ${unit.unitName ?? ''}`.toLowerCase();

  if (profile.includes('navy') || profile.includes('naval') || profile.includes('galley') || profile.includes('trireme') || profile.includes('ship')) {
    if (profile.includes('transport') || profile.includes('oneraria') || profile.includes('convoy') || profile.includes('supply')) {
      scores.transport += count;
    } else if (profile.includes('scout') || profile.includes('patrol') || profile.includes('explorator') || profile.includes('lembi') || profile.includes('liburn')) {
      scores.patrol += count;
    } else {
      scores.warships += count;
      scores.naval += count;
    }
    return;
  }

  if (
    profile.includes('wagon')
    || profile.includes('supply')
    || profile.includes('logistics')
    || profile.includes('baggage')
  ) {
    scores.logistics += count * 2;
  }

  if (
    (unit.siegePower ?? 0) > 0
    || profile.includes('siege')
    || profile.includes('ram')
    || profile.includes('onager')
    || profile.includes('ballista')
    || profile.includes('catapult')
    || profile.includes('artillery')
  ) {
    scores.siege += count * 2;
  }

  if (
    profile.includes('archer')
    || profile.includes('bow')
    || profile.includes('sagitt')
  ) {
    scores.archers += count * 2;
  }

  if (
    profile.includes('skirmish')
    || profile.includes('slinger')
    || profile.includes('javelin')
    || profile.includes('funditor')
    || profile.includes('velites')
  ) {
    scores.skirmishers += count * 2;
  }

  if (
    (unit.range ?? 0) > 0
    || profile.includes('ranged')
    || profile.includes('archer')
    || profile.includes('bow')
    || profile.includes('sagitt')
    || profile.includes('skirmish')
    || profile.includes('missile')
  ) {
    scores.ranged += count;
  }

  if (
    profile.includes('clibanarii')
    || profile.includes('cataphract')
    || profile.includes('heavy cavalry')
  ) {
    scores.heavy_cavalry += count * 2;
  }

  if (
    profile.includes('scout')
    || profile.includes('explorator')
    || profile.includes('recon')
  ) {
    scores.scouts += count * 2;
  }

  if (
    profile.includes('cavalry')
    || profile.includes('horse')
    || profile.includes('rider')
    || profile.includes('lancer')
    || profile.includes('equites')
    || profile.includes('clibanarii')
    || profile.includes('cataphract')
  ) {
    scores.cavalry += count;
    return;
  }

  if (
    profile.includes('guard')
    || profile.includes('palatina')
    || profile.includes('bodyguard')
  ) {
    scores.guard += count * 2;
  }

  if (
    profile.includes('spear')
    || profile.includes('hasta')
    || profile.includes('lance')
  ) {
    scores.spears += count * 2;
  }

  if (
    profile.includes('legio')
    || profile.includes('comitatenses')
    || profile.includes('cohors')
    || profile.includes('heavy infantry')
  ) {
    scores.heavy_infantry += count * 2;
  }

  if (
    profile.includes('light infantry')
    || profile.includes('auxilia')
    || profile.includes('limitanei')
    || profile.includes('militia')
  ) {
    scores.light_infantry += count;
  }

  if (
    profile.includes('infantry')
    || profile.includes('spear')
    || profile.includes('shield')
    || profile.includes('cohors')
    || profile.includes('legio')
    || profile.includes('limitanei')
    || profile.includes('auxilia')
    || profile.includes('foot')
  ) {
    scores.infantry += count;
  }
}

export function getFormationTemplateIconById(iconId: string | undefined | null): FormationTemplateIconMeta | null {
  if (!iconId) return null;
  return ICON_META[iconId as FormationTemplateIconKind] ?? null;
}

export function suggestFormationTemplateIcon(
  templateType: string,
  units: readonly FormationTemplateIconUnit[],
): FormationTemplateIconMeta {
  if ((templateType === 'naval' || templateType === 'navy') && units.length === 0) return ICON_META.naval;

  const scores: Record<FormationTemplateIconKind, number> = {
    balanced: 0,
    command: 0,
    guard: 0,
    infantry: 0,
    heavy_infantry: 0,
    spears: 0,
    light_infantry: 0,
    cavalry: 0,
    heavy_cavalry: 0,
    scouts: 0,
    ranged: 0,
    archers: 0,
    skirmishers: 0,
    siege: 0,
    logistics: 0,
    garrison: 0,
    naval: 0,
    warships: 0,
    transport: 0,
    patrol: 0,
  };

  units.forEach(unit => scoreUnit(unit, scores));
  if (scores.transport > 0) return ICON_META.transport;
  if (scores.patrol > 0) return ICON_META.patrol;
  if (scores.warships > 0 || scores.naval > 0) return ICON_META.warships;

  const scoredKinds: FormationTemplateIconKind[] = [
    'siege',
    'logistics',
    'heavy_cavalry',
    'cavalry',
    'scouts',
    'archers',
    'skirmishers',
    'ranged',
    'guard',
    'heavy_infantry',
    'spears',
    'light_infantry',
    'infantry',
  ];
  let bestKind: FormationTemplateIconKind = 'balanced';
  let bestScore = 0;
  let totalScore = 0;

  scoredKinds.forEach(kind => {
    const score = scores[kind];
    totalScore += score;
    if (score > bestScore) {
      bestScore = score;
      bestKind = kind;
    }
  });

  if (bestScore <= 0 || (totalScore > 0 && bestScore < totalScore * 0.45)) return ICON_META.balanced;
  return ICON_META[bestKind];
}

export function getFormationTemplateIcon(
  templateType: string,
  units: readonly FormationTemplateIconUnit[],
  iconId?: string | null,
): FormationTemplateIconMeta {
  return getFormationTemplateIconById(iconId) ?? suggestFormationTemplateIcon(templateType, units);
}
