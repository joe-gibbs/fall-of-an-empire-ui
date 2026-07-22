import type { WorldGlanceFrameSection } from '../../../bridge/app/useWorldGlancesBridge';

export interface WorldGlanceTutorialTarget {
  section: WorldGlanceFrameSection;
  id: string;
  token: string;
}

const WORLD_GLANCE_TUTORIAL_SECTIONS = new Set<WorldGlanceFrameSection>([
  'settlement',
  'port',
  'convoy',
  'army',
  'navy',
  'battle',
]);

export function parseWorldGlanceTutorialTarget(target: string): WorldGlanceTutorialTarget | null {
  const orderPrefix = 'OrderTarget:';
  const token = target.slice(0, orderPrefix.length).toLowerCase() === orderPrefix.toLowerCase()
    ? target.slice(orderPrefix.length)
    : target;
  const separatorIndex = token.indexOf(':');
  if (separatorIndex <= 0 || separatorIndex === token.length - 1) {
    return null;
  }

  const section = token.slice(0, separatorIndex).toLowerCase() as WorldGlanceFrameSection;
  if (!WORLD_GLANCE_TUTORIAL_SECTIONS.has(section)) {
    return null;
  }

  return {
    section,
    id: token.slice(separatorIndex + 1),
    token,
  };
}

export function isWorldGlanceTutorialTarget(target: string): boolean {
  return parseWorldGlanceTutorialTarget(target) !== null;
}
