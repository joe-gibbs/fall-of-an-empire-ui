import Tooltip from '../../common/tooltips/Tooltip';
import UnitTooltip from '../../common/tooltips/UnitTooltip';
import type { FormationTemplateUnitEntry } from '../../../bridge-types.generated.ts';
import { formatNumber } from '../../../utils/numberFormat';
import { battleFormationDisplayName } from '../../../utils/battleFormationNaming';
import { WebUIText, webUIText } from '../../../localization/WebUITextContext';
import {
  MAX_BATTLE_FORMATION_SIZE,
  battleGroupUnitCount,
  orderedBattleGroupUnitIds,
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
  onAdjustBattleGroupUnitCount,
  onOpenUnitCatalogue,
}: {
  draft: TemplateDraft;
  unitById: Map<string, FormationTemplateUnitEntry>;
  editable: boolean;
  onAddBattleGroup: (role: BattleFormationRole) => void;
  onRemoveBattleGroup: (groupId: string) => void;
  onAdjustBattleGroupUnitCount: (groupId: string, unitId: string, delta: number) => void;
  onOpenUnitCatalogue: (groupId: string) => void;
}) {
  return (
    <div className="chart-template-battle-editor">
      <div className="chart-template-battle-toolbar">
        <Tooltip content={webUIText('FormationTemplate.BattlePlan.NewMeleeGroup')}>
          <button
            type="button"
            className="chart-template-battle-add chart-template-battle-add--icon"
            onClick={() => onAddBattleGroup('melee')}
            disabled={!editable}
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
            onClick={() => onAddBattleGroup('ranged')}
            disabled={!editable}
            aria-label={webUIText('FormationTemplate.BattlePlan.NewRangedGroup')}
          >
            <img src={ADD_ICON} alt="" className="chart-template-battle-add-plus" draggable={false} />
            <img src="/assets/icons/UnitTypes/I_ArmyRanged.png" alt="" className="chart-template-battle-add-icon" draggable={false} />
          </button>
        </Tooltip>
        <Tooltip content={webUIText('FormationTemplate.BattlePlan.NewSiegeGroup')}>
          <button
            type="button"
            className="chart-template-battle-add chart-template-battle-add--icon"
            onClick={() => onAddBattleGroup('siege')}
            disabled={!editable}
            aria-label={webUIText('FormationTemplate.BattlePlan.NewSiegeGroup')}
          >
            <img src={ADD_ICON} alt="" className="chart-template-battle-add-plus" draggable={false} />
            <img src="/assets/icons/UnitTypes/I_ArmySiege.png" alt="" className="chart-template-battle-add-icon" draggable={false} />
          </button>
        </Tooltip>
      </div>

      <div className="chart-template-battle-groups">
        {draft.battleGroups.length === 0 ? (
          <div className="chart-template-empty-inline"><WebUIText textKey="FormationTemplate.BattlePlan.EmptyGroups" /></div>
        ) : draft.battleGroups.map((group) => {
          const groupCount = battleGroupUnitCount(group);
          const groupName = battleFormationDisplayName(group, unitById, draft.type);
          const roleIcon = group.role === 'siege'
            ? '/assets/icons/UnitTypes/I_ArmySiege.png'
            : group.role === 'ranged' ? '/assets/icons/UnitTypes/I_ArmyRanged.png' : SWORDS_ICON;
          const groupUnits = orderedBattleGroupUnitIds(group)
            .map(unitId => ({ unit: unitById.get(unitId), count: group.counts[unitId] ?? 0 }))
            .filter((entry): entry is { unit: FormationTemplateUnitEntry; count: number } => Boolean(entry.unit) && entry.count > 0);

          return (
            <div key={group.id} className="chart-template-battle-group">
              <div className="chart-template-battle-group-head">
                <img src={roleIcon} alt="" className="chart-template-battle-group-icon" draggable={false} />
                <span className="chart-template-battle-group-title">{groupName}</span>
                <span className={`chart-template-battle-group-count${groupCount > MAX_BATTLE_FORMATION_SIZE ? ' chart-template-battle-group-count--bad' : ''}`}>
                  {formatNumber(groupCount)} / {formatNumber(MAX_BATTLE_FORMATION_SIZE)}
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
                  const canIncrement = editable && groupCount < MAX_BATTLE_FORMATION_SIZE;

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
                          onClick={() => onAdjustBattleGroupUnitCount(group.id, unit.id, -1)}
                          disabled={!editable}
                          aria-label={webUIText('Auto.Attr.ComponentsSidebarsFormationTemplateSidebar.554.25')}
                        >
                          <img src="/assets/icons/I_Minus.png" alt="" className="chart-template-stepper-icon" draggable={false} />
                        </button>
                        <span className="chart-template-unit-count">{formatNumber(count)}</span>
                        <button
                          type="button"
                          className="chart-template-stepper-button"
                          onClick={() => onAdjustBattleGroupUnitCount(group.id, unit.id, 1)}
                          disabled={!canIncrement}
                          aria-label={webUIText('Auto.Attr.ComponentsSidebarsFormationTemplateSidebar.556.26')}
                        >
                          <img src="/assets/icons/I_Plus.png" alt="" className="chart-template-stepper-icon" draggable={false} />
                        </button>
                      </span>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                className="chart-template-battle-pick-unit"
                onClick={() => onOpenUnitCatalogue(group.id)}
                disabled={!editable || groupCount >= MAX_BATTLE_FORMATION_SIZE}
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
