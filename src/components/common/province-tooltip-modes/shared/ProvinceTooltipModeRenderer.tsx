import AdminTooltip from '../governance/AdminTooltip';
import BishopricTooltip from '../governance/BishopricTooltip';
import ComplianceTooltip from '../governance/ComplianceTooltip';
import CorruptionTooltip from '../governance/CorruptionTooltip';
import CustomMapModeTooltip from '../status/CustomMapModeTooltip';
import DiplomaticStatusTooltip from '../status/DiplomaticStatusTooltip';
import DiseaseTooltip from '../status/DiseaseTooltip';
import EconomyTooltip from '../economy/EconomyTooltip';
import GarrisonsTooltip from '../status/GarrisonsTooltip';
import MilitaryTooltip from '../status/MilitaryTooltip';
import OverlordTooltip from '../governance/OverlordTooltip';
import PoliticalTooltip from '../governance/PoliticalTooltip';
import PopulationTooltip from '../economy/PopulationTooltip';
import RegionGovernorTooltip from '../governance/RegionGovernorTooltip';
import ResourcesTooltip from '../economy/ResourcesTooltip';
import { CultureTooltip, ReligionTooltip } from './ShareListTooltip';
import StockpilesTooltip from '../economy/StockpilesTooltip';
import TradeTooltip from '../economy/TradeTooltip';
import UnrestTooltip from '../governance/UnrestTooltip';
import type { ProvinceTooltipModeData } from './types';

export default function ProvinceTooltipModeRenderer({ data }: { data: ProvinceTooltipModeData }) {
  switch (data.mapModeId) {
    case 'political':
    case 'normal':
      return <PoliticalTooltip data={data} />;
    case 'overlord':
      return <OverlordTooltip data={data} />;
    case 'religion':
      return <ReligionTooltip data={data} />;
    case 'culture':
      return <CultureTooltip data={data} />;
    case 'resources':
      return <ResourcesTooltip data={data} />;
    case 'stockpiles':
      return <StockpilesTooltip data={data} />;
    case 'population':
    case 'settlementType':
      return <PopulationTooltip data={data} />;
    case 'unrest':
      return <UnrestTooltip data={data} />;
    case 'opinion':
    case 'loyalty':
      return <ComplianceTooltip data={data} />;
    case 'economicProsperity':
    case 'economy':
    case 'gold':
      return <EconomyTooltip data={data} />;
    case 'adminRegion':
    case 'adminLand':
    case 'adminDomain':
      return <AdminTooltip data={data} />;
    case 'disease':
      return <DiseaseTooltip data={data} />;
    case 'militaries':
      return <MilitaryTooltip data={data} />;
    case 'regionGovernor':
    case 'governorAssignment':
      return <RegionGovernorTooltip data={data} />;
    case 'corruption':
      return <CorruptionTooltip data={data} />;
    case 'trade':
      return <TradeTooltip data={data} />;
    case 'garrisons':
    case 'garrison':
      return <GarrisonsTooltip data={data} />;
    case 'bishopric':
      return <BishopricTooltip data={data} />;
    case 'diplomaticRelation':
      return <DiplomaticStatusTooltip data={data} />;
    default:
      return <CustomMapModeTooltip data={data} />;
  }
}
