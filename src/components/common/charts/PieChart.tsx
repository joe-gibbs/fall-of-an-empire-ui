import React from 'react';
import { designRem } from '../../../utils/cssUnits';

interface PieSegment {
  label: string;
  value: number;
  colour: string;
}

interface PieChartProps {
  segments: PieSegment[];
  size?: number;
}

const PieChart: React.FC<PieChartProps> = ({ segments, size = 80 }) => {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const chartSize = designRem(size);
  if (total === 0) {
    return (
      <svg width={chartSize} height={chartSize} viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="15" fill="rgba(255,255,255,0.06)" stroke="var(--border-dim)" strokeWidth="0.5" />
      </svg>
    );
  }

  const radius = 15;
  const cx = 16;
  const cy = 16;

  const paths = segments
    .filter((s) => s.value > 0)
    .reduce<{ angle: number; paths: React.ReactNode[] }>((acc, segment) => {
      const angle = (segment.value / total) * 360;
      const startAngle = acc.angle;
      const endAngle = acc.angle + angle;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = cx + radius * Math.cos(startRad);
      const y1 = cy + radius * Math.sin(startRad);
      const x2 = cx + radius * Math.cos(endRad);
      const y2 = cy + radius * Math.sin(endRad);

      const largeArc = angle > 180 ? 1 : 0;

      // Full circle case
      if (angle >= 359.99) {
        return {
          angle: endAngle,
          paths: acc.paths.concat(
          <circle
            key={segment.label}
            cx={cx}
            cy={cy}
            r={radius}
            fill={segment.colour}
          />,
          ),
        };
      }

      const d = [
        `M ${cx} ${cy}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        `Z`,
      ].join(' ');

      return {
        angle: endAngle,
        paths: acc.paths.concat(<path key={segment.label} d={d} fill={segment.colour} />),
      };
    }, { angle: -90, paths: [] }).paths;

  return (
    <svg
      width={chartSize}
      height={chartSize}
      viewBox="0 0 32 32"
      style={{ filter: 'drop-shadow(0 0.0909rem 0.2727rem rgba(8, 12, 17, 0.3))' }}
    >
      {paths}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="rgba(8, 12, 17, 0.3)"
        strokeWidth="0.5"
      />
    </svg>
  );
};

export default PieChart;
