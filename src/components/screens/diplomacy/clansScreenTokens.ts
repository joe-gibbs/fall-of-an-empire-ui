export const CLANS_GOVERNORS_SCREEN_ID = 'governors';
export type ClansScreenTab = 'clans' | 'governors';

export function clansTabFromScreenId(screenId?: string | null): ClansScreenTab {
  return screenId === CLANS_GOVERNORS_SCREEN_ID ? 'governors' : 'clans';
}
