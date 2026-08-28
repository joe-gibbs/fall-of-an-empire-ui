import React from 'react';
import Tooltip from '../common/tooltips/Tooltip';
import IconButton from '../common/buttons/IconButton';
import { useWorldGlanceVisibilityBridge } from '../../bridge/military-map/useWorldGlanceVisibilityBridge';
import { webUIText } from '../../localization/WebUITextContext';

interface GlanceToggleBarProps {
  anchorRef?: React.RefObject<HTMLElement | null>;
}

const TOGGLES = [
  {
    id: 'settlements',
    icon: '/assets/icons/I_Capital.png',
    labelKey: 'GlanceToggle.Settlements',
    showKey: 'GlanceToggle.ShowSettlements',
    hideKey: 'GlanceToggle.HideSettlements',
    tutorialTarget: 'GlanceToggle:settlements',
  },
  {
    id: 'military',
    icon: '/assets/icons/I_ArmiesQuickButton.png',
    labelKey: 'GlanceToggle.Armies',
    showKey: 'GlanceToggle.ShowArmies',
    hideKey: 'GlanceToggle.HideArmies',
    tutorialTarget: 'GlanceToggle:armies',
  },
  {
    id: 'convoys',
    icon: '/assets/icons/I_Resources.png',
    labelKey: 'GlanceToggle.Convoys',
    showKey: 'GlanceToggle.ShowConvoys',
    hideKey: 'GlanceToggle.HideConvoys',
    tutorialTarget: 'GlanceToggle:convoys',
  },
] as const;

const GlanceToggleBar: React.FC<GlanceToggleBarProps> = ({ anchorRef }) => {
  const { state, toggleSettlements, toggleMilitary, toggleConvoys } = useWorldGlanceVisibilityBridge();
  const shown = {
    settlements: state?.showSettlements ?? true,
    military: state?.showMilitary ?? true,
    convoys: state?.showConvoys ?? true,
  };
  const onToggle = {
    settlements: toggleSettlements,
    military: toggleMilitary,
    convoys: toggleConvoys,
  };

  return (
    <div className="glance-toggle-bar" data-tutorial-target="GlanceToggleGroup">
      {TOGGLES.map((toggle) => {
        const active = shown[toggle.id];
        const label = webUIText(toggle.labelKey);
        const tooltip = webUIText(active ? toggle.hideKey : toggle.showKey);
        return (
          <Tooltip key={toggle.id} content={tooltip} position="left" delay={180} anchorRef={anchorRef}>
            <IconButton
              icon={toggle.icon}
              label={label}
              active={active}
              tutorialTarget={toggle.tutorialTarget}
              onClick={onToggle[toggle.id]}
            />
          </Tooltip>
        );
      })}
    </div>
  );
};

export default React.memo(GlanceToggleBar);
