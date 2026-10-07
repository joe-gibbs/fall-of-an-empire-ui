import React from 'react';
import Portrait, { type PortraitHandle } from '../../common/portraits/Portrait';
import { portraitLightFromMouseEvent } from '../../common/portraits/portraitLighting';
import PersonTooltip from '../../common/tooltips/PersonTooltip';
import FactionRoundel from '../../common/entities/FactionRoundel';
import FactionTooltip from '../../common/tooltips/FactionTooltip';
import Tooltip, { type TooltipLine } from '../../common/tooltips/Tooltip';
import type { Character } from '../../../data/types';
import { useGameActions } from '../../../context/GameContext';
import { usePerson } from '../../../data-source/index';
import { getOpinionColor } from '../../../utils/colorFormatters';
import { formatPersonActivity } from '../../../utils/displayLabels';
import { formatSignedNumber } from '../../../utils/numberFormat';
import {
  HeaderActivity,
  HeaderFamilyNameLink,
  HeaderOffice,
  HeaderRulerName,
} from './CharacterSidebarPanels';
import { useEntityLinkClick } from '../../../hooks/useEntityLinkClick';
import {
  buildHeaderAgeTooltip,
  getHeaderAgeValue,
  getOpinionIcon,
  lowerRelationDisplay,
  modifierTooltipLines,
} from './CharacterSidebarModel';
import { webUIText } from '../../../localization/WebUITextContext';
import './CharacterSidebar.css';

export default function CharacterSidebarHeader({ character }: { character: Character }) {
  const { openSidebar } = useGameActions();
  const spouseRel = character.relationships.find(r => r.type === 'Husband' || r.type === 'Wife' || r.type === 'Spouse' || r.type === 'Consort');
  const spouseId = spouseRel?.characterId || null;
  const spouse = usePerson(spouseId);
  const isAlive = character.isAlive !== false;
  const isImprisoned = character.isImprisoned === true;
  const showOpinionOfPlayer = isAlive
    && character.isPlayerCharacter !== true
    && character.opinionTowardPlayer !== undefined;
  const opinionOfPlayer = character.opinionTowardPlayer ?? 0;
  const opinionColor = getOpinionColor(opinionOfPlayer);
  const opinionIcon = getOpinionIcon(opinionOfPlayer);
  const opinionTooltipLines: TooltipLine[] = [
    {
      label: webUIText('Auto.ComponentsSidebarsDiplomacySidebar.409.4'),
      value: formatSignedNumber(opinionOfPlayer),
      valueColor: opinionColor,
    },
  ];
  const opinionBreakdownLines = modifierTooltipLines(character.opinionBreakdown);
  if (opinionBreakdownLines.length > 0) {
    opinionTooltipLines.push({ label: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1199.39'), isHeader: true });
    opinionTooltipLines.push(...opinionBreakdownLines);
  }

  const factionName = character.faction;
  const headerActivityLabel = formatPersonActivity(character.activity);
  const hasActivitySegments = (character.activitySegments?.length ?? 0) > 0;
  const officeTitle = character.title.trim();
  const rulingFactionLinkCount = (character.activitySegments ?? []).filter(segment => segment.linkType === 'faction').length;
  const hasLocationLink = (character.activitySegments ?? []).some(segment =>
    segment.linkType === 'settlement' || segment.linkType === 'military');
  const showLivingActivity = isImprisoned
    || character.activity !== 'RulingFaction'
    || rulingFactionLinkCount > 1
    || hasLocationLink;
  const playerRelationLabel = isAlive && character.isFamilyOfPlayer && character.relationToPlayer
    ? webUIText('CharacterSidebar.PlayerRelation', { Relation: lowerRelationDisplay(character.relationToPlayer) })
    : '';
  const deathStatusText = !isAlive
    ? [character.lifespan, character.deathCause].filter(Boolean).join(' - ')
    : '';
  const hasHeaderActivity = !isAlive
    || playerRelationLabel.length > 0
    || (showLivingActivity && (hasActivitySegments || headerActivityLabel.length > 0));
  const headerAgeValue = getHeaderAgeValue(character);
  const headerAgeTooltip = buildHeaderAgeTooltip(character, isAlive);
  const handleActivityLinkClick = useEntityLinkClick();
  const openFamilySidebar = React.useCallback(() => {
    openSidebar(character.usesWarbands ? 'kinship' : 'family', `person:${character.id}`);
  }, [character.id, character.usesWarbands, openSidebar]);
  const headerBackdropPortraitRef = React.useRef<PortraitHandle | null>(null);
  const headerForegroundPortraitRef = React.useRef<PortraitHandle | null>(null);
  const headerSpousePortraitRef = React.useRef<PortraitHandle | null>(null);
  const handleHeaderMouseMove = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const light = portraitLightFromMouseEvent(event);
    headerBackdropPortraitRef.current?.relight(light);
    headerForegroundPortraitRef.current?.relight(light);
    headerSpousePortraitRef.current?.relight(light);
  }, []);

  return (
    <div className={`char-header${!isAlive ? ' char-header--dead' : ''}`} onMouseMove={handleHeaderMouseMove}>
      <div className={`char-header-portrait${spouseRel ? ' char-header-portrait--with-spouse' : ''}`}>
        <Portrait ref={headerBackdropPortraitRef} personId={character.id} className="char-header-selected-backdrop" name={character.name} src={character.portrait} layers={character.portraitLayers} isAlive={isAlive} isImprisoned={isImprisoned} size="hero" shape="rect" showBorder={false} />
        {spouseRel && (
          <div className="char-header-spouse-wrap">
            <PersonTooltip character={spouse ?? undefined} characterId={spouse ? undefined : spouseId} position="left" delay={200}>
              <div className="char-header-spouse">
                <Portrait
                  ref={headerSpousePortraitRef}
                  personId={spouse?.id ?? spouseId ?? undefined}
                  name={spouse?.name ?? spouseRel.characterName}
                  src={spouse?.portrait ?? spouseRel.portrait}
                  layers={spouse?.portraitLayers}
                  isAlive={spouse?.isAlive ?? spouseRel.isAlive}
                  isImprisoned={spouse?.isImprisoned}
                  size="hero"
                  shape="rect"
                  showBorder={false}
                  showBadge={false}
                />
              </div>
            </PersonTooltip>
          </div>
        )}
        <Portrait ref={headerForegroundPortraitRef} personId={character.id} className="char-header-selected-foreground" name={character.name} src={character.portrait} layers={character.portraitLayers} isAlive={isAlive} isImprisoned={isImprisoned} size="hero" shape="rect" showBorder={false} />
      </div>
      {!isAlive && (
        <Tooltip content={{
          title: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1059.31'),
          get body() { return character.deathCause && character.deathDate ? webUIText("CharacterSidebar.DiedOfCauseOnDate", { DeathCause: character.deathCause, DeathDate: character.deathDate }) : character.deathCause ? webUIText("CharacterSidebar.DiedOf", { DeathCause: character.deathCause }) : webUIText("CharacterSidebar.ThisCharacterIs"); },
        }} position="bottom" delay={200}>
          <div className="char-header-dead-overlay">
            <img src="/assets/icons/I_Dread.png" alt="" className="char-header-dead-icon" />
          </div>
        </Tooltip>
      )}
      {character.factionId && (
        <div className="char-header-roundel">
          <FactionTooltip factionId={character.factionId} factionName={factionName} position="right" delay={200}>
            <FactionRoundel
              factionId={character.factionId}
              colour={character.factionColour}
              secondaryColour={character.factionSecondaryColour}
              emblem={character.factionEmblem}
              cultureGroup={character.factionCultureGroup}
              name={factionName}
              size="lg"
              showRing
              resolveFaction={false}
              diplomaticStatus={character.factionDiplomaticStatus}
              subjectSubtype={character.factionSubjectSubtype}
              isPlayer={character.factionIsPlayer}
              isRebel={character.factionIsRebel}
              onClick={() => openSidebar('diplomacy', character.factionId!)}
            />
          </FactionTooltip>
        </div>
      )}
      <div className="char-header-scrim">
        <div className="char-header-name-row">
          <div className="char-header-main-name">
            <Tooltip content={character.originalNameText ? { body: character.originalNameText } : null} position="bottom" delay={200} inline wrapperClassName="char-header-name-tooltip">
              {character.isRuler && character.shortTitle ? (
                <HeaderRulerName
                  shortTitle={character.shortTitle}
                  givenName={character.headerGivenName || character.name}
                  factionId={character.factionId}
                  factionNameWithArticle={character.rulerFactionName}
                  onOpenFaction={(id) => openSidebar('diplomacy', id)}
                />
              ) : (
                <span className="char-header-name">{character.name}</span>
              )}
            </Tooltip>
            <Tooltip content={headerAgeTooltip} position="bottom" delay={200} inline wrapperClassName="char-header-age-tooltip">
              <span className="char-header-age">{headerAgeValue}</span>
            </Tooltip>
          </div>
          {character.familyName && (
            <HeaderFamilyNameLink
              familyName={character.familyName}
              familyHeading={character.familyHeading}
              onOpenFamily={openFamilySidebar}
            />
          )}
          {!character.isRuler && <HeaderOffice title={officeTitle} />}
        </div>
        {(hasHeaderActivity || showOpinionOfPlayer) && (
          <div className="char-header-info-row">
            {hasHeaderActivity && (
              <div className="char-header-faction">
                {!isAlive ? (
                  <div className="char-header-lifespan">
                    <img src="/assets/icons/I_Skull.png" alt="" className="char-header-lifespan-icon" draggable={false} />
                    {deathStatusText && <span>{deathStatusText}</span>}
                  </div>
                ) : (
                  <HeaderActivity
                    playerRelation={playerRelationLabel}
                    hasActivitySegments={showLivingActivity && hasActivitySegments}
                    segments={character.activitySegments}
                    fallbackActivity={showLivingActivity ? headerActivityLabel : ''}
                    isImprisoned={isImprisoned}
                    onLinkClick={handleActivityLinkClick}
                  />
                )}
              </div>
            )}
            {showOpinionOfPlayer && (
              <div className="char-header-standing-badges">
                <Tooltip content={{
                  title: webUIText('Auto.Prop.ComponentsCommonPersonTooltip.221.3'),
                  lines: opinionTooltipLines,
                }} position="bottom" delay={200}>
                  <div className="char-header-opinion-badge" style={{ color: opinionColor }}>
                    <img src={opinionIcon} alt="" className="char-header-opinion-badge-icon" />
                  </div>
                </Tooltip>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
