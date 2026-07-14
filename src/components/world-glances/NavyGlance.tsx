import ArmyGlance from './ArmyGlance';
import type { NavyGlanceData } from './WorldGlanceTypes';

interface NavyGlanceProps {
  data: NavyGlanceData;
}

// NavyGlance shares the military data treatment with ArmyGlance while the
// navy flag supplies the central ship mark, labels, and blockade state.
export default function NavyGlance({ data }: NavyGlanceProps) {
  return <ArmyGlance data={data} isNavy />;
}
