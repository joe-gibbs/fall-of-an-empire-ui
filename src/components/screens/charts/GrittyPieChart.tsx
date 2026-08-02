import React, { useMemo, useState } from 'react';
import Tooltip, { type TooltipContent, type TooltipLine } from '../../common/tooltips/Tooltip';
import { toRootRem } from '../../../utils/cssUnits';
import './GrittyPieChart.css';

import { webUIText } from '../../../localization/WebUITextContext';
interface Segment {
  label: string;
  value: number;
  colour: string;
  tooltipLines?: TooltipLine[];
}

interface GrittyPieChartProps {
  segments: Segment[];
  size?: number;
}

function segmentShareValue(segment: Segment, total: number): string {
  const share = total > 0 ? Math.round((segment.value / total) * 100) : 0;
  return `${share}%`;
}

function sliceIndexAtAngle(angle: number, segments: Segment[], total: number): number {
  let cursor = 0;
  for (let i = 0; i < segments.length; i += 1) {
    cursor += (segments[i].value / total) * 360;
    if (angle <= cursor) return i;
  }
  return Math.max(0, segments.length - 1);
}

function angleFromPieStart(x: number, y: number): number {
  const degrees = Math.atan2(y, x) * 180 / Math.PI;
  return (degrees + 90 + 360) % 360;
}

function grittyPieTooltip(segment: Segment, total: number): TooltipContent {
  return {
    title: segment.label,
    lines: [
      {
        label: webUIText('Auto.ComponentsScreensGrittyPieChart.43.1'),
        value: segmentShareValue(segment, total),
        valueColor: segment.colour,
      },
      ...(segment.tooltipLines ?? []),
    ],
  };
}

/**
 * Hand-painted style pie chart with noise overlay, bevel ring, and dark
 * segment separators. Uses pre-rendered Pillow textures for the gritty feel.
 */
const GrittyPieChart: React.FC<GrittyPieChartProps> = ({ segments, size = 72 }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const chartSize = toRootRem(size);
  const filteredSegments = useMemo(() => segments.filter(s => s.value > 0), [segments]);

  if (total === 0) {
    return (
      <div className="gritty-pie" style={{ width: chartSize, height: chartSize }}>
        <svg width={chartSize} height={chartSize} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="48" fill="rgba(255,255,255,0.04)" stroke="rgba(100,95,80,0.2)" strokeWidth="1" />
        </svg>
      </div>
    );
  }

  const r = 48;
  const cx = 50;
  const cy = 50;
  let cumulativeAngle = -90;

  const paths: React.ReactNode[] = [];
  const separators: React.ReactNode[] = [];

  const activeSegment = filteredSegments[activeIndex] ?? filteredSegments[0];

  const updateActiveSlice = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const radius = Math.min(rect.width, rect.height) / 2;
    const x = event.clientX - rect.left - radius;
    const y = event.clientY - rect.top - radius;
    const distance = Math.sqrt(x * x + y * y);
    if (distance > radius || filteredSegments.length === 0) return;
    setActiveIndex(sliceIndexAtAngle(angleFromPieStart(x, y), filteredSegments, total));
  };

  filteredSegments.forEach((segment, idx) => {
    const angle = (segment.value / total) * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    // Full circle case
    if (angle >= 359.99) {
      paths.push(
        <circle
          key={segment.label}
          cx={cx} cy={cy} r={r}
          fill={segment.colour}
          className={`gritty-pie-segment${activeSegment?.label === segment.label ? ' gritty-pie-segment--active' : ''}`}
        />
      );
      return;
    }

    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const largeArc = angle > 180 ? 1 : 0;

    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    paths.push(
      <path
        key={segment.label}
        d={d}
        fill={segment.colour}
        className={`gritty-pie-segment${activeSegment?.label === segment.label ? ' gritty-pie-segment--active' : ''}`}
      />
    );

    // Separator line at segment start (skip first to avoid double line)
    if (filteredSegments.length > 1) {
      const sx1 = cx + 2 * Math.cos(startRad);
      const sy1 = cy + 2 * Math.sin(startRad);
      const sx2 = cx + r * Math.cos(startRad);
      const sy2 = cy + r * Math.sin(startRad);
      separators.push(
        <line
          key={`sep-${idx}`}
          x1={sx1} y1={sy1} x2={sx2} y2={sy2}
          stroke="rgba(8, 12, 17, 0.6)"
          strokeWidth="1.2"
          pointerEvents="none"
        />
      );
    }
  });

  return (
    <div className="gritty-pie-tooltip-frame" style={{ width: chartSize, height: chartSize }}>
      <Tooltip
        content={activeSegment ? grittyPieTooltip(activeSegment, total) : webUIText("GrittyPieChart.ReligionShare")}
        position="top"
        delay={150}
        bubbleClassName="tt-bubble--passive"
      >
        <div
          className="gritty-pie"
          style={{ width: chartSize, height: chartSize }}
          onMouseEnter={updateActiveSlice}
          onMouseMove={updateActiveSlice}
          onMouseLeave={() => setActiveIndex(0)}
        >
          <svg
            className="gritty-pie-svg interactive"
            width={chartSize}
            height={chartSize}
            viewBox="0 0 100 100"
          >
            {/* Segments */}
            {paths}
            {/* Dark separators between segments */}
            {separators}
            {/* Inner edge shadow ring */}
            <circle
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke="rgba(8, 12, 17, 0.4)"
              strokeWidth="1"
              pointerEvents="none"
            />
          </svg>
          {/* Noise overlay */}
          <div className="gritty-pie-noise" />
          {/* Vignette ring overlay */}
          <div className="gritty-pie-ring" />
          {/* Gold bevel border */}
          <div className="gritty-pie-bevel" />
        </div>
      </Tooltip>
    </div>
  );
};

export default GrittyPieChart;
