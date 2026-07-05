import React from 'react';
import Portrait from '../../common/portraits/Portrait';
import PersonTooltip from '../../common/tooltips/PersonTooltip';
import { firstName, type FamilyGraph, type FamilyGraphEntry } from './FamilyGraphModel';

function FamilyGraphCard({
  entry,
  onOpen,
}: {
  entry: FamilyGraphEntry;
  onOpen: (id: string) => void;
}) {
  const displayName = entry.name;
  const familyName = firstName(displayName);
  const detail = entry.label;
  const isAlive = entry.isAlive;
  const isImprisoned = entry.isImprisoned === true;
  const canOpen = Boolean(entry.id) && !entry.isFocus;
  const activity = entry.activity ?? 'InCourt';
  const commanderKind = entry.commanderKind;
  const isPlayerCharacter = entry.isPlayerCharacter;
  const isRuler = entry.isRuler;
  const isHeir = entry.isHeir;
  const isDesignatedHeir = entry.isDesignatedHeir;

  return (
    <button
      type="button"
      className={`char-family-card${entry.isFocus ? ' char-family-card--focus' : ''}${isAlive === false ? ' char-family-card--dead' : ''}${isImprisoned && isAlive !== false ? ' char-family-card--imprisoned' : ''}${canOpen ? '' : ' char-family-card--static'}`}
      onMouseDown={canOpen ? () => onOpen(entry.id) : undefined}
      aria-label={displayName}
    >
      <PersonTooltip characterId={entry.id} position="left" delay={150}>
        <span className="char-family-card-portrait">
          <Portrait
            personId={entry.id}
            resolvePerson={false}
            src={entry.portrait}
            layers={entry.portraitLayers}
            isImprisoned={entry.isImprisoned}
            isAlive={isAlive}
            badge={entry.badge}
            name={displayName}
            size="lg"
            shape="rect"
            showBorder
            activity={activity}
            commanderKind={commanderKind}
            isPlayerCharacter={isPlayerCharacter}
            isRuler={isRuler}
            isHeir={isHeir}
            isDesignatedHeir={isDesignatedHeir}
            isPreviousRuler={entry.isPreviousRuler}
          />
          {isAlive === false && <span className="char-rel-state-badge char-rel-state-badge--dead"><img src="/assets/icons/I_Skull.png" alt="" draggable={false} /></span>}
          {isImprisoned && isAlive !== false && <span className="char-rel-state-badge char-rel-state-badge--imprisoned"><img src="/assets/person-interactions/icons/ImprisonCharacter.png" alt="" draggable={false} /></span>}
        </span>
      </PersonTooltip>
      <span className="char-family-card-copy">
        <span className="char-family-card-name">{familyName}</span>
        <span className="char-family-card-role">{entry.label}</span>
        {detail && detail !== entry.label && <span className="char-family-card-detail">{detail}</span>}
      </span>
    </button>
  );
}

export function FamilyGraphView({
  graph,
  onOpen,
}: {
  graph: FamilyGraph;
  onOpen: (id: string) => void;
}) {
  if (graph.rows.length === 0) return null;

  return (
    <div className="char-family-tree">
      {graph.rows.map(row => (
        <div key={row.id} className={`char-family-row char-family-row--${row.id}`}>
          <div className="char-family-row-label">{row.title}</div>
          <div className={`char-family-row-cards${row.entries.length > 1 ? ' char-family-row-cards--multi' : ''}`}>
            {row.entries.map(entry => {
              const descendants = entry.descendants ?? [];
              const branchStyle: React.CSSProperties | undefined = descendants.length > 0
                ? { width: `${Math.max(5.9, descendants.length * 5.9)}rem` }
                : undefined;

              return (
                <div key={entry.id} className={`char-family-branch${descendants.length > 0 ? ' char-family-branch--with-descendants' : ''}`} style={branchStyle}>
                  <div className="char-family-branch-head">
                    <FamilyGraphCard entry={entry} onOpen={onOpen} />
                  </div>
                  {descendants.length > 0 && (
                    <div className="char-family-descendants">
                      <div className="char-family-descendants-label">{row.descendantTitle}</div>
                      <div className={`char-family-descendant-cards${descendants.length > 1 ? ' char-family-descendant-cards--multi' : ''}`}>
                        {descendants.map(descendant => (
                          <div key={descendant.id} className="char-family-descendant-branch">
                            <FamilyGraphCard entry={descendant} onOpen={onOpen} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

