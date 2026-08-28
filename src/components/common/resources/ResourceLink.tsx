import type { MouseEvent, ReactNode } from 'react';
import { useOptionalResourceDetails } from '../../../context/ResourceDetailsContext';
import './ResourceLink.css';

interface Props {
  resourceId: string;
  children: ReactNode;
  className?: string;
  stopPropagation?: boolean;
}

export default function ResourceLink({ resourceId, children, className, stopPropagation = true }: Props) {
  const resourceDetails = useOptionalResourceDetails();
  const classes = `resource-link${className ? ` ${className}` : ''}`;
  if (!resourceDetails) {
    return <span className={classes}>{children}</span>;
  }

  const onClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (stopPropagation) event.stopPropagation();
    resourceDetails.openResource(resourceId);
  };

  return (
    <button type="button" className={classes} onClick={onClick}>
      {children}
    </button>
  );
}
