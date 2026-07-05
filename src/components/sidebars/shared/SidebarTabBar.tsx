import React from 'react';
import { playSound } from '../../../hooks/useSound';
import { formatNumber } from '../../../utils/numberFormat';
import './SidebarTabBar.css';

interface SidebarTab {
  id: string;
  label: string;
  count?: number;
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
          onMouseDown={() => { playSound('tab'); handleChange(tab.id); }}
        >
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
