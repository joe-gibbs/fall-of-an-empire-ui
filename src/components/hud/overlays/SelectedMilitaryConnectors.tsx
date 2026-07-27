import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  makeWorldGlanceFrameEntryScratch,
  onWorldGlancesFrame,
  readWorldGlanceFrameEntry,
  worldGlanceFrameEntryCount,
  worldGlanceFrameViewportHeight,
  worldGlanceFrameViewportWidth,
  type WorldGlanceFrameSection,
  type WorldGlancesFrameResponse,
} from '../../../bridge/app/useWorldGlancesBridge';
import { useSelectedMilitaries } from '../../../data-source';
import { UI_PRESENTATION } from '../../../config/presentation';
import { onSelectedMilitaryConnectorHover } from './militarySelectionConnectorSignals';
import './SelectedMilitaryConnectors.css';

interface ScreenPoint {
  x: number;
  y: number;
}

function connectorPath(start: ScreenPoint, end: ScreenPoint): string {
  const horizontalDistance = Math.abs(end.x - start.x);
  const bend = Math.max(64, horizontalDistance * 0.34);
  const direction = end.x >= start.x ? 1 : -1;
  return `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} C ${(start.x + bend * direction).toFixed(1)} ${start.y.toFixed(1)}, ${(end.x - bend * direction).toFixed(1)} ${end.y.toFixed(1)}, ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
}

function setConnectorVisible(path: SVGPathElement | undefined, endpoint: SVGCircleElement | undefined, visible: boolean): void {
  if (path) path.style.display = visible ? 'block' : 'none';
  if (endpoint) endpoint.style.display = visible ? 'block' : 'none';
}

export default function SelectedMilitaryConnectors({ visible = true }: { visible?: boolean }) {
  const selectedForcesResult = useSelectedMilitaries();
  const selectedForces = useMemo(() => selectedForcesResult ?? [], [selectedForcesResult]);
  const selectedIds = useMemo(() => new Set(selectedForces.map(force => force.id)), [selectedForces]);
  const pathRefs = useRef<Map<string, SVGPathElement>>(new Map());
  const endpointRefs = useRef<Map<string, SVGCircleElement>>(new Map());
  const overlayRef = useRef<SVGSVGElement | null>(null);
  const latestFrameRef = useRef<WorldGlancesFrameResponse | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const updateConnectors = useCallback((frame: WorldGlancesFrameResponse | null) => {
    const overlay = overlayRef.current;
    if (!overlay || !frame || !visible || selectedIds.size <= 1) {
      for (const id of selectedIds) {
        setConnectorVisible(pathRefs.current.get(id), endpointRefs.current.get(id), false);
      }
      return;
    }

    const frameWidth = worldGlanceFrameViewportWidth(frame);
    const frameHeight = worldGlanceFrameViewportHeight(frame);
    if (frameWidth <= 0 || frameHeight <= 0) return;

    const overlayRect = overlay.getBoundingClientRect();
    const scaleX = overlayRect.width / frameWidth;
    const scaleY = overlayRect.height / frameHeight;
    const positions = new Map<string, ScreenPoint>();
    const sections: WorldGlanceFrameSection[] = ['army', 'navy'];

    for (const section of sections) {
      const scratch = makeWorldGlanceFrameEntryScratch();
      const count = worldGlanceFrameEntryCount(frame, section);
      for (let index = 0; index < count; index += 1) {
        const entry = readWorldGlanceFrameEntry(frame, section, index, scratch);
        if (
          !entry?.selected
          || entry.opacity <= UI_PRESENTATION.worldAnchors.visibleOpacityThreshold
          || !selectedIds.has(entry.id)
        ) continue;
        positions.set(entry.id, {
          x: entry.screenX * scaleX,
          y: entry.screenY * scaleY,
        });
      }
    }

    for (const id of selectedIds) {
      const path = pathRefs.current.get(id);
      const endpoint = endpointRefs.current.get(id);
      const position = positions.get(id);
      const node = document.querySelector<HTMLElement>(`[data-military-selection-node="${id}"]`);
      if (!path || !endpoint || !position || !node) {
        setConnectorVisible(path, endpoint, false);
        continue;
      }

      const nodeRect = node.getBoundingClientRect();
      const scrollViewport = node.closest<HTMLElement>('.styled-scroll-area__viewport');
      const scrollRect = scrollViewport?.getBoundingClientRect();
      const nodeCentreY = nodeRect.top + nodeRect.height * 0.5;
      if (scrollRect && (nodeCentreY < scrollRect.top || nodeCentreY > scrollRect.bottom)) {
        setConnectorVisible(path, endpoint, false);
        continue;
      }

      const start = {
        x: nodeRect.right - overlayRect.left,
        y: nodeCentreY - overlayRect.top,
      };
      const end = {
        x: position.x,
        y: position.y,
      };
      path.setAttribute('d', connectorPath(start, end));
      endpoint.setAttribute('cx', end.x.toFixed(1));
      endpoint.setAttribute('cy', end.y.toFixed(1));
      setConnectorVisible(path, endpoint, true);
    }
  }, [selectedIds, visible]);

  useEffect(() => onSelectedMilitaryConnectorHover(setHoveredId), []);

  useEffect(() => onWorldGlancesFrame((frame) => {
    latestFrameRef.current = frame;
    updateConnectors(frame);
  }), [updateConnectors]);

  useEffect(() => {
    const frame = latestFrameRef.current;
    const request = window.requestAnimationFrame(() => updateConnectors(frame));
    return () => window.cancelAnimationFrame(request);
  }, [selectedForces, updateConnectors]);

  if (selectedForces.length <= 1) return null;

  return (
    <svg ref={overlayRef} className="selected-military-connectors" aria-hidden="true">
      {selectedForces.map(force => {
        const highlighted = hoveredId === force.id;
        const muted = hoveredId !== null && !highlighted;
        const className = `${highlighted ? ' is-highlighted' : ''}${muted ? ' is-muted' : ''}`;
        return (
          <g key={force.id}>
            <path
              ref={node => {
                if (node) pathRefs.current.set(force.id, node);
                else pathRefs.current.delete(force.id);
              }}
              className={`selected-military-connector${className}`}
            />
            <circle
              ref={node => {
                if (node) endpointRefs.current.set(force.id, node);
                else endpointRefs.current.delete(force.id);
              }}
              className={`selected-military-connector-endpoint${className}`}
              r="7"
            />
          </g>
        );
      })}
    </svg>
  );
}
