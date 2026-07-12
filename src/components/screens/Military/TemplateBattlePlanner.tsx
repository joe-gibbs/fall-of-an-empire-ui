import Tooltip from '../../common/tooltips/Tooltip';
import UnitTooltip from '../../common/tooltips/UnitTooltip';
import type { FormationTemplateUnitEntry } from '../../../bridge-types.generated.ts';
import { formatNumber } from '../../../utils/numberFormat';
import { WebUIText, webUIText } from '../../../localization/WebUITextContext';
import {
  MAX_BATTLE_FORMATION_SIZE,
  battleGroupUnitCount,
  battleRoleForUnit,
  draftCompositionRequests,
  orderedBattleGroupUnitIds,
  unassignedUnitCount,
  type BattleFormationRole,
  type TemplateDraft,
} from './formationTemplateDraft';
import { templateUnitPortrait, templateUnitTooltipData } from './TemplateManagementPanel';

const SWORDS_ICON = '/assets/icons/I_Swords.png';
const DELETE_ICON = '/assets/icons/I_Close.png';
const ADD_ICON = '/assets/icons/I_Plus.png';

export function TemplateBattlePlanner({
  draft,
  unitById,
  editable,
  onAddBattleGroup,
  onRemoveBattleGroup,
  onSetBattleGroupUnitCount,
}: {
  draft: TemplateDraft;
  unitById: Map<string, FormationTemplateUnitEntry>;
  editable: boolean;
  onAddBattleGroup: (role: BattleFormationRole) => void;
  onRemoveBattleGroup: (groupId: string) => void;
  onSetBattleGroupUnitCount: (groupId: string, unitId: string, count: number) => void;
}) {
  const unassignedUnits = draftCompositionRequests(draft)
    .map(request => ({ unit: unitById.get(request.unitId), count: unassignedUnitCount(draft, request.unitId) }))
    .filter((entry): entry is { unit: FormationTemplateUnitEntry; count: number } => Boolean(entry.unit) && entry.count > 0);
  const hasUnassignedMelee = unassignedUnits.some(entry => battleRoleForUnit(entry.unit) === 'melee');
  const hasUnassignedRanged = unassignedUnits.some(entry => battleRoleForUnit(entry.unit) === 'ranged');

  return (
    <div className="chart-template-battle-editor">
      <div className="chart-template-battle-toolbar">
        <Tooltip content={webUIText('FormationTemplate.BattlePlan.NewMeleeGroup')}>
          <button
            type="button"
            className="chart-template-battle-add chart-template-battle-add--icon"
            onMouseDown={() => onAddBattleGroup('melee')}
            disabled={!editable || !hasUnassignedMelee}
            aria-label={webUIText('FormationTemplate.BattlePlan.NewMeleeGroup')}
          >
            <img src={ADD_ICON} alt="" className="chart-template-battle-add-plus" draggable={false} />
            <img src={SWORDS_ICON} alt="" className="chart-template-battle-add-icon" draggable={false} />
          </button>
        </Tooltip>
        <Tooltip content={webUIText('FormationTemplate.BattlePlan.NewRangedGroup')}>
          <button
            type="button"
            className="chart-template-battle-add chart-template-battle-add--icon"
            onMouseDown={() => onAddBattleGroup('ranged')}
            disabled={!editable || !hasUnassignedRanged}
            aria-label={webUIText('FormationTemplate.BattlePlan.NewRangedGroup')}
          >
            <img src={ADD_ICON} alt="" className="chart-template-battle-add-plus" draggable={false} />
            <img src="/assets/icons/UnitTypes/I_ArmyRanged.png" alt="" className="chart-template-battle-add-icon" draggable={false} />
          </button>
        </Tooltip>
      </div>

      <div className="chart-template-battle-groups">
        {draft.battleGroups.length === 0 ? (
          <div className="chart-template-empty-inline"><WebUIText textKey="FormationTemplate.BattlePlan.EmptyGroups" /></div>
        ) : draft.battleGroups.map((group, index) => {
          const groupCount = battleGroupUnitCount(group);
          const roleIcon = group.role === 'ranged' ? '/assets/icons/UnitTypes/I_ArmyRanged.png' : SWORDS_ICON;
          const roleTitle = group.role === 'ranged'
            ? webUIText('FormationTemplate.BattlePlan.RangedTitle')
            : webUIText('FormationTemplate.BattlePlan.MeleeTitle');
          const compatibleMovable = draftCompositionRequests(draft)
            .map(request => {
              const unit = unitById.get(request.unitId);
              if (!unit || battleRoleForUnit(unit) !== group.role) return null;
              const inGroup = group.counts[unit.id] ?? 0;
              const outsideGroup = Math.max(0, request.count - inGroup);
              return outsideGroup > 0 ? { unit, count: outsideGroup } : null;
            })
            .filter((entry): entry is { unit: FormationTemplateUnitEntry; count: number } => Boolean(entry));
          const groupUnits = orderedBattleGroupUnitIds(group)
            .map(unitId => ({ unit: unitById.get(unitId), count: group.counts[unitId] ?? 0 }))
            .filter((entry): entry is { unit: FormationTemplateUnitEntry; count: number } => Boolean(entry.unit) && entry.count > 0);

          return (
            <div key={group.id} className="chart-template-battle-group">
              <div className="chart-template-battle-group-head">
                <img src={roleIcon} alt="" className="chart-template-battle-group-icon" draggable={false} />
                <span className="chart-template-battle-group-title">
                  {webUIText('FormationTemplate.BattlePlan.GroupTitle', { Role: roleTitle, Index: formatNumber(index + 1) })}
                </span>
                <span className={`chart-template-battle-group-count${groupCount > MAX_BATTLE_FORMATION_SIZE ? ' chart-template-battle-group-count--bad' : ''}`}>
                  {formatNumber(groupCount)} / {formatNumber(MAX_BATTLE_FORMATION_SIZE)}
                </span>
                <button
                  type="button"
                  className="chart-template-battle-remove"
                  onMouseDown={() => onRemoveBattleGroup(group.id)}
                  disabled={!editable}
                  aria-label={webUIText('FormationTemplate.BattlePlan.RemoveGroup')}
                >
                  <img src={DELETE_ICON} alt="" className="chart-template-battle-remove-icon" draggable={false} />
                </button>
              </div>

              <div className="chart-template-battle-group-units">
                {groupUnits.length === 0 ? (
                  <div className="chart-template-empty-inline"><WebUIText textKey="FormationTemplate.BattlePlan.EmptyGroup" /></div>
                ) : groupUnits.map(({ unit, count }) => {
                  const availableOutsideGroup = Math.max(0, (draft.counts[unit.id] ?? 0) - count);
                  const groupRoom = MAX_BATTLE_FORMATION_SIZE - groupCount;
                  const canIncrement = editable && availableOutsideGroup > 0 && groupRoom > 0;

                  return (
                    <div key={unit.id} className="chart-template-battle-unit">
                      <Tooltip content={{ afterLines: <UnitTooltip data={templateUnitTooltipData(unit, count)} /> }} position="left" delay={200}>
                        <img src={templateUnitPortrait(unit)} alt="" className="chart-template-battle-unit-icon" draggable={false} />
                      </Tooltip>
                      <span className="chart-template-battle-unit-name">{unit.name}</span>
                      <span className="chart-template-unit-stepper">
                        <button
                          type="button"
                          className="chart-template-stepper-button"
                          onMouseDown={() => onSetBattleGroupUnitCount(group.id, unit.id, count - 1)}
                          disabled={!editable}
                        >
                          <img src="/assets/icons/I_Minus.png" alt="" className="chart-template-stepper-icon" draggable={false} />
                        </button>
                        <span className="chart-template-unit-count">{formatNumber(count)}</span>
                        <button
                          type="button"
                          className="chart-template-stepper-button"
                          onMouseDown={() => onSetBattleGroupUnitCount(group.id, unit.id, count + 1)}
                          disabled={!canIncrement}
                        >
                          <img src="/assets/icons/I_Plus.png" alt="" className="chart-template-stepper-icon" draggable={false} />
                        </button>
                      </span>
                    </div>
                  );
                })}
              </div>

              {compatibleMovable.length > 0 && groupCount < MAX_BATTLE_FORMATION_SIZE && (
                <div className="chart-template-battle-add-list">
                  {compatibleMovable.map(({ unit, count }) => (
                    <Tooltip
                      key={unit.id}
                      inline
                      content={{ afterLines: <UnitTooltip data={templateUnitTooltipData(unit, count)} /> }}
                      position="left"
                      delay={200}
                    >
                      <button
                        type="button"
                        className="chart-template-battle-add-unit"
                        onMouseDown={() => onSetBattleGroupUnitCount(group.id, unit.id, (group.counts[unit.id] ?? 0) + 1)}
                        disabled={!editable}
                      >
                        <img src={ADD_ICON} alt="" className="chart-template-battle-add-unit-plus" draggable={false} />
                        <img src={templateUnitPortrait(unit)} alt="" className="chart-template-battle-add-unit-icon" draggable={false} />
                        <span>{unit.name}</span>
                        <strong>{formatNumber(count)}</strong>
                      </button>
                    </Tooltip>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {unassignedUnits.length > 0 && (
        <div className="chart-template-battle-unassigned">
          <span className="chart-template-battle-unassigned-title"><WebUIText textKey="FormationTemplate.BattlePlan.Unassigned" /></span>
          {unassignedUnits.map(({ unit, count }) => (
            <span key={unit.id} className="chart-template-battle-unassigned-item">
              {unit.name} {formatNumber(count)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
