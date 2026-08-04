import { useMemo } from 'react';
import Tooltip from '../../common/tooltips/Tooltip';
import UnitTooltip from '../../common/tooltips/UnitTooltip';
import type { FormationTemplateUnitEntry } from '../../../bridge-types.generated.ts';
import { formatNumber } from '../../../utils/numberFormat';
import {
  addBattleFormationLabel,
  battleFormationDisplayName,
  battleFormationRoleIcon,
  newBattleFormationTooltip,
  numberedBattleFormationName,
} from '../../../utils/battleFormationNaming';
import { stepAmountFromEvent } from '../../../utils/stepModifiers';
import { useSettingsBridge } from '../../../bridge/app/useSettingsBridge';
import { formatActionBinding, stepModifiersHelpText } from '../../../utils/actionBindings';
import { WebUIText, webUIText } from '../../../localization/WebUITextContext';
import {
  battleGroupUnitCount,
  canAddUnitForManpower,
  draftUsedManpowerByCulture,
  orderedBattleGroupUnitIds,
  type BattleFormationRole,
  type TemplateDraft,
} from './formationTemplateDraft';
import { templateUnitPortrait, templateUnitTooltipData } from './TemplateManagementPanel';

const DELETE_ICON = '/assets/icons/I_Close.png';
const ADD_ICON = '/assets/icons/I_Plus.png';

function RoleAddButton({
  role,
  formationType,
  editable,
  tutorialTarget,
  onAdd,
}: {
  role: BattleFormationRole;
  formationType: 'land' | 'naval';
  editable: boolean;
  tutorialTarget?: string;
  onAdd: (role: BattleFormationRole) => void;
}) {
  const tooltip = newBattleFormationTooltip(role, formationType);
  const label = addBattleFormationLabel(role, formationType);

  return (
    <Tooltip content={tooltip} bubbleClassName="tt-bubble--formation-role">
      <button
        type="button"
        className={`chart-template-battle-add chart-template-battle-add--labelled chart-template-battle-add--${role}`}
        data-tutorial-target={tutorialTarget}
        // Tutorial spotlights resolve on mousedown and may cover the control before click.
        // Open the catalogue in the same phase so the unit picker is up for the next step.
        onMouseDown={(event) => {
          if (event.button !== 0 || !editable) return;
          event.preventDefault();
          onAdd(role);
        }}
        disabled={!editable}
        aria-label={tooltip.title}
      >
        <img src={ADD_ICON} alt="" className="chart-template-battle-add-plus" draggable={false} />
        <img src={battleFormationRoleIcon(role, formationType)} alt="" className="chart-template-battle-add-icon" draggable={false} />
        <span className="chart-template-battle-add-label">{label}</span>
      </button>
    </Tooltip>
  );
}

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
  const usedManpowerByCulture = useMemo(
    () => draftUsedManpowerByCulture(draft, unitById),
    [draft, unitById],
  );
  const { settings } = useSettingsBridge();
  const stepModifiersBody = stepModifiersHelpText(
    webUIText,
    formatActionBinding(settings?.controls, 'IncreaseUnitProduction'),
  );
  const groupTitles = useMemo(() => {
    const baseNames = draft.battleGroups.map(group => battleFormationDisplayName(group, unitById, draft.type));
    const totals = new Map<string, number>();
    baseNames.forEach(name => totals.set(name, (totals.get(name) ?? 0) + 1));
    const seen = new Map<string, number>();
    return baseNames.map(name => {
      const occurrence = seen.get(name) ?? 0;
      seen.set(name, occurrence + 1);
      return numberedBattleFormationName(name, occurrence, totals.get(name) ?? 1);
    });
  }, [draft.battleGroups, draft.type, unitById]);

  return (
    <div className="chart-template-battle-editor">
      <div className="chart-template-battle-toolbar">
        <RoleAddButton
          role="melee"
          formationType={draft.type}
          editable={editable}
          tutorialTarget="AddMeleeBattleGroupButton"
          onAdd={onAddBattleGroup}
        />
        <RoleAddButton
          role="ranged"
          formationType={draft.type}
          editable={editable}
          onAdd={onAddBattleGroup}
        />
        <RoleAddButton
          role="siege"
          formationType={draft.type}
          editable={editable}
          tutorialTarget="AddSiegeBattleGroupButton"
          onAdd={onAddBattleGroup}
        />
      </div>

      <div className="chart-template-battle-groups">
        {draft.battleGroups.length === 0 ? (
          <div className="chart-template-empty-inline chart-template-empty-inline--hint">
            <WebUIText textKey="FormationTemplate.BattlePlan.EmptyGroupsHint" />
          </div>
        ) : draft.battleGroups.map((group, groupIndex) => {
          const groupCount = battleGroupUnitCount(group);
          const groupName = groupTitles[groupIndex];
          const roleIcon = battleFormationRoleIcon(group.role, draft.type);
          const groupUnits = orderedBattleGroupUnitIds(group)
            .map(unitId => ({ unit: unitById.get(unitId), count: group.counts[unitId] ?? 0 }))
            .filter((entry): entry is { unit: FormationTemplateUnitEntry; count: number } => Boolean(entry.unit) && entry.count > 0);

          return (
            <div
              key={group.id}
              className={`chart-template-battle-group chart-template-battle-group--${group.role}`}
            >
              <div className="chart-template-battle-group-head">
                <img src={roleIcon} alt="" className="chart-template-battle-group-icon" draggable={false} />
                <span className="chart-template-battle-group-title">{groupName}</span>
                <Tooltip
                  content={{
                    title: webUIText('Military.PersonalGuard.CompanyCapacityLabel'),
                    body: webUIText('FormationTemplate.BattlePlan.CompanyCapacity', {
                      Count: formatNumber(groupCount),
                      Max: formatNumber(maximumBattleGroupUnits),
                    }),
                  }}
                  position="left"
                  delay={200}
                  inline
                >
                  <span className={`chart-template-battle-group-count${groupCount > maximumBattleGroupUnits ? ' chart-template-battle-group-count--bad' : ''}`}>
                    {formatNumber(groupCount)}/{formatNumber(maximumBattleGroupUnits)}
                  </span>
                </Tooltip>
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
                  <div className="chart-template-empty-inline chart-template-empty-inline--hint">
                    <WebUIText textKey="FormationTemplate.BattlePlan.EmptyGroupHint" />
                  </div>
                ) : groupUnits.map(({ unit, count }) => {
                  const atGroupCap = groupCount >= maximumBattleGroupUnits;
                  const manpowerBlocked = !canAddUnitForManpower(unit, usedManpowerByCulture, 1);
                  const canIncrement = editable && !atGroupCap && !manpowerBlocked;
                  const incrementBody = atGroupCap
                    ? webUIText('FormationTemplate.BattlePlan.CompanyCapacityFull')
                    : manpowerBlocked
                      ? webUIText('Military.PersonalGuard.InsufficientPopulation')
                      : stepModifiersBody;

                  return (
                    <div key={unit.id} className="chart-template-battle-unit">
                      <Tooltip content={{ afterLines: <UnitTooltip data={templateUnitTooltipData(unit, count)} /> }} position="left" delay={200}>
                        <img src={templateUnitPortrait(unit)} alt="" className="chart-template-battle-unit-icon" draggable={false} />
                      </Tooltip>
                      <span className="chart-template-battle-unit-name">{unit.name}</span>
                      <Tooltip
                        content={{
                          title: webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.543.22'),
                          body: incrementBody,
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
                onMouseDown={(event) => {
                  if (event.button !== 0 || !editable || groupCount >= maximumBattleGroupUnits) return;
                  event.preventDefault();
                  onOpenUnitCatalogue(group.id);
                }}
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
