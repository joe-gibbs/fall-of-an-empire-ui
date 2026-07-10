import React from 'react';
import './Badge.css';

interface BadgeProps {
  text: string;
  colour?: string;
  variant?: 'filled' | 'outline';
  className?: string;
}

const TOKEN_HEX: Record<string, string> = {
  'var(--blue)': '#4080c4',
  'var(--gold)': '#c9a84c',
  'var(--gold-light)': '#e0c872',
  'var(--green)': '#5ca040',
  'var(--green-light)': '#78c058',
  'var(--orange)': '#c47840',
  'var(--purple)': '#8060a0',
  'var(--red)': '#c44040',
  'var(--red-light)': '#e05555',
  'var(--text-bright)': '#f0ece0',
  'var(--text-dark)': '#8a8376',
  'var(--text-muted)': '#a29b8e',
  'var(--yellow)': '#c4a840',
};

function colourWithAlpha(colour: string, alpha: number): string {
  const hex = TOKEN_HEX[colour] ?? colour;
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return 'transparent';

  const raw = match[1];
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const Badge: React.FC<BadgeProps> = ({
  text,
  colour,
  variant = 'filled',
  className,
}) => {
  const badgeColour = colour || 'var(--gold)';

  const style: React.CSSProperties =
    variant === 'filled'
      ? {
          backgroundColor: colourWithAlpha(badgeColour, 0.13),
          color: badgeColour,
          borderTopColor: colourWithAlpha(badgeColour, 0.27),
          borderRightColor: colourWithAlpha(badgeColour, 0.27),
          borderBottomColor: colourWithAlpha(badgeColour, 0.27),
          borderLeftColor: colourWithAlpha(badgeColour, 0.27),
        }
      : {
          backgroundColor: 'transparent',
          color: badgeColour,
          borderTopColor: badgeColour,
          borderRightColor: badgeColour,
          borderBottomColor: badgeColour,
          borderLeftColor: badgeColour,
        };

  return (
    <span className={`badge badge--${variant}${className ? ` ${className}` : ''}`} style={style}>
      {text}
    </span>
  );
};

export default React.memo(Badge);
