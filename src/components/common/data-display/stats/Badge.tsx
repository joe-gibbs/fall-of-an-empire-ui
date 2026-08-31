import React from 'react';

interface BadgeProps {
  text: string;
  colour?: string;
  variant?: 'filled' | 'outline';
  className?: string;
}

function badgeTone(colour?: string): string {
  switch (colour) {
    case 'var(--green)':
    case 'var(--green-light)':
      return 'green';
    case 'var(--orange)':
      return 'orange';
    case 'var(--red)':
    case 'var(--red-light)':
      return 'red';
    case 'var(--blue)':
      return 'subject';
    case 'var(--gold)':
    case 'var(--gold-light)':
    case 'var(--yellow)':
      return 'gold';
    default:
      return 'gold';
  }
}

const Badge: React.FC<BadgeProps> = ({
  text,
  colour,
  className,
}) => {
  const tone = badgeTone(colour);
  return (
    <span className={`badge badge--${tone}${className ? ` ${className}` : ''}`}>
      {text}
    </span>
  );
};

export default React.memo(Badge);
