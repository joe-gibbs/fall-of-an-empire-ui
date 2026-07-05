import type { MouseEvent, ReactNode } from 'react';
import { useGameActions } from '../../../context/GameContext';
import { sidebarTypeForEntity } from './entityLinkUtils';
import './EntityLink.css';

interface EntityLinkProps {
  type: string;
  id?: string | null;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
  labelClassName?: string;
  fallbackClassName?: string;
  inline?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

export default function EntityLink({
  type,
  id,
  children,
  icon,
  className,
  labelClassName,
  fallbackClassName,
  inline = false,
  preventDefault = true,
  stopPropagation = true,
}: EntityLinkProps) {
  const { openSidebar } = useGameActions();
  const sidebarType = sidebarTypeForEntity(type);

  if (!id || !sidebarType) {
    return <span className={fallbackClassName}>{children}</span>;
  }

  const classes = [
    'entity-link',
    inline ? 'entity-link--inline' : '',
    className ?? '',
  ].filter(Boolean).join(' ');
  const labelClasses = [
    'entity-link__label',
    labelClassName ?? '',
  ].filter(Boolean).join(' ');

  const handleMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    if (preventDefault) event.preventDefault();
    if (stopPropagation) event.stopPropagation();
    openSidebar(sidebarType, id);
  };

  return (
    <button type="button" className={classes} onMouseDown={handleMouseDown}>
      {icon}
      <span className={labelClasses}>{children}</span>
    </button>
  );
}
