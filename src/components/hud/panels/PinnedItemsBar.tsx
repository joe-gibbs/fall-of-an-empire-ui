import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
/**
 * PinnedItemsBar - Dropdown panel for pinned settlements, characters, armies,
 * and factions. Opens from the existing pin button in the TopBar, positioned
 * below the ruler portrait.
 */
import Portrait from '../../common/portraits/Portrait';
import PersonTooltip from '../../common/tooltips/PersonTooltip';
import Tooltip from '../../common/tooltips/Tooltip';
import SectionHeading from '../../common/data-display/stats/SectionHeading';
import { useAnchoredDropdown } from '../../../hooks/useAnchoredDropdown';
import './PinnedItemsBar.css';

export interface PinnedItem {
  id: string;
  type: 'settlement' | 'character' | 'military' | 'faction';
  name: string;
  detail?: string;
  icon?: string;
  portrait?: string;
}

interface PinnedItemsBarProps {
  isOpen: boolean;
  onClose: () => void;
  items: PinnedItem[];
  onItemClick?: (item: PinnedItem) => void;
  onUnpin?: (item: PinnedItem) => void;
  onUnpinAll?: (type: PinnedItem['type']) => void;
}

const typeIcons: Record<string, string> = {
  settlement: '/assets/icons/I_Capital.png',
  character: '/assets/icons/I_Characters.png',
  military: '/assets/icons/I_ArmiesQuickButton.png',
  faction: '/assets/icons/I_Diplomacy.png',
};

const typeLabels: Record<string, string> = {
  get settlement() { return webUIText('PinnedItems.Type.Settlements'); },
  get character() { return webUIText('PinnedItems.Type.Characters'); },
  get military() { return webUIText('PinnedItems.Type.Armies'); },
  get faction() { return webUIText('PinnedItems.Type.Factions'); },
};

const typeOrder: PinnedItem['type'][] = ['settlement', 'character', 'military', 'faction'];
const EXIT_DURATION_MS = 120;

function PinnedItemRow({ item, onItemClick, onUnpin }: {
  item: PinnedItem;
  onItemClick?: () => void;
  onUnpin?: () => void;
}) {
  const icon = item.icon || typeIcons[item.type];
  const isCharacter = item.type === 'character';

  const row = (
    <div className="pinned-item-row" onClick={onItemClick}>
      {isCharacter ? (
        <Portrait
          personId={item.id}
          name={item.name}
          size="sm"
          shape="circle"
          showBorder
        />
      ) : (
        <img src={icon} alt="" className="pinned-item-icon" />
      )}
      <div className="pinned-item-info">
        <span className="pinned-item-name">{item.name}</span>
        {item.detail && <span className="pinned-item-detail">{item.detail}</span>}
      </div>
      {onUnpin && (
        <Tooltip content={webUIText("Auto.Attr.componentshudPinnedItemsBar.75.1")} position="left" delay={300}>
          <button className="pinned-item-unpin" onClick={(e) => { e.stopPropagation(); onUnpin(); }}>
            <img src="/assets/icons/I_Pin_Pinned.png" alt="" className="pinned-item-unpin-icon" />
          </button>
        </Tooltip>
      )}
    </div>
  );

  if (isCharacter) {
    return (
      <PersonTooltip characterId={item.id} position="left" delay={200}>
        {row}
      </PersonTooltip>
    );
  }

  return (
    <Tooltip content={{ title: item.name, body: item.detail || '' }} position="left" delay={200}>
      {row}
    </Tooltip>
  );
}

export default function PinnedItemsBar({ isOpen, onClose, items, onItemClick, onUnpin, onUnpinAll }: PinnedItemsBarProps) {
  const { mounted, closing, style, setPopupRef } = useAnchoredDropdown({
    open: isOpen,
    onClose,
    durationMs: EXIT_DURATION_MS,
    position: 'below-right',
    anchorSelector: '.pinned-toggle-btn',
    escapeId: 'hud.pinned-items',
  });

  if (!mounted) return null;

  const grouped = typeOrder
    .map(type => ({
      type,
      label: typeLabels[type],
      items: items.filter(i => i.type === type),
    }))
    .filter(g => g.items.length > 0);

  return (
    <div className={`pinned-dropdown${closing ? ' pinned-dropdown--exiting' : ''}`} ref={setPopupRef} style={style}>
      <div className="pinned-dropdown-header">
        <img src="/assets/icons/I_Pin_Pinned.png" alt="" className="pinned-dropdown-header-icon" />
        <span className="pinned-dropdown-title"><WebUIText textKey="Auto.ComponentsHudPinnedItemsBar.122.1" /></span>
        <span className="pinned-dropdown-count">{items.length}</span>
      </div>

      <div className="pinned-dropdown-body">
        {items.length === 0 ? (
          <div className="pinned-dropdown-empty">
            <img src="/assets/icons/I_Pin_Unpinned.png" alt="" className="pinned-dropdown-empty-icon" />
            <span className="pinned-dropdown-empty-text"><WebUIText textKey="Auto.ComponentsHudPinnedItemsBar.130.2" /></span>
          </div>
        ) : (
          grouped.map(group => (
            <div key={group.type}>
              <div className="pinned-section-header">
                <SectionHeading variant="ornate" title={group.label} count={group.items.length} />
                <Tooltip content={webUIText("Auto.Attr.componentshudPinnedItemsBar.138.1", { Value1: group.label.toLowerCase() })} position="left" delay={300}>
                  <button
                    className="pinned-unpin-all"
                    onClick={() => onUnpinAll?.(group.type)}
                  >
                    <WebUIText textKey="Auto.ComponentsHudPinnedItemsBar.142.3" />
                  </button>
                </Tooltip>
              </div>
              {group.items.map(item => (
                <PinnedItemRow
                  key={`${item.type}:${item.id}`}
                  item={item}
                  onItemClick={() => { onItemClick?.(item); onClose(); }}
                  onUnpin={onUnpin ? () => onUnpin(item) : undefined}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
