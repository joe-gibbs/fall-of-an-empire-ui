import ArmyGlance from './ArmyGlance';
import type { NavyGlanceData } from './WorldGlanceTypes';

interface NavyGlanceProps {
  data: NavyGlanceData;
}

// NavyGlance uses the same circular military marker as ArmyGlance, with the
// navy flag switching the kind badge, tooltip labels, and blockade state.
export default function NavyGlance({ data }: NavyGlanceProps) {
  return <ArmyGlance data={data} isNavy />;
}
