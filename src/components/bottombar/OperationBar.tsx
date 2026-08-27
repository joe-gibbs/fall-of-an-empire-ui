import React from 'react';
import Tooltip from '../common/tooltips/Tooltip';
import Portrait from '../common/portraits/Portrait';
import GovernorAssignmentPickerModal from './GovernorAssignmentPickerModal';
import type { TooltipContent, TooltipLine } from '../common/tooltips/Tooltip';
import { playSound } from '../../hooks/useSound';
import { formatNumber } from '../../utils/numberFormat';
import { useWebUIText } from '../../localization/WebUITextContext';
import { acknowledgeBridgeFailure } from '../../bridge/core/runtimeEngine';
import { useEncyclopediaBridge } from '../../bridge/settlements-economy/useEncyclopediaBridge';
import {
  autoAssignGovernorsBridge,
  cancelBuildingPlacementBridge,
  cancelFormationSelectionBridge,
  confirmFormationSelectionBridge,
  confirmBuildingPlacementBridge,
  finishGovernorAssignmentBridge,
  selectGovernorCandidateBridge,
  undoBuildingPlacementBridge,
  useBuildingPlacementOperation,
  useFormationSelectionOperation,
  useGovernorAssignmentOperation,
} from '../../bridge/military-map/useBottomBarOperationsBridge';
import type {
  BuildingPlacementOperation,
  FormationSelectionOperation,
  GovernorAssignmentCandidateView,
  GovernorAssignmentOperation,
} from '../../bridge/military-map/useBottomBarOperationsBridge';
import type { EncyclopediaBuildingDTO } from '../../bridge-types.generated.ts';
import BuildingEffects from '../common/content/BuildingEffects';

const ICONS = {
  governor: '/assets/icons/AssignGovernor.png',
  chooseGovernor: '/assets/icons/I_Characters.png',
  autoAssign: '/assets/icons/I_Edict_ReformAdministration.png',
  governance: '/assets/icons/StatIcons/I_Governance.png',
  regions: '/assets/icons/I_Region.png',
  building: '/assets/icons/I_BuildingsQuickButton.png',
  gold: '/assets/icons/I_Coins.png',
  confirm: '/assets/icons/I_GoalMet.png',
  cancel: '/assets/icons/I_Close.png',
  undo: '/assets/icons/I_ResetView.png',
  army: '/assets/icons/Armies/I_ArmyRephsian.png',
  navy: '/assets/icons/I_NaviesQuickButton.png',
};

function fmt(value: number): string {
  return formatNumber(value);
}

function OperationButton({
  icon,
  label,
  onPress,
  disabled,
  variant = 'default',
  tutorialTarget,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'default' | 'confirm' | 'danger';
  tutorialTarget?: string;
}) {
  return (
    <Tooltip content={{ title: label }} position="top" delay={150}>
      <button
        type="button"
        data-tutorial-target={tutorialTarget}
        className={`operation-button operation-button--${variant}${disabled ? ' operation-button--disabled' : ''}`}
        aria-label={label}
        aria-disabled={disabled ? 'true' : 'false'}
        onClick={(event) => {
          event.stopPropagation();
          if (disabled) return;
          playSound('click');
          onPress();
        }}
      >
        <img src={icon} alt="" draggable={false} />
      </button>
    </Tooltip>
  );
}

function OperationHeader({
  icon,
  title,
  detail,
  tooltip,
}: {
  icon: string;
  title: string;
  detail: string;
  tooltip?: TooltipContent;
}) {
  const header = (
    <div className={`operation-header${tooltip ? ' operation-header--tooltip' : ''}`}>
      <img src={icon} alt="" className="operation-header-icon" draggable={false} />
      <span className="operation-header-copy">
        <span className="operation-title">{title}</span>
        <span className="operation-detail">{detail}</span>
      </span>
    </div>
  );

  if (!tooltip) return header;

  return (
    <Tooltip content={tooltip} position="top" delay={180}>
      {header}
    </Tooltip>
  );
}

function matchesBuildingOperation(building: EncyclopediaBuildingDTO, operation: BuildingPlacementOperation): boolean {
  return building.assetKey === operation.assetKey
    || building.assetKey === operation.buildingId
    || building.id === operation.buildingId
    || building.id === `${building.cultureId}:${operation.assetKey}`;
}

function buildingTooltipBody(building: EncyclopediaBuildingDTO): React.ReactNode {
  return (
    <>
      {building.description && (
        <div className="operation-building-tooltip-description">
          {building.description}
        </div>
      )}
      <BuildingEffects text={building.effectsHtml} className="operation-building-tooltip-effects" />
    </>
  );
}

function buildingTooltipLines(building: EncyclopediaBuildingDTO, t: ReturnType<typeof useWebUIText>): TooltipLine[] {
  const lines: TooltipLine[] = [
    {
      label: t('Auto.Prop.ComponentsScreensEncyclopediaScreen.692.2'),
      value: building.categoryLabel,
    },
    {
      label: t('Auto.Prop.ComponentsSidebarsSettlementBuildingsPanel.281.8'),
      value: fmt(building.price),
      valueIcon: ICONS.gold,
    },
    {
      label: t('Auto.Prop.ComponentsSidebarsSettlementBuildingsPanel.282.9'),
      value: t('Auto.Prop.componentssidebarsSettlementBuildingsPanel.278.1', { Value1: fmt(building.buildTimeDays) }),
    },
  ];

  if (building.upkeep > 0) {
    lines.push({
      label: t('Auto.Prop.ComponentsSidebarsSettlementBuildingsPanel.285.10'),
      value: t('Auto.Prop.componentssidebarsSettlementBuildingsPanel.282.1', { Value1: fmt(building.upkeep) }),
      valueIcon: ICONS.gold,
      valueColor: 'var(--text-muted)',
    });
  }

  return lines;
}

function GovernorCandidate({ candidate, selectLabel }: { candidate: GovernorAssignmentCandidateView; selectLabel: string }) {
  const t = useWebUIText();
  const regionValue = t('BottomBar.GovernorAssignment.RegionValue', {
    Current: fmt(candidate.currentRegionCount),
    Max: fmt(candidate.maxRegionCount),
  });
  const tooltip = {
    title: candidate.name,
    lines: [
      { label: t('Common.Governance'), value: fmt(candidate.governance), valueIcon: ICONS.governance },
      { label: t('Common.Loyalty'), value: fmt(candidate.loyalty), valueIcon: '/assets/icons/I_Loyalty.png' },
      { label: t('BottomBar.GovernorAssignment.Regions'), value: regionValue, valueIcon: ICONS.regions },
    ],
    footer: candidate.atCapacity ? t('BottomBar.GovernorAssignment.AtCapacity') : undefined,
  };

  return (
    <Tooltip content={tooltip} position="top" delay={180}>
      <button
        type="button"
        className={
          `operation-governor-card${candidate.isSelected ? ' operation-governor-card--selected' : ''}`
          + (candidate.atCapacity ? ' operation-governor-card--disabled' : '')
        }
        aria-label={selectLabel}
        aria-disabled={candidate.atCapacity ? 'true' : 'false'}
        onClick={(event) => {
          event.stopPropagation();
          if (candidate.atCapacity) return;
          playSound('click');
          selectGovernorCandidateBridge(candidate.id).catch(acknowledgeBridgeFailure);
        }}
      >
        <Portrait
          personId={candidate.id}
          resolvePerson={false}
          src={candidate.portrait}
          layers={candidate.portraitLayers}
          name={candidate.name}
          size="row"
          showBorder
        />
        <span className="operation-governor-name">{candidate.name}</span>
        <span className="operation-governor-stats">
          <span>
            <img src={ICONS.governance} alt="" draggable={false} />
            {fmt(candidate.governance)}
          </span>
          <span>
            <img src={ICONS.regions} alt="" draggable={false} />
            {regionValue}
          </span>
        </span>
      </button>
    </Tooltip>
  );
}

function GovernorAssignmentPanel({
  operation,
  pickerRequested,
  onPickerRequestConsumed,
}: {
  operation: GovernorAssignmentOperation;
  pickerRequested: boolean;
  onPickerRequestConsumed: () => void;
}) {
  const t = useWebUIText();
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const orderedCandidates = React.useMemo(() => {
    if (!operation.selectedPersonId) return operation.candidates;
    const selected = operation.candidates.find(candidate => candidate.id === operation.selectedPersonId);
    if (!selected) return operation.candidates;
    return [selected, ...operation.candidates.filter(candidate => candidate.id !== selected.id)];
  }, [operation.candidates, operation.selectedPersonId]);

  React.useEffect(() => {
    if (!pickerRequested) return;
    setPickerOpen(true);
    onPickerRequestConsumed();
  }, [pickerRequested, onPickerRequestConsumed]);

  return (
    <>
      <div className="operation-bar operation-bar--governor">
        <OperationHeader
          icon={ICONS.governor}
          title={t('BottomBar.GovernorAssignment.Title')}
          detail={operation.candidates.length > 0 ? t('BottomBar.GovernorAssignment.Detail') : t('BottomBar.GovernorAssignment.Empty')}
        />
        <div className="operation-governor-list">
          {orderedCandidates.map(candidate => (
            <GovernorCandidate
              key={candidate.id}
              candidate={candidate}
              selectLabel={t('BottomBar.GovernorAssignment.SelectCandidate', { Name: candidate.name })}
            />
          ))}
        </div>
        <div className="operation-actions">
          <OperationButton
            icon={ICONS.autoAssign}
            label={t('BottomBar.GovernorAssignment.AutoAssign')}
            onPress={() => { autoAssignGovernorsBridge().catch(acknowledgeBridgeFailure); }}
          />
          <OperationButton
            icon={ICONS.chooseGovernor}
            label={t('BottomBar.GovernorAssignment.ChooseAnyone')}
            disabled={operation.candidates.length === 0}
            onPress={() => setPickerOpen(true)}
          />
          <OperationButton
            icon={ICONS.confirm}
            label={t('Common.Confirm')}
            variant="confirm"
            onPress={() => { finishGovernorAssignmentBridge().catch(acknowledgeBridgeFailure); }}
          />
          <OperationButton
            icon={ICONS.cancel}
            label={t('Common.Cancel')}
            variant="danger"
            onPress={() => { finishGovernorAssignmentBridge().catch(acknowledgeBridgeFailure); }}
          />
        </div>
      </div>
      <GovernorAssignmentPickerModal
        open={pickerOpen}
        candidates={operation.candidates}
        selectedPersonId={operation.selectedPersonId}
        onChoose={(personId) => {
          selectGovernorCandidateBridge(personId).catch(acknowledgeBridgeFailure);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}

function BuildingPlacementPanel({ operation }: { operation: BuildingPlacementOperation }) {
  const t = useWebUIText();
  const encyclopedia = useEncyclopediaBridge();
  const totalCost = t('BottomBar.BuildingPlacement.GoldCost', { Amount: fmt(operation.totalCost) });
  const treasury = t('BottomBar.BuildingPlacement.Treasury', { Amount: fmt(operation.availableGold) });
  const building = React.useMemo(() => (
    encyclopedia?.buildings.find(entry => matchesBuildingOperation(entry, operation))
  ), [encyclopedia?.buildings, operation]);
  const tooltip = React.useMemo<TooltipContent>(() => (
    building
      ? {
        title: building.name,
        body: buildingTooltipBody(building),
        lines: buildingTooltipLines(building, t),
      }
      : { title: operation.buildingName }
  ), [building, operation.buildingName, t]);

  return (
    <div className="operation-bar operation-bar--building">
      <OperationHeader
        icon={operation.icon || ICONS.building}
        title={t('BottomBar.BuildingPlacement.Title')}
        detail={operation.buildingName}
        tooltip={tooltip}
      />
      <div className="operation-building-summary">
        <span className="operation-count">
          {t('BottomBar.BuildingPlacement.Queued', { Count: fmt(operation.queuedCount) })}
        </span>
        <span className="operation-cost">
          <img src={ICONS.gold} alt="" draggable={false} />
          {totalCost}
        </span>
        <span className="operation-muted">{treasury}</span>
      </div>
      <div className="operation-actions">
        <OperationButton
          icon={ICONS.undo}
          label={t('Common.Undo')}
          disabled={!operation.canUndo}
          onPress={() => { undoBuildingPlacementBridge().catch(acknowledgeBridgeFailure); }}
        />
        <OperationButton
          icon={ICONS.confirm}
          label={t('Common.Confirm')}
          variant="confirm"
          tutorialTarget="FormationSelectionConfirmButton"
          disabled={!operation.canConfirm}
          onPress={() => { confirmBuildingPlacementBridge().catch(acknowledgeBridgeFailure); }}
        />
        <OperationButton
          icon={ICONS.cancel}
          label={t('Common.Cancel')}
          variant="danger"
          onPress={() => { cancelBuildingPlacementBridge().catch(acknowledgeBridgeFailure); }}
        />
      </div>
    </div>
  );
}

function FormationSelectionPanel({ operation }: { operation: FormationSelectionOperation }) {
  const t = useWebUIText();
  const icon = operation.templateType === 'naval' ? ICONS.navy : ICONS.army;
  const detail = operation.selectedSettlementName
    ? `${operation.templateName} - ${operation.selectedSettlementName}`
    : operation.templateName;
  return (
    <div className="operation-bar operation-bar--formation">
      <OperationHeader
        icon={icon}
        title={t('BottomBar.FormationSelection.Title')}
        detail={detail}
      />
      <div className="operation-building-summary">
        <span className="operation-cost">
          <img src={ICONS.gold} alt="" draggable={false} />
          {t('BottomBar.FormationSelection.GoldCost', { Amount: fmt(operation.creationCost) })}
        </span>
        {operation.message && <span className="operation-muted">{operation.message}</span>}
      </div>
      <div className="operation-actions">
        <OperationButton
          icon={ICONS.confirm}
          label={t('Common.Confirm')}
          variant="confirm"
          disabled={!operation.canConfirm}
          onPress={() => { confirmFormationSelectionBridge(operation.templateId).catch(acknowledgeBridgeFailure); }}
        />
        <OperationButton
          icon={ICONS.cancel}
          label={t('Common.Cancel')}
          variant="danger"
          onPress={() => { cancelFormationSelectionBridge().catch(acknowledgeBridgeFailure); }}
        />
      </div>
    </div>
  );
}

const OperationBar: React.FC = () => {
  const buildingPlacement = useBuildingPlacementOperation();
  const governorAssignment = useGovernorAssignmentOperation();
  const formationSelection = useFormationSelectionOperation();
  const [governorPickerRequested, setGovernorPickerRequested] = React.useState(false);

  React.useEffect(() => {
    const handler = () => setGovernorPickerRequested(true);
    bridgeEvents.addEventListener('ui.open_governor_assignment_picker', handler);
    return () => bridgeEvents.removeEventListener('ui.open_governor_assignment_picker', handler);
  }, []);

  const consumeGovernorPickerRequest = React.useCallback(() => {
    setGovernorPickerRequested(false);
  }, []);

  if (buildingPlacement) {
    return <BuildingPlacementPanel operation={buildingPlacement} />;
  }

  if (governorAssignment) {
    return (
      <GovernorAssignmentPanel
        operation={governorAssignment}
        pickerRequested={governorPickerRequested}
        onPickerRequestConsumed={consumeGovernorPickerRequest}
      />
    );
  }

  if (formationSelection) {
    return <FormationSelectionPanel operation={formationSelection} />;
  }

  return null;
};

export default React.memo(OperationBar);
