import { useEffect, useMemo, useState } from 'react';
import ScreenShell from '../../common/layout/shell/ScreenShell';
import { registerScreen, registerTopbarButton } from '../../../registry/index';
import { bridgeCall, type AchievementEntry, type GetAchievementsResponse } from '../../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import { formatNumber } from '../../../utils/numberFormat';
import { webUIText, useWebUIText } from '../../../localization/WebUITextContext';
import './AchievementsScreen.css';

interface AchievementsScreenProps {
  onClose: () => void;
}

const CATEGORY_ORDER = ['powerBlocs', 'military', 'buildings', 'characters', 'religion', 'diplomacy', 'culture', 'challenge', 'hidden'];
const ACHIEVEMENT_ICON = '/assets/icons/I_Achievements.png';

function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    powerBlocs: 'Achievements.Category.PowerBlocs',
    military: 'Achievements.Category.Military',
    buildings: 'Achievements.Category.Buildings',
    characters: 'Achievements.Category.Characters',
    religion: 'Achievements.Category.Religion',
    diplomacy: 'Achievements.Category.Diplomacy',
    culture: 'Achievements.Category.Culture',
    challenge: 'Achievements.Category.Challenge',
    hidden: 'Achievements.Category.Hidden',
  };
  return webUIText(labels[category] ?? 'Achievements.Category.Challenge');
}

function rarityLabel(rarity: string): string {
  const labels: Record<string, string> = {
    common: 'Achievements.Rarity.Common',
    uncommon: 'Achievements.Rarity.Uncommon',
    rare: 'Achievements.Rarity.Rare',
    epic: 'Achievements.Rarity.Epic',
    legendary: 'Achievements.Rarity.Legendary',
  };
  return webUIText(labels[rarity] ?? 'Achievements.Rarity.Common');
}

function groupAchievements(entries: AchievementEntry[]): Array<[string, AchievementEntry[]]> {
  const groups = new Map<string, AchievementEntry[]>();
  for (const entry of entries) {
    const group = groups.get(entry.category);
    if (group) {
      group.push(entry);
    } else {
      groups.set(entry.category, [entry]);
    }
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b))
    .map(([category, categoryEntries]) => [
      category,
      categoryEntries.sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || a.displayName.localeCompare(b.displayName)),
    ]);
}

const AchievementsScreen: React.FC<AchievementsScreenProps> = ({ onClose }) => {
  const t = useWebUIText();
  const [data, setData] = useState<GetAchievementsResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    bridgeCall('game.get_achievements')
      .then(response => {
        if (!cancelled) {
          if (response.steamAvailable) {
            onClose();
            return;
          }
          setData(response);
        }
      })
      .catch(acknowledgeBridgeFailure);

    return () => {
      cancelled = true;
    };
  }, [onClose]);

  const groupedAchievements = useMemo(() => groupAchievements(data?.achievements ?? []), [data]);
  const completionPercent = Math.round((data?.completionPercent ?? 0) * 100);

  if (!data) return null;

  return (
    <ScreenShell
      title={t('Achievements.Title')}
      onClose={onClose}
      className="screen--achievements"
      contentClassName="achievements-content"
      styledScrollContent={true}
    >
      <div className="achievements-wrap">
        <div className="achievements-summary">
          <img src={ACHIEVEMENT_ICON} alt="" className="achievements-summary-icon" draggable={false} />
          <div className="achievements-summary-main">
            <div className="achievements-summary-count">
              {t('Achievements.SummaryCount', {
                unlocked: formatNumber(data.unlockedAchievements),
                total: formatNumber(data.totalAchievements),
              })}
            </div>
            <div className="achievements-summary-bar" aria-label={t('Achievements.Completion')}>
              <div className="achievements-summary-bar-fill" style={{ width: `${completionPercent}%` }} />
            </div>
          </div>
          <div className="achievements-summary-meta">
            <span>{t('Achievements.CompletionValue', { percent: formatNumber(completionPercent) })}</span>
          </div>
        </div>

        {!data.achievementsEnabled && (
          <div className="game-notice game-notice--warning achievements-disabled">
            <div className="achievements-disabled-title">{t('Achievements.DisabledTitle')}</div>
            <div className="achievements-disabled-body">
              {data.disabledReasons.map(reason => (
                <div key={reason} className="achievements-disabled-reason">{reason}</div>
              ))}
            </div>
          </div>
        )}

        <div className="achievements-groups">
          {groupedAchievements.map(([category, entries]) => (
            <section key={category} className="achievements-group">
              <div className="achievements-group-title">{categoryLabel(category)}</div>
              <div className="achievements-list">
                {entries.map(entry => {
                  const percent = Math.round(entry.progressPercent * 100);
                  return (
                    <article
                      key={entry.id}
                      className={`achievement-row achievement-row--with-icon${entry.unlocked ? ' achievement-row--unlocked' : ''}${!entry.canBeEarned && !entry.unlocked ? ' achievement-row--unavailable' : ''}`}
                    >
                      {entry.iconUrl && (
                        <img src={entry.iconUrl} alt="" className="achievement-row-icon" draggable={false} />
                      )}
                      <div className="achievement-row-main">
                        <div className="achievement-row-heading">
                          <span className="achievement-row-title">{entry.displayName}</span>
                        </div>
                        <div className="achievement-row-description">{entry.effectiveDescription}</div>
                        <div className="achievement-row-progress">
                          <div className="achievement-row-progress-bar" aria-label={t('Achievements.Progress')}>
                            <div className="achievement-row-progress-fill" style={{ width: `${percent}%` }} />
                          </div>
                          <span className="achievement-row-progress-text">{entry.progressText}</span>
                        </div>
                      </div>
                      <div className="achievement-row-meta">
                        <span>{rarityLabel(entry.rarity)}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </ScreenShell>
  );
};

registerTopbarButton({
  id: 'achievements',
  get label() { return webUIText('Achievements.Title'); },
  labelKey: 'Achievements.Title',
  icon: ACHIEVEMENT_ICON,
  placement: 'right',
  tooltip: {
    get title() { return webUIText('Achievements.Title'); },
    titleKey: 'Achievements.Title',
    get body() { return webUIText('Achievements.TopbarTooltipBody'); },
    bodyKey: 'Achievements.TopbarTooltipBody',
  },
  order: 60,
});

registerScreen({
  id: 'achievements',
  render: ({ onClose }) => <AchievementsScreen onClose={onClose} />,
  topbarId: 'achievements',
});

export default AchievementsScreen;
