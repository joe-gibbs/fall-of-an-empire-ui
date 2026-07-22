import React from 'react';
import { playSound } from '../../../hooks/useSound';
import { formatNumber } from '../../../utils/numberFormat';
import { WebkilnAssetPath } from '../../../utils/assets';
import './SidebarTabBar.css';

interface SidebarTab {
  id: string;
  label: string;
  count?: number;
  icon?: string;
}

interface SidebarTabBarProps {
  tabs: SidebarTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onChange?: (id: string) => void;
}

const SidebarTabBar: React.FC<SidebarTabBarProps> = ({ tabs, activeTab, onTabChange, onChange }) => {
  const handleChange = onTabChange || onChange || (() => {});
  return (
    <div className="sidebar-tab-bar" data-tutorial-target="SidebarTabBar">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`sidebar-tab${tab.id === activeTab ? ' sidebar-tab--active' : ''}`}
          data-tutorial-target={`SidebarTab:${tab.id}`}
          data-tutorial-satisfied={tab.id === activeTab ? 'true' : undefined}
          onMouseDown={() => { playSound('tab'); handleChange(tab.id); }}
        >
          {tab.icon && <img src={WebkilnAssetPath(tab.icon)} alt="" className="sidebar-tab-icon" draggable={false} />}
          {tab.label}
          {tab.count !== undefined && (
            <span className="sidebar-tab-count">{formatNumber(tab.count)}</span>
          )}
        </button>
      ))}
    </div>
  );
};

export default React.memo(SidebarTabBar);
