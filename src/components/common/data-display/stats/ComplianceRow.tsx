import Tooltip from '../../tooltips/Tooltip';
import { buildComplianceTooltip, type ComplianceTooltipSource } from '../../../../utils/characterTooltipContent';
import { getComplianceState } from '../../../../utils/colorFormatters';
import { webUIText, WebUIText } from '../../../../localization/WebUITextContext';
import './ComplianceRow.css';

export default function ComplianceRow({
  value,
  character,
  compact = false,
  showLabel = true,
  additionalHelp,
}: {
  value: number;
  character?: ComplianceTooltipSource | null;
  compact?: boolean;
  showLabel?: boolean;
  additionalHelp?: string;
}) {
  const state = getComplianceState(value);
  return (
    <Tooltip
      content={buildComplianceTooltip(value, character ? { ...character, compliance: value } : { compliance: value }, {
        title: webUIText('Auto.Prop.componentssidebarsCharacterSidebar.1125.1', { Label: state.label }),
        body: webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1126.32'),
        footer: [webUIText('Auto.Prop.ComponentsSidebarsCharacterSidebar.1131.35'), additionalHelp].filter(Boolean).join('\n\n'),
      })}
      position="bottom"
      delay={200}
    >
      <div className={`compliance-row${compact ? ' compliance-row--compact' : ''}`}>
        <img src={state.icon} alt="" className="compliance-row-icon" />
        {showLabel && <span className="compliance-row-label"><WebUIText textKey="InternalPolitics.Compliance" /></span>}
        <span className="compliance-row-val" style={{ color: state.color }}>{state.label}</span>
      </div>
    </Tooltip>
  );
}
