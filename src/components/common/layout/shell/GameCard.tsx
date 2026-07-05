import React, { type ReactNode } from 'react';

interface GameCardProps {
  hoverable?: boolean;
  clickable?: boolean;
  className?: string;
  onClick?: () => void;
  children: ReactNode;
}

const GameCard: React.FC<GameCardProps> = ({
  hoverable,
  clickable,
  className,
  onClick,
  children,
}) => (
  <div
    className={`card${hoverable ? ' card--hoverable' : ''}${clickable ? ' card--clickable' : ''}${className ? ` ${className}` : ''}`}
    onClick={onClick}
  >
    {children}
  </div>
);

export default GameCard;
