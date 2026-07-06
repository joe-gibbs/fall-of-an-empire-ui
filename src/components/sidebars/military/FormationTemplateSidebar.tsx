import React, { useEffect, useMemo, useState } from 'react';
import Badge from '../../common/data-display/stats/Badge';
import SectionHeading from '../../common/data-display/stats/SectionHeading';
import StyledScrollArea from '../../common/layout/scrolling/StyledScrollArea';
import Tooltip from '../../common/tooltips/Tooltip';
import {
  applyFormationTemplateBridge,
  deleteFormationTemplateBridge,
  saveFormationTemplateBridge,
  useFormationTemplateCatalogueBridge,
  useFormationTemplatesBridge,
} from '../../../bridge/military-map/useFormationTemplatesBridge';
import { setMilitaryFormationTemplateBridge } from '../../../bridge/military-map/useMilitaryBridge';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import { useMilitary } from '../../../data-source/index';
import type {
  FormationTemplateEntry,
  FormationTemplateUnitEntry,
  SaveFormationTemplateUnitRequest,
} from '../../../bridge-types.generated.ts';
import { useGameActions } from '../../../context/GameContext';
import { getFormationTemplateIcon } from '../../../utils/formationTemplatePresentation';
import { registerSidebar } from '../../../registry/index';
import SidebarTabBar from '../shared/SidebarTabBar';
import SidebarToolbar from '../shared/SidebarToolbar';
import {
  AssignedForces,
  CombatTab,
  Picker,
  TotalsBlock,
  UnitRow,
} from './FormationTemplateSidebarPanels';
import '../shared/Sidebar.css';
import './FormationTemplateSidebar.css';
import {
  battleFormationRole,
  battleGroupsValid,
  battleGroupUnitCount,
  battleGroupRequests,
  buildDraft,
  compositionRequests,
  computeDerived,
  createBattleGroupId,
  decodeSidebarToken,
  draftUnitCount,
  draftsEqual,
  emptyDraft,
  EMPTY_UNIT_CATALOGUE,
  fmt,
  groupAssignedCountExcluding,
  MAX_BATTLE_FORMATION_SIZE,
  newTemplateTypeFromSidebarId,
  normaliseTemplateType,
  removeUnitsFromBattleGroups,
  templateKind,
  templateTypeName,
  unassignedUnitCount,
  type BattleFormationRole,
  type DraftBattleGroup,
  type DraftTemplate,
  type TemplateTab,
} from './FormationTemplateDraftModel';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
interface FormationTemplateSidebarProps {
  sidebarId: string | null;
  onClose: () => void;
}

const FormationTemplateSidebar: React.FC<FormationTemplateSidebarProps> = ({ sidebarId, onClose }) => {
  const data = useFormationTemplatesBridge();
  const { openSidebar } = useGameActions();
  const templates = useMemo(() => data?.templates ?? [], [data]);
  const assignmentTargetId = sidebarId && sidebarId.startsWith('assign:')
    ? decodeSidebarToken(sidebarId.slice('assign:'.length))
    : null;
  const newTemplateType = newTemplateTypeFromSidebarId(sidebarId);
  const requestedTemplateId = sidebarId && sidebarId.startsWith('rename:')
    ? decodeSidebarToken(sidebarId.slice('rename:'.length))
    : sidebarId && !sidebarId.startsWith('assign:') && !newTemplateType
      ? sidebarId
      : null;
  const shouldStartRenaming = Boolean(sidebarId && sidebarId.startsWith('rename:'));
  const assignmentTarget = useMilitary(assignmentTargetId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftTemplate>(() => emptyDraft('land'));
  const [baseline, setBaseline] = useState<DraftTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<TemplateTab>('composition');
  const [renaming, setRenaming] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [catalogueRequested, setCatalogueRequested] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const assignmentTemplateType = assignmentTarget ? (assignmentTarget.isNavy ? 'naval' : 'land') : null;
  const templatesForMode = useMemo(() => (
    assignmentTemplateType
      ? templates.filter(template => normaliseTemplateType(template.type) === assignmentTemplateType)
      : templates
  ), [assignmentTemplateType, templates]);

  const selected = templatesForMode.find(template => template.id === selectedId)
    ?? templatesForMode.find(template => template.id === baseline?.templateId)
    ?? null;

  useEffect(() => {
    if (newTemplateType) {
      const timer = window.setTimeout(() => {
        setSelectedId(null);
        setDraft(emptyDraft(newTemplateType));
        setBaseline(null);
        setRenaming(true);
        setPickerOpen(false);
        setMessage('');
        setConfirmDeleteId(null);
      }, 0);

      return () => window.clearTimeout(timer);
    }

    if (assignmentTargetId && !assignmentTarget) return;

    const requested = requestedTemplateId ? templatesForMode.find(template => template.id === requestedTemplateId) : null;
    const next = requested ?? (baseline ? null : templatesForMode[0] ?? null);

    if (!next) {
      if (assignmentTemplateType && !baseline) {
        const timer = window.setTimeout(() => {
          setSelectedId(null);
          setDraft(emptyDraft(assignmentTemplateType));
          setBaseline(null);
          setRenaming(true);
          setPickerOpen(false);
          setMessage('');
          setConfirmDeleteId(null);
        }, 0);

        return () => window.clearTimeout(timer);
      }
      return;
    }

    if (next.id === baseline?.templateId) {
      if (!shouldStartRenaming) return;

      const timer = window.setTimeout(() => {
        setRenaming(true);
      }, 0);

      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      const nextDraft = buildDraft(next);
      setSelectedId(next.id);
      setDraft(nextDraft);
      setBaseline(nextDraft);
      setRenaming(shouldStartRenaming);
      setPickerOpen(false);
      setMessage('');
      setConfirmDeleteId(null);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [assignmentTarget, assignmentTargetId, assignmentTemplateType, baseline, newTemplateType, requestedTemplateId, shouldStartRenaming, templatesForMode]);

  const catalogueData = useFormationTemplateCatalogueBridge(catalogueRequested);
  const landCatalogue = catalogueData?.landUnitCatalogue ?? EMPTY_UNIT_CATALOGUE;
  const navalCatalogue = catalogueData?.navalUnitCatalogue ?? EMPTY_UNIT_CATALOGUE;
  const catalogue = draft.type === 'naval' ? navalCatalogue : landCatalogue;

  const unitById = useMemo(() => {
    const map = new Map<string, FormationTemplateUnitEntry>();
    landCatalogue.forEach(unit => map.set(unit.id, unit));
    navalCatalogue.forEach(unit => map.set(unit.id, unit));
    selected?.units.forEach(unit => {
      const catalogueUnit = map.get(unit.id);
      map.set(unit.id, catalogueUnit ? { ...catalogueUnit, count: unit.count, includesCore: unit.includesCore } : unit);
    });
    return map;
  }, [landCatalogue, navalCatalogue, selected]);

  const availableClasses = useMemo(() => {
    const groups = new Map<string, FormationTemplateUnitEntry[]>();
    catalogue.forEach(unit => {
      const group = unit.type || 'other';
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push(unit);
    });
    return groups;
  }, [catalogue]);

  const visibleUnits = useMemo(() => (
    compositionRequests(draft)
      .map((request, index) => ({
        request,
        unit: unitById.get(request.unitId),
        includesCore: index === 0,
      }))
      .filter((entry): entry is { request: SaveFormationTemplateUnitRequest; unit: FormationTemplateUnitEntry; includesCore: boolean } => Boolean(entry.unit))
  ), [draft, unitById]);

  const derived = useMemo(() => computeDerived(draft, unitById), [draft, unitById]);
  const iconProfile = useMemo(() => getFormationTemplateIcon(
    draft.type,
    visibleUnits.map(entry => ({ ...entry.unit, count: entry.request.count })),
    draft.iconId,
  ), [draft.iconId, draft.type, visibleUnits]);
  const isDirty = !draftsEqual(draft, baseline);
  const unitCount = draftUnitCount(draft);
  const isNaval = draft.type === 'naval';
  const typeIcon = iconProfile.icon;
  const headerImage = isNaval ? '/assets/events/naval-battle.png' : '/assets/events/cavalry-charge.png';
  const headerTint = iconProfile.tint;
  const selectedSiblings = templatesForMode.filter(template => normaliseTemplateType(template.type) === draft.type);
  const selectedIndex = selectedSiblings.findIndex(template => template.id === selected?.id);
  const canSave = isDirty && draft.name.trim().length > 0 && unitCount > 0 && battleGroupsValid(draft, unitById) && (!selected || selected.canEdit);
  const canApply = Boolean(selected && !isDirty && selected.canApply);
  const canAssign = Boolean(assignmentTarget && selected && !isDirty && normaliseTemplateType(selected.type) === assignmentTemplateType);
  const assignButtonLabel = assignmentTarget
    ? webUIText('FormationTemplate.AssignButton', { Name: assignmentTarget.name })
    : webUIText('Common.Assign');

  const loadTemplate = (template: FormationTemplateEntry) => {
    const nextDraft = buildDraft(template);
    setSelectedId(template.id);
    setDraft(nextDraft);
    setBaseline(nextDraft);
    setRenaming(false);
    setPickerOpen(false);
    setMessage('');
    setConfirmDeleteId(null);
  };

  const beginCreate = () => {
    setSelectedId(null);
    setDraft(emptyDraft(assignmentTemplateType ?? draft.type));
    setBaseline(null);
    setRenaming(true);
    setPickerOpen(false);
    setMessage('');
    setConfirmDeleteId(null);
  };

  const gotoSibling = (delta: number) => {
    if (selectedSiblings.length === 0) return;
    const index = selectedIndex >= 0 ? selectedIndex : 0;
    const next = selectedSiblings[(index + delta + selectedSiblings.length) % selectedSiblings.length];
    if (!assignmentTargetId) {
      openSidebar('template', next.id);
    }
    loadTemplate(next);
  };

  const updateCount = (unitId: string, count: number) => {
    setDraft(current => {
      const previousCount = current.counts[unitId] ?? 0;
      const nextCount = Math.max(0, count);
      const counts = { ...current.counts, [unitId]: nextCount };
      if (nextCount === 0) delete counts[unitId];
      const order = current.order.includes(unitId) ? current.order : [...current.order, unitId];
      const battleGroups = nextCount < previousCount
        ? removeUnitsFromBattleGroups(current.battleGroups, unitId, previousCount - nextCount)
        : current.battleGroups;
      return { ...current, counts, order: order.filter(id => (counts[id] ?? 0) > 0), battleGroups };
    });
  };

  const swapUnit = (fromId: string, toId: string) => {
    setDraft(current => {
      const fromCount = current.counts[fromId] ?? 0;
      if (fromCount <= 0) return current;

      const counts = { ...current.counts };
      delete counts[fromId];
      counts[toId] = (counts[toId] ?? 0) + fromCount;

      const order = current.order
        .map(id => (id === fromId ? toId : id))
        .filter((id, index, ids) => ids.indexOf(id) === index);
      if (!order.includes(toId)) order.push(toId);

      const battleGroups = removeUnitsFromBattleGroups(current.battleGroups, fromId, fromCount);
      return { ...current, counts, order, battleGroups };
    });
  };

  const clearComposition = () => {
    setDraft(current => ({ ...current, counts: {}, order: [], battleGroups: [] }));
    setPickerOpen(false);
    setMessage('');
  };

  const addBattleGroup = (role: BattleFormationRole) => {
    setDraft(current => {
      const hasCompatibleUnassigned = compositionRequests(current)
        .some(request => {
          const unit = unitById.get(request.unitId);
          return unit ? unassignedUnitCount(current, request.unitId) > 0 && battleFormationRole(unit) === role : false;
        });
      if (!hasCompatibleUnassigned) return current;

      const group: DraftBattleGroup = {
        id: createBattleGroupId(),
        role,
        counts: {},
        order: [],
      };
      return { ...current, battleGroups: [...current.battleGroups, group] };
    });
  };

  const removeBattleGroup = (groupId: string) => {
    setDraft(current => ({
      ...current,
      battleGroups: current.battleGroups.filter(group => group.id !== groupId),
    }));
  };

  const setBattleGroupUnitCount = (groupId: string, unitId: string, count: number) => {
    const unit = unitById.get(unitId);
    if (!unit) return;

    setDraft(current => {
      const battleGroups = current.battleGroups.map(group => {
        if (group.id !== groupId || group.role !== battleFormationRole(unit)) return group;

        const currentCount = group.counts[unitId] ?? 0;
        const assignedElsewhere = groupAssignedCountExcluding(current, unitId, groupId);
        const availableForGroup = Math.max(0, (current.counts[unitId] ?? 0) - assignedElsewhere);
        const groupRoom = MAX_BATTLE_FORMATION_SIZE - battleGroupUnitCount(group) + currentCount;
        const nextCount = Math.max(0, Math.min(count, availableForGroup, groupRoom));
        const counts = { ...group.counts };
        let order = group.order.includes(unitId) ? [...group.order] : [...group.order, unitId];

        if (nextCount > 0) {
          counts[unitId] = nextCount;
        } else {
          delete counts[unitId];
          order = order.filter(id => id !== unitId);
        }

        return { ...group, counts, order };
      });

      return { ...current, battleGroups };
    });
  };

  const saveDraft = () => {
    if (!canSave) return;

    const savedDraft = {
      ...draft,
      name: draft.name.trim(),
    };

    const iconId = savedDraft.iconId || iconProfile.kind;

    void saveFormationTemplateBridge({
      templateId: savedDraft.templateId,
      name: savedDraft.name,
      iconId,
      type: savedDraft.type,
      battleGroups: battleGroupRequests(savedDraft),
      units: compositionRequests(savedDraft),
    }).then(response => {
      setMessage(response.message);
      if (!response.saved) return;

      const nextDraft = { ...savedDraft, templateId: response.templateId, name: response.templateName, iconId };
      setDraft(nextDraft);
      setBaseline(nextDraft);
      setSelectedId(response.templateId);
      if (!savedDraft.templateId && newTemplateType) {
        openSidebar('template', response.templateId);
      }
      setRenaming(false);
      setPickerOpen(false);
      setConfirmDeleteId(null);
    });
  };

  const duplicateTemplate = () => {
    const copyName = draft.name.trim() || templateTypeName(draft.type);
    const copiedDraft = { ...draft, templateId: '', name: copyName };
    const iconId = copiedDraft.iconId || iconProfile.kind;
    void saveFormationTemplateBridge({
      templateId: '',
      name: copiedDraft.name,
      iconId,
      type: copiedDraft.type,
      battleGroups: battleGroupRequests(copiedDraft),
      units: compositionRequests(copiedDraft),
    }).then(response => {
      setMessage(response.message);
      if (!response.saved) return;

      const nextDraft = { ...copiedDraft, templateId: response.templateId, name: response.templateName, iconId };
      setDraft(nextDraft);
      setBaseline(nextDraft);
      setSelectedId(response.templateId);
      setConfirmDeleteId(null);
    });
  };

  const deleteTemplate = () => {
    if (!selected) return;
    if (confirmDeleteId !== selected.id) {
      setConfirmDeleteId(selected.id);
      setMessage(webUIText('FormationTemplate.DeleteConfirmMessage'));
      return;
    }

    void deleteFormationTemplateBridge(selected.id).then(response => {
      setMessage(response.message);
      setConfirmDeleteId(null);
      if (!response.deleted) return;

      const next = templatesForMode.find(template => template.id !== selected.id && normaliseTemplateType(template.type) === draft.type)
        ?? templatesForMode.find(template => template.id !== selected.id)
        ?? null;
      if (next) {
        loadTemplate(next);
      } else {
        setSelectedId(null);
        setDraft(emptyDraft(draft.type));
        setBaseline(null);
      }
    });
  };

  const applySelected = () => {
    if (!selected || !canApply) return;
    void applyFormationTemplateBridge(selected.id).then(response => setMessage(response.message));
  };

  const assignSelected = () => {
    if (!assignmentTarget || !selected || !canAssign) return;
    void setMilitaryFormationTemplateBridge(assignmentTarget.id, selected.id).then(() => {
      setMessage(webUIText('FormationTemplate.AssignSuccess', { Template: selected.name, Name: assignmentTarget.name }));
      openSidebar('military', assignmentTarget.id);
    }).catch(error => {
      acknowledgeBridgeFailure(error, 'game.set_military_formation_template');
      setMessage(webUIText('FormationTemplate.AssignFailed'));
    });
  };

  const revertDraft = () => {
    if (!baseline) return;
    setDraft(baseline);
    setRenaming(false);
    setPickerOpen(false);
    setMessage('');
    setConfirmDeleteId(null);
  };

  return (
    <div className="sidebar sidebar--right sidebar--visible tpl-sidebar">
      <SidebarToolbar
        navButtons={[
          { icon: '/assets/icons/I_NavPrevious.png', get tooltip() { return webUIText("Auto.Prop.componentssidebarsFormationTemplateSidebar.1047.1"); }, get tooltipBody() { return webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.1047.2'); }, onClick: () => gotoSibling(-1), disabled: selectedSiblings.length <= 1 },
          { icon: '/assets/icons/I_NavNext.png', get tooltip() { return webUIText("Auto.Prop.componentssidebarsFormationTemplateSidebar.1048.1"); }, get tooltipBody() { return webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.1048.3'); }, onClick: () => gotoSibling(1), disabled: selectedSiblings.length <= 1 },
        ]}
        actionButtons={[
          ...(assignmentTarget ? [{
            icon: '/assets/icons/I_Template.png',
            get tooltip() { return webUIText("Auto.Prop.componentssidebarsFormationTemplateSidebar.1053.1"); },
            get tooltipBody() { return selected ? webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.1053.4', { Name: assignmentTarget.name }) : webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.1053.5'); },
            onClick: assignSelected,
            disabled: !canAssign,
          }] : []),
          { icon: typeIcon, get tooltip() { return webUIText("Auto.Prop.componentssidebarsFormationTemplateSidebar.1058.1"); }, get tooltipBody() { return selected?.applyReason || webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.1058.6'); }, onClick: applySelected, disabled: !canApply },
          { icon: '/assets/icons/I_NewTemplate.png', get tooltip() { return webUIText("Auto.Prop.componentssidebarsFormationTemplateSidebar.1059.1"); }, get tooltipBody() { return webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.1059.7'); }, onClick: beginCreate },
          { icon: '/assets/icons/I_DuplicateTemplate.png', get tooltip() { return webUIText("Auto.Prop.componentssidebarsFormationTemplateSidebar.1060.1"); }, get tooltipBody() { return webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.1060.8'); }, onClick: duplicateTemplate, disabled: unitCount === 0 },
          { icon: '/assets/icons/DeselectAll.png', get tooltip() { return webUIText("Auto.Prop.componentssidebarsFormationTemplateSidebar.1061.1"); }, get tooltipBody() { return webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.1061.9'); }, onClick: clearComposition, disabled: unitCount === 0 },
          { icon: '/assets/icons/I_Close.png', get tooltip() { return confirmDeleteId === selected?.id ? webUIText("Auto.Fix.PropExprTrue.componentssidebarsFormationTemplateSidebar.1062.1") : webUIText("Auto.Fix.PropExprFalse.componentssidebarsFormationTemplateSidebar.1062.1"); }, get tooltipBody() { return webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.1062.10'); }, onClick: deleteTemplate, disabled: !selected?.canDelete },
        ]}
        onClose={onClose}
        closePosition="start"
      />

      <div className="tpl-header">
        <img src={headerImage} alt="" className="tpl-header-bg" />
        <div className="tpl-header-scrim" style={{ '--template-tint': headerTint } as React.CSSProperties} />
        <div className="tpl-header-content">
          <Tooltip content={{ title: templateKind(draft.type), get body() { return isNaval ? webUIText("Auto.Fix.PropExprTrue.componentssidebarsFormationTemplateSidebar.1072.1") : webUIText("Auto.Fix.PropExprFalse.componentssidebarsFormationTemplateSidebar.1072.1"); } }} position="bottom" delay={200}>
            <div className="tpl-header-roundel">
              <img src={typeIcon} alt="" className="tpl-header-type-icon" />
            </div>
          </Tooltip>
          <div className="tpl-header-info">
            <div className="tpl-header-name-row">
              {renaming ? (
                <input
                  className="tpl-header-name-input"
                  autoFocus
                  value={draft.name}
                  onChange={event => setDraft(current => ({ ...current, name: event.target.value }))}
                  onBlur={() => {
                    setDraft(current => ({ ...current, name: current.name.trim() }));
                    setRenaming(false);
                  }}
                  onKeyDown={event => {
                    if (event.key === 'Enter') event.currentTarget.blur();
                    if (event.key === 'Escape') setRenaming(false);
                  }}
                  maxLength={64}
                />
              ) : (
                <button type="button" className="tpl-header-name-btn" onMouseDown={() => setRenaming(true)}>
                  <span className="tpl-header-name">{draft.name || webUIText("Auto.Fix.ExprFallback.componentssidebarsFormationTemplateSidebar.1097.1")}</span>
                  <img src="/assets/icons/I_Rename.png" alt="" className="tpl-header-edit-pencil" />
                </button>
              )}
            </div>
            <div className="tpl-header-status-row">
              <Badge text={templateKind(draft.type)} colour="var(--gold)" />
              {selected?.isActiveBuildTemplate && <Badge text={webUIText('Auto.ExtraAttr.ComponentsSidebarsFormationTemplateSidebar.1104.1')} colour="var(--green)" />}
              {isDirty && <Badge text={webUIText('Auto.ExtraAttr.ComponentsSidebarsFormationTemplateSidebar.1105.2')} colour="var(--orange)" />}
            </div>
            <div className="tpl-header-meta-row">
              <img src={typeIcon} alt="" className="tpl-header-meta-icon" />
              <span className="tpl-header-meta-text">{webUIText('Common.CountWithUnit', { Count: fmt(unitCount), Unit: webUIText(unitCount === 1 ? 'Common.Unit' : 'Common.Units') })}</span>
            </div>
          </div>
        </div>
      </div>

      <SidebarTabBar
        tabs={[{ id: 'composition', label: webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.1116.33') }, { id: 'combat', label: webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.1116.34') }]}
        activeTab={activeTab}
        onTabChange={id => setActiveTab(id as TemplateTab)}
      />

      <StyledScrollArea className="sidebar-content sidebar-content--textured tpl-content">
        {activeTab === 'composition' ? (
          <div className="tpl-composition">
            <TotalsBlock derived={derived} isNaval={isNaval} />
            {assignmentTarget && (
              <div className="tpl-assignment-panel">
                <img src="/assets/icons/I_Template.png" alt="" className="tpl-assignment-icon" />
                <span className="tpl-assignment-copy">
                  <span className="tpl-assignment-title"><WebUIText textKey="FormationTemplate.AssignModeTitle" /></span>
                  <span className="tpl-assignment-body">{webUIText('FormationTemplate.AssignModeBody', { Name: assignmentTarget.name })}</span>
                </span>
              </div>
            )}
            {message && <div className="tpl-status">{message}</div>}
            {selected?.applyReason && <div className="tpl-status tpl-status--warning">{selected.applyReason}</div>}

            <SectionHeading variant="ornate" title={webUIText('Auto.Attr.ComponentsSidebarsFormationTemplateSidebar.1128.35')} />
            {visibleUnits.length === 0 ? (
              <div className="tpl-empty"><WebUIText textKey="Auto.ComponentsSidebarsFormationTemplateSidebar.1129.7" /></div>
            ) : (
              <div className="tpl-unit-list">
                {visibleUnits.map(({ request, unit, includesCore }) => (
                  <UnitRow
                    key={unit.id}
                    unit={unit}
                    count={request.count}
                    includesCore={includesCore}
                    unitById={unitById}
                    onIncrement={() => updateCount(unit.id, request.count + 1)}
                    onDecrement={() => updateCount(unit.id, request.count - 1)}
                    onSwap={swapUnit}
                    onRemove={() => updateCount(unit.id, 0)}
                  />
                ))}
              </div>
            )}

            <button
              type="button"
              className="tpl-add-unit"
              onMouseDown={() => {
                setCatalogueRequested(true);
                setPickerOpen(true);
              }}
            >
              <img src="/assets/icons/I_NewTemplate.png" alt="" className="tpl-add-unit-icon" />
              <span className="tpl-add-unit-label"><WebUIText textKey="FormationTemplate.ChooseUnits" /></span>
            </button>

            {selected && (
              <>
                <SectionHeading variant="ornate" title={webUIText('Auto.Attr.ComponentsSidebarsFormationTemplateSidebar.1156.36')} />
                <AssignedForces forces={selected.assignedForces} openForce={id => openSidebar('military', id)} />
              </>
            )}
          </div>
        ) : (
          <CombatTab
            draft={draft}
            unitById={unitById}
            derived={derived}
            onAddBattleGroup={addBattleGroup}
            onRemoveBattleGroup={removeBattleGroup}
            onSetBattleGroupUnitCount={setBattleGroupUnitCount}
          />
        )}
      </StyledScrollArea>

      {pickerOpen && (
        <Picker
          availableClasses={availableClasses}
          currentCounts={draft.counts}
          onAdd={unitId => updateCount(unitId, (draft.counts[unitId] ?? 0) + 1)}
          onCancel={() => setPickerOpen(false)}
        />
      )}

      <div className="tpl-footer">
        {assignmentTarget && (
          <button type="button" className="tpl-footer-btn tpl-footer-btn--assign" onMouseDown={assignSelected} disabled={!canAssign}>
            {assignButtonLabel}
          </button>
        )}
        {selected && !assignmentTarget && (
          <button type="button" className="tpl-footer-btn tpl-footer-btn--danger" onMouseDown={deleteTemplate} disabled={!selected.canDelete}>
            {confirmDeleteId === selected.id ? webUIText("Auto.Fix.PropExprTrue.componentssidebarsFormationTemplateSidebar.1062.1") : webUIText("Auto.Fix.PropExprFalse.componentssidebarsFormationTemplateSidebar.1062.1")}
          </button>
        )}
        <button type="button" className="tpl-footer-btn tpl-footer-btn--secondary" onMouseDown={revertDraft} disabled={!isDirty || !baseline}>
          <WebUIText textKey="Auto.ComponentsSidebarsFormationTemplateSidebar.1176.9" />
        </button>
        <button type="button" className="tpl-footer-btn tpl-footer-btn--primary" onMouseDown={saveDraft} disabled={!canSave}>
          {isDirty ? webUIText("Auto.Fix.ExprTrue.componentssidebarsFormationTemplateSidebar.1180.1") : baseline ? webUIText("Auto.Fix.ExprFalseTrue.componentssidebarsFormationTemplateSidebar.1180.1") : webUIText("Auto.Fix.ExprFalseFalse.componentssidebarsFormationTemplateSidebar.1180.1", { Value1: templateTypeName(draft.type) })}
        </button>
      </div>
    </div>
  );
};

export default React.memo(FormationTemplateSidebar);

registerSidebar({
  id: 'template',
  side: 'right',
  component: FormationTemplateSidebar,
});
