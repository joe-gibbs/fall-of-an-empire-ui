import Tooltip from '../../common/tooltips/Tooltip';
import UnitTooltip from '../../common/tooltips/UnitTooltip';
import type { FormationTemplateUnitEntry } from '../../../bridge-types.generated.ts';
import { formatNumber } from '../../../utils/numberFormat';
import {
  battleFormationDisplayName,
  battleFormationRoleIcon,
  newBattleFormationTooltip,
} from '../../../utils/battleFormationNaming';
import { stepAmountFromEvent } from '../../../utils/stepModifiers';
import { WebUIText, webUIText } from '../../../localization/WebUITextContext';
import {
  battleGroupUnitCount,
  orderedBattleGroupUnitIds,
  type BattleFormationRole,
  type TemplateDraft,
} from './formationTemplateDraft';
import { templateUnitPortrait, templateUnitTooltipData } from './TemplateManagementPanel';

const DELETE_ICON = '/assets/icons/I_Close.png';
const ADD_ICON = '/assets/icons/I_Plus.png';

export function TemplateBattlePlanner({
  draft,
  unitById,
  editable,
  maximumBattleGroupUnits,
  onAddBattleGroup,
  onRemoveBattleGroup,
  onAdjustBattleGroupUnitCount,
  onOpenUnitCatalogue,
}: {
  draft: TemplateDraft;
  unitById: Map<string, FormationTemplateUnitEntry>;
  editable: boolean;
  maximumBattleGroupUnits: number;
  onAddBattleGroup: (role: BattleFormationRole) => void;
  onRemoveBattleGroup: (groupId: string) => void;
  onAdjustBattleGroupUnitCount: (groupId: string, unitId: string, delta: number) => void;
  onOpenUnitCatalogue: (groupId: string) => void;
}) {
  const meleeTooltip = newBattleFormationTooltip('melee', draft.type);
  const rangedTooltip = newBattleFormationTooltip('ranged', draft.type);
  const siegeTooltip = newBattleFormationTooltip('siege', draft.type);

  return (
    <div className="chart-template-battle-editor">
      <div className="chart-template-battle-toolbar">
        <Tooltip content={meleeTooltip} bubbleClassName="tt-bubble--formation-role">
          <button
            type="button"
            className="chart-template-battle-add chart-template-battle-add--icon"
            data-tutorial-target="AddMeleeBattleGroupButton"
            onClick={() => onAddBattleGroup('melee')}
            disabled={!editable}
            aria-label={meleeTooltip.title}
          >
            <img src={ADD_ICON} alt="" className="chart-template-battle-add-plus" draggable={false} />
            <img src={battleFormationRoleIcon('melee', draft.type)} alt="" className="chart-template-battle-add-icon" draggable={false} />
          </button>
        </Tooltip>
        <Tooltip content={rangedTooltip} bubbleClassName="tt-bubble--formation-role">
          <button
            type="button"
            className="chart-template-battle-add chart-template-battle-add--icon"
            onClick={() => onAddBattleGroup('ranged')}
            disabled={!editable}
            aria-label={rangedTooltip.title}
          >
            <img src={ADD_ICON} alt="" className="chart-template-battle-add-plus" draggable={false} />
            <img src={battleFormationRoleIcon('ranged', draft.type)} alt="" className="chart-template-battle-add-icon" draggable={false} />
          </button>
        </Tooltip>
        <Tooltip content={siegeTooltip} bubbleClassName="tt-bubble--formation-role">
          <button
            type="button"
            className="chart-template-battle-add chart-template-battle-add--icon"
            data-tutorial-target="AddSiegeBattleGroupButton"
            onClick={() => onAddBattleGroup('siege')}
            disabled={!editable}
            aria-label={siegeTooltip.title}
          >
            <img src={ADD_ICON} alt="" className="chart-template-battle-add-plus" draggable={false} />
            <img src={battleFormationRoleIcon('siege', draft.type)} alt="" className="chart-template-battle-add-icon" draggable={false} />
          </button>
        </Tooltip>
      </div>

      <div className="chart-template-battle-groups">
        {draft.battleGroups.length === 0 ? (
          <div className="chart-template-empty-inline"><WebUIText textKey="FormationTemplate.BattlePlan.EmptyGroups" /></div>
        ) : draft.battleGroups.map((group) => {
          const groupCount = battleGroupUnitCount(group);
          const groupName = battleFormationDisplayName(group, unitById, draft.type);
          const roleIcon = battleFormationRoleIcon(group.role, draft.type);
          const groupUnits = orderedBattleGroupUnitIds(group)
            .map(unitId => ({ unit: unitById.get(unitId), count: group.counts[unitId] ?? 0 }))
            .filter((entry): entry is { unit: FormationTemplateUnitEntry; count: number } => Boolean(entry.unit) && entry.count > 0);

          return (
            <div key={group.id} className="chart-template-battle-group">
              <div className="chart-template-battle-group-head">
                <img src={roleIcon} alt="" className="chart-template-battle-group-icon" draggable={false} />
                <span className="chart-template-battle-group-title">{groupName}</span>
                <span className={`chart-template-battle-group-count${groupCount > maximumBattleGroupUnits ? ' chart-template-battle-group-count--bad' : ''}`}>
                  {formatNumber(groupCount)} / {formatNumber(maximumBattleGroupUnits)}
                </span>
                <button
                  type="button"
                  className="chart-template-battle-remove"
                  onClick={() => onRemoveBattleGroup(group.id)}
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
                  const canIncrement = editable && groupCount < maximumBattleGroupUnits;

                  return (
                    <div key={unit.id} className="chart-template-battle-unit">
                      <Tooltip content={{ afterLines: <UnitTooltip data={templateUnitTooltipData(unit, count)} /> }} position="left" delay={200}>
                        <img src={templateUnitPortrait(unit)} alt="" className="chart-template-battle-unit-icon" draggable={false} />
                      </Tooltip>
                      <span className="chart-template-battle-unit-name">{unit.name}</span>
                      <Tooltip
                        content={{
                          title: webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.543.22'),
                          body: webUIText('Common.StepModifiersBody'),
                        }}
                        position="left"
                        delay={200}
                      >
                        <span className="chart-template-unit-stepper">
                          <button
                            type="button"
                            className="chart-template-stepper-button"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              if (!editable) return;
                              onAdjustBattleGroupUnitCount(group.id, unit.id, -stepAmountFromEvent(event));
                            }}
                            disabled={!editable}
                            aria-label={webUIText('Auto.Attr.ComponentsSidebarsFormationTemplateSidebar.554.25')}
                          >
                            <img src="/assets/icons/I_Minus.png" alt="" className="chart-template-stepper-icon" draggable={false} />
                          </button>
                          <span className="chart-template-unit-count">{formatNumber(count)}</span>
                          <button
                            type="button"
                            className="chart-template-stepper-button"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              if (!canIncrement) return;
                              onAdjustBattleGroupUnitCount(group.id, unit.id, stepAmountFromEvent(event));
                            }}
                            disabled={!canIncrement}
                            aria-label={webUIText('Auto.Attr.ComponentsSidebarsFormationTemplateSidebar.556.26')}
                          >
                            <img src="/assets/icons/I_Plus.png" alt="" className="chart-template-stepper-icon" draggable={false} />
                          </button>
                        </span>
                      </Tooltip>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                className="chart-template-battle-pick-unit"
                onClick={() => onOpenUnitCatalogue(group.id)}
                disabled={!editable || groupCount >= maximumBattleGroupUnits}
              >
                <img src={ADD_ICON} alt="" className="chart-template-battle-pick-unit-icon" draggable={false} />
                <WebUIText textKey="Auto.ComponentsSidebarsFormationTemplateSidebar.616.2" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
