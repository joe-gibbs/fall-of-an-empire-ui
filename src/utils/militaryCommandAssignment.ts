import { RANK_META, rankLabel, type Force, type Rank } from '../components/screens/Military/forces';
import { webUIText } from '../localization/WebUITextContext';

export interface CommandAssignmentForce {
  id: string;
  name: string;
  parentId: string | null;
  rank: string;
  isNavy: boolean;
  isPersonalGuard?: boolean;
  isPlayerControlled: boolean;
  factionId?: string;
  subordinateCount?: number;
  subordinateCapacity?: number;
}

export type CommandAssignmentResult =
  | { ok: true; reason: string }
  | { ok: false; reason: string };

let commandDragClickGuardUntil = 0;

export function markCommandDragConsumed() {
  commandDragClickGuardUntil = performance.now() + 500;
}

export function consumeCommandDragClick(): boolean {
  return performance.now() < commandDragClickGuardUntil;
}

export function commandRankTier(rank: string | undefined): number {
  if (!rank) return 0;
  return RANK_META[rank as Rank]?.tier ?? 0;
}

export function canDragMilitaryCommand(force: CommandAssignmentForce): boolean {
  return force.isPlayerControlled && !force.isPersonalGuard && commandRankTier(force.rank) < 3;
}

export function findCommandAssignmentTarget(
  pointedElement: Element | null,
): { id: string; fromGlance: boolean } | null {
  const glance = pointedElement?.closest<HTMLElement>('[data-military-command-id]');
  const glanceId = glance?.dataset.militaryCommandId;
  if (glanceId) {
    return { id: glanceId, fromGlance: true };
  }

  const selectionNode = pointedElement?.closest<HTMLElement>('[data-military-selection-node]');
  const selectionId = selectionNode?.dataset.militarySelectionNode;
  if (selectionId) {
    return { id: selectionId, fromGlance: false };
  }

  return null;
}

export function validateCommandAssignment(
  source: CommandAssignmentForce,
  target: CommandAssignmentForce,
  forces: CommandAssignmentForce[],
  extraAssignedCount = 0,
): CommandAssignmentResult {
  if (!source.isPlayerControlled) {
    return { ok: false, reason: webUIText('Military.Command.NotCommandingSource') };
  }
  if (!target.isPlayerControlled) {
    return { ok: false, reason: webUIText('Military.Command.NotCommandingParent') };
  }
  if (source.isPersonalGuard || target.isPersonalGuard) {
    return { ok: false, reason: webUIText('Military.PersonalGuard.CommandRestriction') };
  }
  if (source.id === target.id) {
    return { ok: false, reason: webUIText('Military.Command.CannotReportToSelf') };
  }
  if (source.factionId && target.factionId && source.factionId !== target.factionId) {
    return { ok: false, reason: webUIText('Military.Command.NotCommandingParent') };
  }
  if (source.isNavy !== target.isNavy) {
    return { ok: false, reason: webUIText('Military.Command.LandNavalMix') };
  }
  if (source.parentId === target.id) {
    return { ok: false, reason: webUIText('Military.Command.AlreadyReportsHere') };
  }

  const byId = new Map(forces.map(force => [force.id, force]));
  let ancestor: CommandAssignmentForce | undefined = target;
  while (ancestor) {
    if (ancestor.id === source.id) {
      return { ok: false, reason: webUIText('Military.Command.CannotReportToSubordinate') };
    }
    ancestor = ancestor.parentId ? byId.get(ancestor.parentId) : undefined;
  }

  const sourceTier = commandRankTier(source.rank);
  const targetTier = commandRankTier(target.rank);
  if (sourceTier <= 0 || targetTier <= 0) {
    return { ok: false, reason: webUIText('Military.Command.UnknownTarget') };
  }
  if (sourceTier >= targetTier) {
    const sourceRank = rankLabel(source as Force);
    const targetRank = rankLabel(target as Force);
    return {
      ok: false,
      reason: sourceTier === targetTier
        ? webUIText('Military.Command.SameRankCannotReport', { Rank: sourceRank })
        : webUIText('Military.Command.LowerRankCannotReport', { SourceRank: sourceRank, TargetRank: targetRank }),
    };
  }

  const used = (target.subordinateCount ?? 0) + extraAssignedCount;
  const capacity = target.subordinateCapacity ?? 0;
  if (used >= capacity) {
    return { ok: false, reason: webUIText('Military.Command.NoSubordinateCapacity') };
  }

  return { ok: true, reason: webUIText('Military.Command.ReportsTo', { Name: target.name }) };
}

export function collectAssignableCommands(
  selected: CommandAssignmentForce[],
  preferredSourceId: string,
  target: CommandAssignmentForce,
  forces: CommandAssignmentForce[],
): CommandAssignmentForce[] {
  const remaining = Math.max(0, (target.subordinateCapacity ?? 0) - (target.subordinateCount ?? 0));
  if (remaining <= 0) return [];

  const preferred = selected.find(force => force.id === preferredSourceId);
  const ordered = [
    ...(preferred ? [preferred] : []),
    ...selected.filter(force => force.id !== preferredSourceId),
  ];

  const accepted: CommandAssignmentForce[] = [];
  for (const source of ordered) {
    if (accepted.length >= remaining) break;
    if (validateCommandAssignment(source, target, forces, accepted.length).ok) {
      accepted.push(source);
    }
  }
  return accepted;
}
