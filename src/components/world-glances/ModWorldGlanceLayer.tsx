import { useEffect, useMemo, useState, type CSSProperties, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import {
  useWorldGlanceRegistrations,
  type ModWorldGlanceEntry,
  type WorldGlanceRegistration,
} from '../../registry/worldGlances';
import { useGlanceScale } from '../../bridge/core/useGlanceScale';
import './ModWorldGlanceLayer.css';

const MOD_FRAME_HEADER_NUMBER_COUNT = 2;
const MOD_FRAME_ENTRY_NUMBER_STRIDE = 5;

interface ModWorldGlanceFrameEvent {
  providerId: string;
  anchorKeys: string[];
  frameNumbers: number[];
  entryPayloads: string[];
}

interface AtlasModWorldGlanceEntry extends ModWorldGlanceEntry {
  atlasPriority: number;
}

function parsePayload(payload: string | undefined): unknown {
  if (!payload) return null;
  try {
    return JSON.parse(payload) as unknown;
  } catch {
    return payload;
  }
}

function normaliseFrame(value: unknown): ModWorldGlanceFrameEvent | null {
  if (!value || typeof value !== 'object') return null;
  const frame = value as Partial<ModWorldGlanceFrameEvent>;
  if (
    typeof frame.providerId !== 'string'
    || !Array.isArray(frame.anchorKeys)
    || !Array.isArray(frame.frameNumbers)
    || !Array.isArray(frame.entryPayloads)
  ) {
    return null;
  }
  return frame as ModWorldGlanceFrameEvent;
}

function entriesFromFrame(frame: ModWorldGlanceFrameEvent): AtlasModWorldGlanceEntry[] {
  const viewportWidth = frame.frameNumbers[0] ?? 0;
  const viewportHeight = frame.frameNumbers[1] ?? 0;
  const entries: AtlasModWorldGlanceEntry[] = [];
  for (let index = 0; index < frame.anchorKeys.length; index += 1) {
    const offset = MOD_FRAME_HEADER_NUMBER_COUNT + index * MOD_FRAME_ENTRY_NUMBER_STRIDE;
    if (offset + MOD_FRAME_ENTRY_NUMBER_STRIDE > frame.frameNumbers.length) break;
    const anchorKey = frame.anchorKeys[index];
    if (!anchorKey) continue;
    entries.push({
      anchorKey,
      payload: parsePayload(frame.entryPayloads[index]),
      screenX: frame.frameNumbers[offset] ?? 0,
      screenY: frame.frameNumbers[offset + 1] ?? 0,
      scale: frame.frameNumbers[offset + 2] ?? 1,
      opacity: frame.frameNumbers[offset + 3] ?? 0,
      zOrder: frame.frameNumbers[offset + 4] ?? 0,
      viewportWidth,
      viewportHeight,
      atlasPriority: (frame.frameNumbers[offset + 3] ?? 0) > 0.05 ? Date.now() : 0,
    });
  }
  return entries;
}

function atlasContentMatches(
  previous: readonly AtlasModWorldGlanceEntry[] | undefined,
  next: readonly AtlasModWorldGlanceEntry[],
): boolean {
  return previous?.length === next.length && previous.every((entry, index) => (
    entry.anchorKey === next[index].anchorKey
    && JSON.stringify(entry.payload) === JSON.stringify(next[index].payload)
    && (entry.opacity > 0.05) === (next[index].opacity > 0.05)
  ));
}

function useModWorldGlanceFrames(atlas: boolean): ReadonlyMap<string, readonly AtlasModWorldGlanceEntry[]> {
  const [frames, setFrames] = useState<ReadonlyMap<string, readonly AtlasModWorldGlanceEntry[]>>(() => new Map());

  useEffect(() => {
    const onFrame = (event: Event) => {
      const frame = normaliseFrame((event as CustomEvent<unknown>).detail);
      if (!frame) return;
      const entries = entriesFromFrame(frame);
      setFrames(previous => {
        if (atlas && atlasContentMatches(previous.get(frame.providerId), entries)) {
          // Atlas cells do not use screen placement. Avoid a React render and atlas repaint
          // when only the camera moved; Slate receives that placement independently.
          return previous;
        }
        const next = new Map(previous);
        next.set(frame.providerId, entries);
        return next;
      });
    };
    window.addEventListener('bridge:ui.mod_world_glances_frame', onFrame);
    return () => window.removeEventListener('bridge:ui.mod_world_glances_frame', onFrame);
  }, [atlas]);

  return frames;
}

function overlayOffset(anchorPoint: string): string {
  if (anchorPoint === 'center' || !anchorPoint) return '-50%, -50%';
  const parts = anchorPoint.split(/[\s,]+/).filter(Boolean);
  if (parts.length !== 2) return '-50%, -50%';
  const resolve = (part: string): string => {
    if (part.endsWith('%')) return `-${part}`;
    const number = Number.parseFloat(part);
    return Number.isFinite(number) ? `${-number}px` : '-50%';
  };
  return `${resolve(parts[0])}, ${resolve(parts[1])}`;
}

function ModWorldGlanceNode({ registration, entry, atlas, glanceScale }: {
  registration: WorldGlanceRegistration;
  entry: AtlasModWorldGlanceEntry;
  atlas: boolean;
  glanceScale: number;
}) {
  const content: ReactNode = registration.render(entry);
  const anchorPoint = registration.anchorPoint ?? 'center';
  const rasterScale = registration.rasterScale ?? 1;

  const sendInput = (mouseButton: 'left' | 'right', event: MouseEvent<HTMLDivElement> | PointerEvent<HTMLDivElement>) => {
    if (!registration.onInput) return;
    event.preventDefault();
    event.stopPropagation();
    registration.onInput({
      anchorKey: entry.anchorKey,
      payload: entry.payload,
      mouseButton,
      shiftKey: event.shiftKey,
    });
  };

  if (atlas) {
    const style = { '--glance-atlas-raster-scale': rasterScale } as CSSProperties;
    return (
      <div
        className="mod-world-glance mod-world-glance--atlas glance-atlas-plate"
        style={style}
        data-webkiln-anchor={entry.anchorKey}
        data-webkiln-anchor-point={anchorPoint}
        data-webkiln-anchor-raster-scale={rasterScale}
        data-webkiln-anchor-priority={entry.atlasPriority}
        data-webkiln-anchor-demand={entry.opacity > 0.05 ? 'visible' : 'hidden'}
      >
        {content}
      </div>
    );
  }

  const viewportWidth = entry.viewportWidth > 0 ? entry.viewportWidth : 1;
  const viewportHeight = entry.viewportHeight > 0 ? entry.viewportHeight : 1;
  const style = {
    left: `${(entry.screenX / viewportWidth) * 100}%`,
    top: `${(entry.screenY / viewportHeight) * 100}%`,
    zIndex: entry.zOrder,
    opacity: entry.opacity,
    transform: `translate(${overlayOffset(anchorPoint)}) scale(${entry.scale * glanceScale})`,
    pointerEvents: registration.onInput ? 'auto' : 'none',
  } as CSSProperties;

  return (
    <div
      className="mod-world-glance mod-world-glance--overlay"
      style={style}
      onPointerDown={event => sendInput(event.button === 2 ? 'right' : 'left', event)}
      onContextMenu={event => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onPointerEnter={() => registration.onHover?.({
        anchorKey: entry.anchorKey,
        payload: entry.payload,
        hovered: true,
      })}
      onPointerLeave={() => registration.onHover?.({
        anchorKey: entry.anchorKey,
        payload: entry.payload,
        hovered: false,
      })}
    >
      {content}
    </div>
  );
}

export default function ModWorldGlanceLayer({ atlas = false }: { atlas?: boolean }) {
  const glanceScale = useGlanceScale();
  const registrations = useWorldGlanceRegistrations();
  const frames = useModWorldGlanceFrames(atlas);
  const nodes = useMemo(() => registrations.flatMap((registration) => (
    (frames.get(registration.id) ?? []).map(entry => ({ registration, entry }))
  )), [frames, registrations]);

  const rendered = nodes.map(({ registration, entry }) => (
    <ModWorldGlanceNode
      key={entry.anchorKey}
      registration={registration}
      entry={entry}
      atlas={atlas}
      glanceScale={glanceScale}
    />
  ));

  return atlas ? <>{rendered}</> : <div className="mod-world-glance-layer">{rendered}</div>;
}
