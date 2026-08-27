import React, { type ReactNode } from 'react';
import CloseButton from '../../buttons/CloseButton';
import StyledScrollArea from '../scrolling/StyledScrollArea';
import Tooltip from '../../tooltips/Tooltip';
import { useOptionalGameActions } from '../../../../context/GameContext';
import type { AdvisorTopicId } from '../../../../data/advisorTopics';

import { webUIText } from '../../../../localization/WebUITextContext';
interface ScreenShellProps {
  title: string;
  onClose: () => void;
  advisorTopic?: AdvisorTopicId;
  titleExtra?: ReactNode;
  headerExtra?: ReactNode;
  tabs?: ReactNode;
  className?: string;
  contentClassName?: string;
  styledScrollContent?: boolean;
  children: ReactNode;
}

const ScreenShell: React.FC<ScreenShellProps> = ({
  title,
  onClose,
  advisorTopic,
  titleExtra,
  headerExtra,
  tabs,
  className,
  contentClassName,
  styledScrollContent = false,
  children,
}) => {
  const gameActions = useOptionalGameActions();
  const contentClass = `screen-content${contentClassName ? ` ${contentClassName}` : ''}`;
  const content = styledScrollContent ? (
    <StyledScrollArea className={contentClass} tutorialTarget="ScreenContent">{children}</StyledScrollArea>
  ) : (
    <div className={contentClass} data-tutorial-target="ScreenContent">{children}</div>
  );

  return (
    <div
      className={`screen${className ? ` ${className}` : ''}`}
      data-tutorial-target="Screen ScreenShell"
      data-focus-root="screen"
      data-focus-priority="400"
    >
      <div className="screen-header" data-tutorial-target="ScreenHeader">
        <div className="screen-title-area" data-tutorial-target="ScreenTitleArea">
          <h1 className="screen-title" data-tutorial-target="ScreenTitle">{title}</h1>
          {titleExtra}
        </div>
        <div className="screen-header-actions">
          {advisorTopic && gameActions && (
            <Tooltip content={{ title: webUIText('Auto.Prop.ComponentsCommonScreenShell.53.1') }} position="bottom" delay={150}>
              <button
                type="button"
                className="screen-help-button"
                data-tutorial-target="ScreenHelpButton"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  gameActions.showAdvisor(advisorTopic, { force: true });
                }}
              >
                <img src="/assets/ui/I_HelpIcon.png" alt="" className="screen-help-button-icon" draggable={false} />
              </button>
            </Tooltip>
          )}
          <CloseButton onClick={onClose} />
        </div>
      </div>
      {tabs}
      {headerExtra}
      {content}
    </div>
  );
};

export default ScreenShell;
