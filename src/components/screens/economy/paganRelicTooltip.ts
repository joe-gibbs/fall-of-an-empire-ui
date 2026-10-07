export interface RelicTooltipRelic {
  name: string;
  iconPath: string;
  godName: string;
  religionId: string;
  religionName: string;
  settlementName: string;
  ownerName: string;
}

type TextFormatter = (key: string, args?: Record<string, string | number | boolean | null | undefined>) => string;

export function relicTooltipLines(relic: RelicTooltipRelic, t: TextFormatter) {
  const lines: { label: string; value?: string; labelIcon?: string }[] = [];
  if (relic.religionName) {
    lines.push({
      label: t('Pagan.Faith'),
      value: relic.religionName,
      labelIcon: `/assets/religions/${relic.religionId}.png`,
    });
  }
  lines.push(
    { label: t('Pagan.UnlocksGod'), value: relic.godName },
    { label: t('Pagan.HeldAt'), value: relic.settlementName },
    { label: t('Pagan.Owner'), value: relic.ownerName || t('Common.None') },
  );
  return lines;
}

export function relicTooltipContent(relic: RelicTooltipRelic, t: TextFormatter) {
  return {
    iconPath: relic.iconPath,
    title: relic.name,
    body: relic.religionName && relic.godName
      ? t('Pagan.RelicHelp', { Religion: relic.religionName, God: relic.godName })
      : undefined,
    lines: relicTooltipLines(relic, t),
  };
}
