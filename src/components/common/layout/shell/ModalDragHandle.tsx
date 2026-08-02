import type { MouseEvent as ReactMouseEvent } from 'react';
import './ModalDragHandle.css';

interface ModalDragHandleProps {
  onMouseDown: (event: ReactMouseEvent<HTMLElement>) => void;
  className?: string;
}

/**
 * Thin gold grab strip used on floating modals (candidate pickers, unit
 * catalogue, and similar). Matches the event popup toolbar affordance.
 */
export default function ModalDragHandle({ onMouseDown, className }: ModalDragHandleProps) {
  return (
    <div
      className={`modal-drag-handle${className ? ` ${className}` : ''}`}
      onMouseDown={onMouseDown}
      aria-hidden="true"
    >
      <span className="modal-drag-handle__mark" />
    </div>
  );
}
