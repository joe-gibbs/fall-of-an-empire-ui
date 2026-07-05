import React from 'react';
import CloseButton from '../../common/buttons/CloseButton';
import Tooltip from '../../common/tooltips/Tooltip';
import './SidebarToolbar.css';

interface ToolbarButton {
  icon?: string;
  tooltip: string;
  tooltipBody?: string;
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  tone?: 'default' | 'danger';
  tutorialTarget?: string;
}

interface SidebarToolbarProps {
  navButtons?: ToolbarButton[];
  actionButtons?: ToolbarButton[];
  onClose: () => void;
  closePosition?: 'start' | 'end';
}

function toolbarButtonClassName(btn: ToolbarButton): string {
  return `sidebar-toolbar-btn${btn.isActive ? ' sidebar-toolbar-btn--active' : ''}${btn.tone === 'danger' ? ' sidebar-toolbar-btn--danger' : ''}`;
}

const SidebarToolbar: React.FC<SidebarToolbarProps> = ({ navButtons = [], actionButtons = [], onClose, closePosition = 'end' }) => (
  <div className="sidebar-toolbar">
    {closePosition === 'start' && (
      <div className="sidebar-toolbar-close">
        <CloseButton size="sm" onClick={onClose} />
      </div>
    )}
    <div className="sidebar-toolbar-nav">
      {navButtons.map((btn, i) => (
        <Tooltip key={i} content={{ title: btn.tooltip, body: btn.tooltipBody }} position="bottom" delay={200}>
          <button className={toolbarButtonClassName(btn)} data-tutorial-target={btn.tutorialTarget} onClick={btn.onClick} disabled={btn.disabled}>
            {btn.icon && <img src={btn.icon} alt="" className="sidebar-toolbar-btn-icon" />}
          </button>
        </Tooltip>
      ))}
    </div>
    <div className="sidebar-toolbar-actions">
      {actionButtons.map((btn, i) => (
        <Tooltip key={i} content={{ title: btn.tooltip, body: btn.tooltipBody }} position="bottom" delay={200}>
          <button className={toolbarButtonClassName(btn)} data-tutorial-target={btn.tutorialTarget} onClick={btn.onClick} disabled={btn.disabled}>
            {btn.icon && <img src={btn.icon} alt="" className="sidebar-toolbar-btn-icon" />}
          </button>
        </Tooltip>
      ))}
      {closePosition === 'end' && <CloseButton size="sm" onClick={onClose} />}
    </div>
  </div>
);

export default SidebarToolbar;
