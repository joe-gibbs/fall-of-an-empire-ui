export function sidebarTypeForEntity(type: string | null | undefined): string | null {
  const key = (type ?? '').trim().toLowerCase();
  if (!key) return null;
  if (key === 'settlement' || key === 'populationcentre' || key === 'population_center') return 'settlement';
  if (key === 'faction' || key === 'vassal' || key === 'subject' || key === 'diplomacy') return 'diplomacy';
  if (key === 'military' || key === 'army' || key === 'navy' || key === 'force') return 'military';
  if (key === 'character' || key === 'person') return 'character';
  if (key === 'powerbloc' || key === 'power_bloc' || key === 'power-bloc' || key === 'bloc') return 'powerbloc';
  if (key === 'template' || key === 'formationtemplate' || key === 'formation_template') return 'template';
  return null;
}

export function canOpenEntityLink(type: string | null | undefined, id: string | null | undefined): boolean {
  return !!id && !!sidebarTypeForEntity(type);
}
