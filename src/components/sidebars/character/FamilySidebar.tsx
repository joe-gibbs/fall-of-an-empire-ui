import { useMemo, useState } from 'react';
import { useFamilyTreeBridge } from '../../../bridge/characters/useCharactersBridge';
import { usePersonBridge } from '../../../bridge/characters/usePersonBridge';
import { useGameActions } from '../../../context/GameContext';
import { registerSidebar } from '../../../registry';
import { useWebUIText } from '../../../localization/WebUITextContext';
import { formatNumber } from '../../../utils/numberFormat';
import type { Character } from '../../../data/types';
import Portrait from '../../common/portraits/Portrait';
import PersonTooltip from '../../common/tooltips/PersonTooltip';
import FactionRoundel from '../../common/entities/FactionRoundel';
import StyledScrollArea from '../../common/layout/scrolling/StyledScrollArea';
import InteractionCard from '../../common/interactions/InteractionCard';
import SidebarToolbar from '../shared/SidebarToolbar';
import SidebarTabBar from '../shared/SidebarTabBar';
import { buildFamilyGraph } from './FamilyGraphModel';
import { FamilyGraphView } from './FamilyGraphPanel';
import '../shared/Sidebar.css';
import './CharacterSidebar.css';
import './FamilySidebar.css';

export function FamilyIdentity({ person, name }: { person: Character | null; name: string }) {
  const { openSidebar } = useGameActions();
  return <header className="family-identity">
    {person && <Portrait personId={person.id} resolvePerson={false} src={person.portrait} layers={person.portraitLayers}
      name={person.name} size="hero" shape="rect" showBorder={false} isAlive={person.isAlive} isImprisoned={person.isImprisoned} />}
    <div className="family-identity-caption">
      {person?.factionId && <FactionRoundel factionId={person.factionId} name={person.faction} size="md" showRing onClick={() => openSidebar('diplomacy', person.factionId!)} />}
      <div><h1>{name}</h1>{person && <PersonTooltip character={person} position="right">
        <button type="button" className="family-person-link" onClick={() => openSidebar('character', person.id)}>{person.name}</button>
      </PersonTooltip>}</div>
    </div>
  </header>;
}

export function FamilySidebar({ sidebarId, onClose }: { sidebarId: string | null; onClose: () => void }) {
  const t = useWebUIText();
  const { openSidebar, openScreen } = useGameActions();
  const personId = sidebarId?.startsWith('person:') ? sidebarId.slice(7) : sidebarId;
  const person = usePersonBridge(personId, 'full');
  const tree = useFamilyTreeBridge(personId, 'lineage', Boolean(personId));
  const graph = useMemo(() => person ? buildFamilyGraph(person, tree) : null, [person, tree]);
  const [tab, setTab] = useState('family');
  const familyName = tree?.familyName || person?.familyName;
  const familyHeading = person?.familyHeading || familyName || t('FamilySidebar.Title');
  return <aside className="sidebar sidebar--left sidebar--visible family-sidebar">
    <SidebarToolbar onClose={onClose} actionButtons={personId ? [
      { icon: '/assets/icons/I_Family.png', tooltip: t('Warbands.FamilyTree'), onClick: () => openScreen('familyTree', `tree:${personId}`) },
    ] : []} />
    <FamilyIdentity person={person} name={familyHeading} />
    <SidebarTabBar tabs={[
      { id: 'family', label: t('FamilySidebar.Title') },
      { id: 'members', label: t('FamilySidebar.Members') },
    ]} activeTab={tab} onTabChange={setTab} />
    <StyledScrollArea className="sidebar-content sidebar-content--textured">
      {tab === 'family' && graph && <FamilyGraphView graph={graph} onOpen={id => openSidebar('character', id)} />}
      {tab === 'members' && <div className="family-person-list">{tree?.nodes.map(member =>
        <PersonTooltip key={member.id} characterId={member.id} position="right">
          <button type="button" className="family-person-row" onClick={() => openSidebar('character', member.id)}>
            <Portrait personId={member.id} src={member.portrait} layers={member.portraitLayers} resolvePerson={false}
              name={member.name} size="md" shape="rect" showBorder isAlive={member.isAlive} isImprisoned={member.isImprisoned} />
            <span className="family-person-copy"><strong>{member.name}</strong><span>{member.shortTitle || member.title}</span>
              <small>{t('AgentSelect.CandidateAge', { Age: formatNumber(member.age) })}</small></span>
          </button>
        </PersonTooltip>)}</div>}
      {personId && <InteractionCard title={t('Warbands.FamilyTree')} image="/assets/icons/I_Family.png"
        onClick={() => openScreen('familyTree', `tree:${personId}`)} />}
    </StyledScrollArea>
  </aside>;
}

export default function FamilySidebarSlot(props: { sidebarId: string | null; onClose: () => void }) {
  return <FamilySidebar key={props.sidebarId} {...props} />;
}
registerSidebar({ id: 'family', side: 'left', component: FamilySidebarSlot });
