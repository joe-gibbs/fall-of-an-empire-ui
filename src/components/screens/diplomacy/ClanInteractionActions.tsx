import { useCallback, useMemo, useState } from 'react';
import type { KinshipGroupEntry } from '../../../bridge-types.generated';
import { usePersonInteractionsBridge, type PersonInteractionView } from '../../../bridge/characters/usePersonInteractionsBridge';
import { usePerson } from '../../../data-source';
import { useGameActions } from '../../../context/GameContext';
import { useWebUIText } from '../../../localization/WebUITextContext';
import InteractionCard from '../../common/interactions/InteractionCard';
import Tooltip from '../../common/tooltips/Tooltip';
import PersonInteractionInitiatorModal from '../../modals/people/PersonInteractionInitiatorModal';
import PersonInteractionGiftModal from '../../modals/people/PersonInteractionGiftModal';
import { buildInteractionTooltip } from '../../sidebars/character/CharacterSidebarModel';
import './ClanInteractionActions.css';

const CLAN_INTERACTION_IDS = new Set(['offergift', 'proposemarriage']);

export default function ClanInteractionActions({ group }: { group: KinshipGroupEntry }) {
  const t = useWebUIText();
  const { addNotification } = useGameActions();
  const head = usePerson(group.headId);
  const {
    state: interactionsState,
    start: startInteraction,
    cancel: cancelInteraction,
    loadOptions: loadInteractionOptions,
  } = usePersonInteractionsBridge(group.headId);
  const [giftModalInteraction, setGiftModalInteraction] = useState<PersonInteractionView | null>(null);
  const [initiatorInteraction, setInitiatorInteraction] = useState<PersonInteractionView | null>(null);
  const clanActions = useMemo(
    () => (interactionsState?.interactions ?? []).filter(interaction => interaction.availability !== 'hidden' && CLAN_INTERACTION_IDS.has(interaction.id.toLowerCase())),
    [interactionsState],
  );

  const notifyInteractionFailure = useCallback((message?: string) => {
    addNotification({
      title: t('Auto.Prop.ComponentsSidebarsCharacterSidebar.941.30'),
      get description() { return message || t('CharacterSidebar.TheActionCould'); },
      type: 'character',
    });
  }, [addNotification, t]);

  const handleInteractionClick = useCallback(async (interaction: PersonInteractionView) => {
    if (interaction.availability !== 'available') return;
    if (interaction.needsInitiatorSelection) {
      const loaded = await loadInteractionOptions(interaction.id);
      if (!loaded || loaded.availability !== 'available' || loaded.initiatorCandidates.length === 0) {
        notifyInteractionFailure(loaded?.reasons[0]?.reason);
        return;
      }
      setGiftModalInteraction(null);
      setInitiatorInteraction(loaded);
      return;
    }
    if (interaction.needsGiftSelection) {
      const loaded = await loadInteractionOptions(interaction.id);
      if (!loaded || loaded.availability !== 'available' || loaded.giftOptions.length === 0) {
        notifyInteractionFailure(loaded?.reasons[0]?.reason);
        return;
      }
      setInitiatorInteraction(null);
      setGiftModalInteraction(loaded);
      return;
    }
    const response = await startInteraction(interaction.id);
    if (!response?.started) notifyInteractionFailure(response?.message);
  }, [loadInteractionOptions, notifyInteractionFailure, startInteraction]);

  return <>
    <div className="clan-interactions">
      {clanActions.map(interaction => {
        const matchesOutcome = interactionsState?.lastCompletedInteractionId === interaction.id;
        return <Tooltip key={`${group.headId}:${interaction.id}`} content={buildInteractionTooltip(interaction, group.headId, group.headName)} position="left" delay={150} variant="sidebar">
          <InteractionCard
            title={interaction.name}
            description={interaction.description}
            image={interaction.iconUrl}
            bgImage={interaction.backgroundUrl}
            durationDays={interaction.durationDays}
            remainingDays={interaction.remainingDays}
            inProgress={interaction.inProgress}
            outcome={matchesOutcome ? interactionsState.lastInteractionSucceeded ? 'success' : 'failure' : undefined}
            outcomeText={matchesOutcome ? interactionsState.lastInteractionOutcomeText : undefined}
            outcomeKey={matchesOutcome ? `${interactionsState.lastInteractionCompletedDate}:${interaction.id}` : undefined}
            cooldownDays={interaction.cooldownDays}
            cooldownRemainingDays={interaction.cooldownRemainingDays}
            tutorialTarget={`Interaction:${interaction.id}${interaction.id === 'offergift' ? ' OfferGiftButton' : ''}${interaction.id === 'proposemarriage' ? ' ProposeMarriageButton' : ''}`}
            onClick={interaction.availability === 'available' && !interaction.inProgress
              ? () => { void handleInteractionClick(interaction); }
              : undefined}
            onCancel={interaction.inProgress ? () => { void cancelInteraction(); } : undefined}
          />
        </Tooltip>;
      })}
    </div>
    {initiatorInteraction && (
      <PersonInteractionInitiatorModal
        key={`${group.headId}:${initiatorInteraction.id}`}
        interaction={initiatorInteraction}
        targetPersonId={group.headId}
        targetPersonName={group.headName}
        onClose={() => setInitiatorInteraction(null)}
        onConfirm={async (candidateId) => {
          const response = await startInteraction(initiatorInteraction.id, { initiatorPersonId: candidateId });
          if (!response?.started) return response?.message || t('CharacterSidebar.ActionStartFailed');
          setInitiatorInteraction(null);
          return null;
        }}
      />
    )}
    {giftModalInteraction && head && (
      <PersonInteractionGiftModal
        key={giftModalInteraction.id}
        interaction={giftModalInteraction}
        targetPersonId={group.headId}
        targetPersonName={group.headName}
        targetPersonTitle={head.shortTitle || head.title}
        targetPersonPortrait={head.portrait}
        targetPortraitLayers={head.portraitLayers}
        targetIsImprisoned={head.isImprisoned}
        playerGold={interactionsState?.playerGold ?? 0}
        onClose={() => setGiftModalInteraction(null)}
        onConfirm={async (giftTypeIndex) => {
          const response = await startInteraction(giftModalInteraction.id, { giftTypeIndex });
          if (!response?.started) return response?.message || t('CharacterSidebar.ActionStartFailed');
          setGiftModalInteraction(null);
          return null;
        }}
      />
    )}
  </>;
}
