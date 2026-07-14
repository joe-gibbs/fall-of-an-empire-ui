import { FoaeCefUIAssetPath } from '../../utils/assets';
import type { FactionRelation } from './WorldGlanceTypes';

const RELATION_FRAME_PATH: Record<FactionRelation, string> = {
  own: '/assets/glance/military-relations-v1/military-relation-own.png',
  ally: '/assets/glance/military-relations-v1/military-relation-ally.png',
  enemy: '/assets/glance/military-relations-v1/military-relation-enemy.png',
  neutral: '/assets/glance/military-relations-v1/military-relation-neutral.png',
};

interface GlanceRelationFrameProps {
  relation: FactionRelation;
}

export default function GlanceRelationFrame({ relation }: GlanceRelationFrameProps) {
  return (
    <img
      className="glance-relation-frame"
      src={FoaeCefUIAssetPath(RELATION_FRAME_PATH[relation])}
      alt=""
      aria-hidden="true"
    />
  );
}
