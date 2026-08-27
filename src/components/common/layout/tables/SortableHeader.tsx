import type { CSSProperties, ReactNode } from 'react';
import { playSound } from '../../../../hooks/useSound';
import type { SortDirection, SortState } from './sortUtils';
import './SortableHeader.css';

function SortIndicator({ direction, active }: { direction: SortDirection; active: boolean }) {
  if (!active) {
    return (
      <span className="sort-indicator sort-indicator--inactive" aria-hidden="true">
        <span className="sort-indicator__triangle sort-indicator__triangle--up" />
        <span className="sort-indicator__triangle sort-indicator__triangle--down" />
      </span>
    );
  }

  return (
    <span className={`sort-indicator sort-indicator--${direction}`} aria-hidden="true">
      <span className="sort-indicator__triangle" />
    </span>
  );
}

export default function SortableHeader<T extends string>({
  id,
  label,
  sort,
  onSort,
  className = '',
  activeClassName = '',
  contentClassName = '',
  style,
  role = 'columnheader',
}: {
  id: T;
  label: ReactNode;
  sort: SortState<T>;
  onSort: (key: T) => void;
  className?: string;
  activeClassName?: string;
  contentClassName?: string;
  style?: CSSProperties;
  role?: string;
}) {
  const active = sort.key === id;

  return (
    <button
      type="button"
      role={role}
      style={style}
      className={[
        'sortable-header-button',
        className,
        active ? 'sortable-header-button--active' : '',
        active && activeClassName ? activeClassName : '',
      ].filter(Boolean).join(' ')}
      onClick={() => {
        playSound('click');
        onSort(id);
      }}
    >
      <span className={['sortable-header-content', contentClassName].filter(Boolean).join(' ')}>
        <span className="sortable-header-label">{label}</span>
        <SortIndicator direction={sort.direction} active={active} />
      </span>
    </button>
  );
}
