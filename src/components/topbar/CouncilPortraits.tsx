import React from 'react';

import { webUIText } from '../../localization/WebUITextContext';
interface CouncilMember {
  id: string;
  name: string;
  title: string;
  colour: string;
}

interface CouncilPortraitsProps {
  members?: CouncilMember[];
  onPortraitClick?: (id: string) => void;
}

const defaultMembers: CouncilMember[] = [
  { id: '1', get name() { return webUIText("Auto.Prop.componentstopbarCouncilPortraits.17.1"); }, get title() { return webUIText('Auto.TopProp.ComponentsTopbarCouncilPortraits.16.1'); }, colour: '#6b2d5b' },
  { id: '2', get name() { return webUIText("Auto.Prop.componentstopbarCouncilPortraits.18.1"); }, get title() { return webUIText('Auto.TopProp.ComponentsTopbarCouncilPortraits.17.2'); }, colour: '#2d4a6b' },
  { id: '3', get name() { return webUIText("Auto.Prop.componentstopbarCouncilPortraits.19.1"); }, get title() { return webUIText('Auto.TopProp.ComponentsTopbarCouncilPortraits.18.3'); }, colour: '#4a6b2d' },
  { id: '4', get name() { return webUIText("Auto.Prop.componentstopbarCouncilPortraits.20.1"); }, get title() { return webUIText('Auto.TopProp.ComponentsTopbarCouncilPortraits.19.4'); }, colour: '#6b4a2d' },
  { id: '5', get name() { return webUIText("Auto.Prop.componentstopbarCouncilPortraits.21.1"); }, get title() { return webUIText('Auto.TopProp.ComponentsTopbarCouncilPortraits.20.5'); }, colour: '#3d2d6b' },
  { id: '6', get name() { return webUIText("Auto.Prop.componentstopbarCouncilPortraits.22.1"); }, get title() { return webUIText('Auto.TopProp.ComponentsTopbarCouncilPortraits.21.6'); }, colour: '#5b2d3d' },
];

const CouncilPortraits: React.FC<CouncilPortraitsProps> = ({
  members = defaultMembers,
  onPortraitClick,
}) => {
  return (
    <div className="council-portraits">
      {members.map((member, i) => (
        <div
          key={member.id}
          className="council-portrait"
          style={{ zIndex: members.length - i }}
          onClick={() => onPortraitClick?.(member.id)}
        >
          <div
            className="council-portrait-inner"
            style={{ backgroundImage: `linear-gradient(180deg, ${member.colour}, ${member.colour}88)` }}
          >
            <img src="/assets/icons/I_PersonSilhouette.png" alt="" className="council-portrait-silhouette" draggable={false} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default CouncilPortraits;
