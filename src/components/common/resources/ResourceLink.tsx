import type { MouseEvent, ReactNode } from 'react';
import { useResourceDetails } from '../../../context/ResourceDetailsContext';
import './ResourceLink.css';

interface Props {
  resourceId: string;
  children: ReactNode;
  className?: string;
  stopPropagation?: boolean;
}

export default function ResourceLink({ resourceId, children, className, stopPropagation = true }: Props) {
  const { openResource } = useResourceDetails();
  const onMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (stopPropagation) event.stopPropagation();
    openResource(resourceId);
  };

  return (
    <button type="button" className={`resource-link${className ? ` ${className}` : ''}`} onClick={onMouseDown}>
      {children}
    </button>
  );
}
