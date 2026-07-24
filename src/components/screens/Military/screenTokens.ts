export type MilitaryScreenTab = 'land' | 'sea' | 'templates' | 'guard';
export type TemplateCreateType = 'land' | 'naval';

function decodeScreenToken(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function compactScreenToken(value: string): string {
  return value.replace(/[\s_-]/g, '');
}

function isTemplateScreenToken(id: string): boolean {
  const compactId = compactScreenToken(id);
  return compactId === 'templates'
    || compactId === 'template'
    || compactId === 'formations'
    || compactId === 'formation'
    || compactId === 'formationtemplates'
    || compactId === 'armytemplates'
    || compactId === 'landtemplates'
    || compactId === 'navytemplates'
    || compactId === 'navaltemplates'
    || id.startsWith('template:')
    || id.startsWith('new:')
    || id.startsWith('rename:')
    || id.startsWith('assign:');
}

export function initialMilitaryTab(screenId: string | null | undefined): MilitaryScreenTab {
  const id = (screenId ?? '').trim().toLowerCase();
  const compactId = compactScreenToken(id);
  if (compactId === 'guard' || compactId === 'personalguard' || compactId === 'provincialguard') {
    return 'guard';
  }
  if (isTemplateScreenToken(id)) {
    return 'templates';
  }
  return id === 'sea' || id === 'navies' || id === 'navy' ? 'sea' : 'land';
}

export function templateIdFromScreenId(screenId: string | null | undefined): string | null {
  if (!screenId) return null;
  const id = screenId.trim();
  return id.toLowerCase().startsWith('template:') ? decodeScreenToken(id.slice('template:'.length)) : null;
}

export function createTypeFromScreenId(screenId: string | null | undefined): TemplateCreateType | null {
  const id = (screenId ?? '').trim().toLowerCase();
  const compactId = compactScreenToken(id);
  if (id.startsWith('new:')) {
    const value = decodeScreenToken(id.slice('new:'.length)).toLowerCase();
    return value === 'naval' || value === 'navy' || value === 'sea' ? 'naval' : 'land';
  }
  if (compactId === 'newnavytemplate' || compactId === 'newnavaltemplate' || compactId === 'navytemplates' || compactId === 'navaltemplates') return 'naval';
  if (compactId === 'newlandtemplate' || compactId === 'landtemplates') return 'land';
  return null;
}

export function assignmentTargetFromScreenId(screenId: string | null | undefined): string | null {
  if (!screenId) return null;
  const id = screenId.trim();
  return id.toLowerCase().startsWith('assign:') ? decodeScreenToken(id.slice('assign:'.length)) : null;
}
