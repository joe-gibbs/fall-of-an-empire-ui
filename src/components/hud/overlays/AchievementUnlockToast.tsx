import { useEffect, useRef, useState } from 'react';
import { bridgeCall } from '../../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import { useWebUIText } from '../../../localization/WebUITextContext';
import './AchievementUnlockToast.css';

interface AchievementUnlockedPayload {
  id: string;
  displayName: string;
  description: string;
  iconUrl: string;
}

const DISPLAY_DURATION_MS = 5000;

export default function AchievementUnlockToast() {
  const t = useWebUIText();
  const [achievement, setAchievement] = useState<AchievementUnlockedPayload | null>(null);
  const dismissTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onAchievementUnlocked = (event: Event) => {
      const payload = (event as CustomEvent<AchievementUnlockedPayload>).detail;
      if (!payload?.id) return;

      if (dismissTimer.current !== undefined) {
        window.clearTimeout(dismissTimer.current);
      }

      setAchievement(payload);
      dismissTimer.current = window.setTimeout(() => {
        setAchievement(null);
        dismissTimer.current = undefined;
      }, DISPLAY_DURATION_MS);
    };

    window.addEventListener('bridge:game.achievement_unlocked', onAchievementUnlocked);
    bridgeCall('game.achievement_events').catch(acknowledgeBridgeFailure);

    return () => {
      window.removeEventListener('bridge:game.achievement_unlocked', onAchievementUnlocked);
      if (dismissTimer.current !== undefined) {
        window.clearTimeout(dismissTimer.current);
      }
    };
  }, []);

  if (!achievement) return null;

  return (
    <aside className="achievement-unlock-toast" role="status" aria-live="polite">
      {achievement.iconUrl && <img src={achievement.iconUrl} alt="" className="achievement-unlock-toast-icon" draggable={false} />}
      <div className="achievement-unlock-toast-copy">
        <div className="achievement-unlock-toast-label">{t('Achievements.UnlockNotificationTitle')}</div>
        <div className="achievement-unlock-toast-title">{achievement.displayName}</div>
        <div className="achievement-unlock-toast-description">{achievement.description}</div>
      </div>
    </aside>
  );
}
