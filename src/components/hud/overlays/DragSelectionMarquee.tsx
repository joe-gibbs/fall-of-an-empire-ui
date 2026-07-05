import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  onWorldGlancesFrame,
  worldGlanceFrameDragEndX,
  worldGlanceFrameDragEndY,
  worldGlanceFrameDragSelectionActive,
  worldGlanceFrameDragStartX,
  worldGlanceFrameDragStartY,
  type WorldGlancesFrameResponse,
} from '../../../bridge/app/useWorldGlancesBridge';
import './DragSelectionMarquee.css';

interface DragBox {
  leftPercent: number;
  topPercent: number;
  widthPercent: number;
  heightPercent: number;
}

function clampNormal(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function buildDragBox(frame: WorldGlancesFrameResponse): DragBox | null {
  if (!worldGlanceFrameDragSelectionActive(frame)) {
    return null;
  }

  const startX = clampNormal(worldGlanceFrameDragStartX(frame));
  const startY = clampNormal(worldGlanceFrameDragStartY(frame));
  const endX = clampNormal(worldGlanceFrameDragEndX(frame));
  const endY = clampNormal(worldGlanceFrameDragEndY(frame));
  const left = Math.min(startX, endX);
  const top = Math.min(startY, endY);

  return {
    leftPercent: left * 100,
    topPercent: top * 100,
    widthPercent: Math.abs(endX - startX) * 100,
    heightPercent: Math.abs(endY - startY) * 100,
  };
}

interface DragSelectionMarqueeProps {
  enabled?: boolean;
}

export default function DragSelectionMarquee({ enabled = true }: DragSelectionMarqueeProps) {
  const [box, setBox] = useState<DragBox | null>(null);
  const boxRef = useRef<DragBox | null>(null);
  const enabledRef = useRef(enabled);

  const applyBox = useCallback((next: DragBox | null) => {
    const current = boxRef.current;
    if (
      current === next
      || (
        current !== null
        && next !== null
        && current.leftPercent === next.leftPercent
        && current.topPercent === next.topPercent
        && current.widthPercent === next.widthPercent
        && current.heightPercent === next.heightPercent
      )
    ) {
      return;
    }

    boxRef.current = next;
    setBox(next);
  }, []);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => onWorldGlancesFrame((frame) => {
    if (!enabledRef.current) {
      applyBox(null);
      return;
    }

    applyBox(buildDragBox(frame));
  }), [applyBox]);

  useEffect(() => {
    const clear = () => applyBox(null);
    window.addEventListener('blur', clear);
    return () => window.removeEventListener('blur', clear);
  }, [applyBox]);

  const displayedBox = enabled ? box : null;
  if (!displayedBox) {
    return null;
  }

  const style = {
    left: `${displayedBox.leftPercent}%`,
    top: `${displayedBox.topPercent}%`,
    width: `${displayedBox.widthPercent}%`,
    height: `${displayedBox.heightPercent}%`,
  } satisfies CSSProperties;

  return (
    <div className="drag-selection-marquee-overlay" aria-hidden="true">
      <div className="drag-selection-marquee-box" style={style} />
    </div>
  );
}
