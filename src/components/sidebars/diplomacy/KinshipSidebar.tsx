import { useKinshipGroupDetailBridge, useKinshipGroupsBridge } from '../../../bridge/diplomacy/useKinshipGroupsBridge';
import { useGameActions } from '../../../context/GameContext';
import { registerSidebar } from '../../../registry';
import { useWebUIText } from '../../../localization/WebUITextContext';
import StyledScrollArea from '../../common/layout/scrolling/StyledScrollArea';
import SidebarToolbar from '../shared/SidebarToolbar';
import ClanDetailsPanel from '../../screens/diplomacy/ClanDetailsPanel';
import './KinshipSidebar.css';

export function KinshipSidebar({ sidebarId, onClose }: { sidebarId: string | null; onClose: () => void }) {
  const t = useWebUIText();
  const { openSidebar, openScreen } = useGameActions();
  const personId = sidebarId?.startsWith('person:') ? sidebarId.slice(7) : null;
  const clans = useKinshipGroupsBridge();
  const localGroup = clans?.groups.find(entry => personId
    ? entry.headId === personId || entry.members.some(member => member.id === personId)
    : entry.id === sidebarId);
  // Local clans use the existing daily subscription; foreign clans are resolved by their member.
  const foreign = Boolean(clans && !localGroup);
  const detail = useKinshipGroupDetailBridge(foreign && !personId ? sidebarId : null, foreign ? personId : null);
  const group = localGroup ?? (detail?.found ? detail.group : null);
  return <aside className="sidebar sidebar--left sidebar--visible kinship-sidebar">
    <SidebarToolbar onClose={onClose} actionButtons={group ? [
      { icon: '/assets/icons/I_Kinship.png', tooltip: t('KinshipGroups.Title'), onClick: () => openScreen('powerBlocs', group.id) },
    ] : []} />
    <StyledScrollArea className="sidebar-content sidebar-content--textured">
      {group && <ClanDetailsPanel key={group.id} group={group} showStanding onSelectClan={id => openSidebar('kinship', id)} />}
    </StyledScrollArea>
  </aside>;
}
export default function KinshipSidebarSlot(props: { sidebarId: string | null; onClose: () => void }) {
  return <KinshipSidebar key={props.sidebarId} {...props} />;
}
registerSidebar({ id: 'kinship', side: 'left', component: KinshipSidebarSlot });

