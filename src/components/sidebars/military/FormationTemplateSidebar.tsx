import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Badge from '../../common/data-display/stats/Badge';
import SectionHeading from '../../common/data-display/stats/SectionHeading';
import StyledScrollArea from '../../common/layout/scrolling/StyledScrollArea';
import ConfirmDialog from '../../common/forms/ConfirmDialog';
import Tooltip from '../../common/tooltips/Tooltip';
import { dismissSharedTooltips } from '../../common/tooltips/tooltipEvents';
import {
  applyFormationTemplateBridge,
  deleteFormationTemplateBridge,
  generateFormationTemplateNameBridge,
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
  const maximumBattleGroupUnits = data?.maximumBattleGroupUnits ?? 0;
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
  const [renameDraft, setRenameDraft] = useState('');
  const [nameEdited, setNameEdited] = useState(false);
  const titleInputRef = React.useRef<HTMLInputElement>(null);
  const automaticNameRequestRef = React.useRef(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [catalogueRequested, setCatalogueRequested] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

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
        const nextDraft = emptyDraft(newTemplateType);
        setSelectedId(null);
        setDraft(nextDraft);
        setBaseline(null);
        setRenameDraft(nextDraft.name);
        setRenaming(false);
        setNameEdited(false);
        setPickerOpen(false);
        setMessage('');
        setConfirmingDelete(false);
      }, 0);

      return () => window.clearTimeout(timer);
    }

    if (assignmentTargetId && !assignmentTarget) return;

    const requested = requestedTemplateId ? templatesForMode.find(template => template.id === requestedTemplateId) : null;
    const next = requested ?? (baseline ? null : templatesForMode[0] ?? null);

    if (!next) {
      if (assignmentTemplateType && !baseline) {
        const timer = window.setTimeout(() => {
          const nextDraft = emptyDraft(assignmentTemplateType);
          setSelectedId(null);
          setDraft(nextDraft);
          setBaseline(null);
          setRenameDraft(nextDraft.name);
          setRenaming(false);
          setNameEdited(false);
          setPickerOpen(false);
          setMessage('');
          setConfirmingDelete(false);
        }, 0);

        return () => window.clearTimeout(timer);
      }
      return;
    }

    if (next.id === baseline?.templateId) {
      if (!shouldStartRenaming) return;

      const timer = window.setTimeout(() => {
        setRenameDraft(baseline?.name ?? next.name);
        setRenaming(true);
        window.setTimeout(() => {
          titleInputRef.current?.focus();
          titleInputRef.current?.select();
        }, 0);
      }, 0);

      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      const nextDraft = buildDraft(next);
      setSelectedId(next.id);
      setDraft(nextDraft);
      setBaseline(nextDraft);
      setRenameDraft(nextDraft.name);
      setRenaming(shouldStartRenaming);
      setNameEdited(true);
      setPickerOpen(false);
      setMessage('');
      setConfirmingDelete(false);
      if (shouldStartRenaming) {
        window.setTimeout(() => {
          titleInputRef.current?.focus();
          titleInputRef.current?.select();
        }, 0);
      }
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
  const automaticNameSignature = JSON.stringify(compositionRequests(draft));

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
  const canSave = isDirty && draft.name.trim().length > 0 && unitCount > 0 && battleGroupsValid(draft, unitById, maximumBattleGroupUnits) && (!selected || selected.canEdit);
  const canApply = Boolean(selected && !isDirty && selected.canApply);
  const canAssign = Boolean(assignmentTarget && selected && !isDirty && normaliseTemplateType(selected.type) === assignmentTemplateType);
  const assignButtonLabel = assignmentTarget
    ? webUIText('FormationTemplate.AssignButton', { Name: assignmentTarget.name })
    : webUIText('Common.Assign');

  useEffect(() => {
    if (draft.templateId || nameEdited) return;

    const requestId = automaticNameRequestRef.current + 1;
    automaticNameRequestRef.current = requestId;
    let cancelled = false;
    const units = JSON.parse(automaticNameSignature) as SaveFormationTemplateUnitRequest[];

    void generateFormationTemplateNameBridge(draft.type, units)
      .then(response => {
        if (cancelled || automaticNameRequestRef.current !== requestId) return;
        setDraft(current => current.templateId || current.name === response.name
          ? current
          : { ...current, name: response.name });
      })
      .catch(acknowledgeBridgeFailure);

    return () => {
      cancelled = true;
    };
  }, [automaticNameSignature, draft.templateId, draft.type, nameEdited]);

  const beginRename = (currentName: string = draft.name) => {
    setRenameDraft(currentName);
    setRenaming(true);
    window.setTimeout(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }, 0);
  };

  const confirmRename = () => {
    const nextName = renameDraft.trim();
    if (!nextName) return;
    setRenaming(false);
    if (nextName !== draft.name) {
      automaticNameRequestRef.current += 1;
      setNameEdited(true);
      setDraft(current => ({ ...current, name: nextName }));
    }
  };

  const cancelRename = () => {
    setRenameDraft(draft.name);
    setRenaming(false);
  };

  const handleRenameKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      confirmRename();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelRename();
    }
  };

  const loadTemplate = (template: FormationTemplateEntry) => {
    const nextDraft = buildDraft(template);
    setSelectedId(template.id);
    setDraft(nextDraft);
    setBaseline(nextDraft);
    setRenaming(false);
    setRenameDraft(nextDraft.name);
    setNameEdited(true);
    setPickerOpen(false);
    setMessage('');
    setConfirmingDelete(false);
  };

  const beginCreate = () => {
    const nextDraft = emptyDraft(assignmentTemplateType ?? draft.type);
    setSelectedId(null);
    setDraft(nextDraft);
    setBaseline(null);
    setRenameDraft(nextDraft.name);
    setRenaming(false);
    setNameEdited(false);
    setPickerOpen(false);
    setMessage('');
    setConfirmingDelete(false);
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
        const groupRoom = maximumBattleGroupUnits - battleGroupUnitCount(group) + currentCount;
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
      setRenameDraft(nextDraft.name);
      setRenaming(false);
      setNameEdited(true);
      setPickerOpen(false);
      setConfirmingDelete(false);
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
      setNameEdited(true);
      setConfirmingDelete(false);
    });
  };

  const requestDeleteTemplate = () => {
    if (!selected?.canDelete) return;
    dismissSharedTooltips();
    setConfirmingDelete(true);
  };

  const executeDeleteTemplate = () => {
    if (!selected?.canDelete) return;

    void deleteFormationTemplateBridge(selected.id).then(response => {
      setMessage(response.message);
      setConfirmingDelete(false);
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
        setNameEdited(false);
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
    setRenameDraft(baseline.name);
    setRenaming(false);
    setPickerOpen(false);
    setMessage('');
    setConfirmingDelete(false);
  };

  return (
    <>
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
          { icon: '/assets/icons/I_Close.png', get tooltip() { return webUIText("FormationTemplateSidebar.DeleteTemplate"); }, get tooltipBody() { return webUIText('Auto.Prop.ComponentsSidebarsFormationTemplateSidebar.1062.10'); }, onClick: requestDeleteTemplate, disabled: !selected?.canDelete },
        ]}
        onClose={onClose}
        closePosition="start"
      />

      <div className="tpl-header">
        <img src={headerImage} alt="" className="tpl-header-bg" />
        <div className="tpl-header-scrim" style={{ '--template-tint': headerTint } as React.CSSProperties} />
        <div className="tpl-header-content">
          <Tooltip content={{ title: templateKind(draft.type), get body() { return isNaval ? webUIText("FormationTemplateSidebar.NavalCompositionBody") : webUIText("FormationTemplateSidebar.LandCompositionBody"); } }} position="bottom" delay={200}>
            <div className="tpl-header-roundel">
              <img src={typeIcon} alt="" className="tpl-header-type-icon" />
            </div>
          </Tooltip>
          <div className="tpl-header-info">
            <div className="tpl-header-name-row">
              {renaming ? (
                <div className="tpl-rename-row">
                  <input
                    ref={titleInputRef}
                    className="tpl-header-name-input"
                    value={renameDraft}
                    onChange={event => setRenameDraft(event.target.value)}
                    onKeyDown={handleRenameKeyDown}
                    maxLength={64}
                  />
                  <Tooltip content={{ title: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.875.47') }} position="bottom" delay={150}>
                    <button type="button" className="tpl-header-rename-btn" onClick={confirmRename}>
                      <img src="/assets/ui/I_TickIcon.png" alt="" className="tpl-header-edit-pencil" />
                    </button>
                  </Tooltip>
                  <Tooltip content={{ title: webUIText('Auto.Prop.ComponentsSidebarsSettlementSidebar.880.48') }} position="bottom" delay={150}>
                    <button type="button" className="tpl-header-rename-btn" onClick={cancelRename}>
                      <img src="/assets/ui/I_CloseIcon.png" alt="" className="tpl-header-edit-pencil" />
                    </button>
                  </Tooltip>
                </div>
              ) : (
                <>
                  <span className="tpl-header-name">{draft.name || webUIText("FormationTemplateSidebar.NewTemplate")}</span>
                  <Tooltip content={{ title: webUIText('Auto.Prop.ComponentsSidebarsMilitarySidebar.585.12'), body: webUIText('Auto.Prop.ComponentsSidebarsMilitarySidebar.587.13') }} position="bottom" delay={150}>
                    <button type="button" className="tpl-header-rename-btn" onClick={() => beginRename()}>
                      <img src="/assets/icons/I_Rename.png" alt="" className="tpl-header-edit-pencil" />
                    </button>
                  </Tooltip>
                </>
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
            {selected?.applyReason && <div className="game-notice game-notice--warning tpl-status tpl-status--warning">{selected.applyReason}</div>}

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
                    onIncrement={(delta) => updateCount(unit.id, request.count + delta)}
                    onDecrement={(delta) => updateCount(unit.id, request.count - delta)}
                    onSwap={swapUnit}
                    onRemove={() => updateCount(unit.id, 0)}
                  />
                ))}
              </div>
            )}

            <button
              type="button"
              className="tpl-add-unit"
              onClick={() => {
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
            maximumBattleGroupUnits={maximumBattleGroupUnits}
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
          onAdd={(unitId, amount) => updateCount(unitId, (draft.counts[unitId] ?? 0) + amount)}
          onCancel={() => setPickerOpen(false)}
        />
      )}

      <div className="tpl-footer">
        {assignmentTarget && (
          <button type="button" className="tpl-footer-btn tpl-footer-btn--assign" onClick={assignSelected} disabled={!canAssign}>
            {assignButtonLabel}
          </button>
        )}
        {selected && !assignmentTarget && (
          <button type="button" className="tpl-footer-btn tpl-footer-btn--danger" onClick={requestDeleteTemplate} disabled={!selected.canDelete}>
            {webUIText("FormationTemplateSidebar.DeleteTemplate")}
          </button>
        )}
        <button type="button" className="tpl-footer-btn tpl-footer-btn--secondary" onClick={revertDraft} disabled={!isDirty || !baseline}>
          <WebUIText textKey="Auto.ComponentsSidebarsFormationTemplateSidebar.1176.9" />
        </button>
        <button type="button" className="tpl-footer-btn tpl-footer-btn--primary" onClick={saveDraft} disabled={!canSave}>
          {isDirty ? webUIText("FormationTemplateSidebar.SaveChanges") : baseline ? webUIText("FormationTemplateSidebar.Saved") : webUIText("FormationTemplateSidebar.Save", { Value1: templateTypeName(draft.type) })}
        </button>
      </div>
    </div>
    {createPortal(
      <ConfirmDialog
        visible={confirmingDelete && selected !== null}
        title={webUIText('FormationTemplate.DeleteConfirmTitle', { Name: selected?.name ?? '' })}
        message={webUIText('FormationTemplate.DeleteConfirmMessage')}
        confirmText={webUIText('FormationTemplate.DeleteButton')}
        variant="danger"
        onConfirm={executeDeleteTemplate}
        onClosed={() => setConfirmingDelete(false)}
      />,
      document.body,
    )}
    </>
  );
};

export default React.memo(FormationTemplateSidebar);

registerSidebar({
  id: 'template',
  side: 'right',
  component: FormationTemplateSidebar,
});
