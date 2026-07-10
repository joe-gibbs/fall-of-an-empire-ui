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
const EXIT_DURATION_MS = 240;

interface ActiveAchievement {
  payload: AchievementUnlockedPayload;
  closing: boolean;
}

export default function AchievementUnlockToast() {
  const t = useWebUIText();
  const [achievement, setAchievement] = useState<ActiveAchievement | null>(null);
  const dismissTimer = useRef<number | undefined>(undefined);
  const closeTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onAchievementUnlocked = (event: Event) => {
      const payload = (event as CustomEvent<AchievementUnlockedPayload>).detail;
      if (!payload?.id) return;

      if (dismissTimer.current !== undefined) {
        window.clearTimeout(dismissTimer.current);
      }
      if (closeTimer.current !== undefined) {
        window.clearTimeout(closeTimer.current);
      }

      setAchievement({ payload, closing: false });
      dismissTimer.current = window.setTimeout(() => {
        setAchievement(current => current ? { ...current, closing: true } : null);
        dismissTimer.current = undefined;
        closeTimer.current = window.setTimeout(() => {
          setAchievement(null);
          closeTimer.current = undefined;
        }, EXIT_DURATION_MS);
      }, DISPLAY_DURATION_MS);
    };

    window.addEventListener('bridge:game.achievement_unlocked', onAchievementUnlocked);
    bridgeCall('game.achievement_events').catch(acknowledgeBridgeFailure);

    return () => {
      window.removeEventListener('bridge:game.achievement_unlocked', onAchievementUnlocked);
      if (dismissTimer.current !== undefined) {
        window.clearTimeout(dismissTimer.current);
      }
      if (closeTimer.current !== undefined) {
        window.clearTimeout(closeTimer.current);
      }
    };
  }, []);

  if (!achievement) return null;

  return (
    <aside className={`achievement-unlock-toast${achievement.closing ? ' achievement-unlock-toast--closing' : ''}`} role="status" aria-live="polite">
      {achievement.payload.iconUrl && <img src={achievement.payload.iconUrl} alt="" className="achievement-unlock-toast-icon" draggable={false} />}
      <div className="achievement-unlock-toast-copy">
        <div className="achievement-unlock-toast-label">{t('Achievements.UnlockNotificationTitle')}</div>
        <div className="achievement-unlock-toast-title">{achievement.payload.displayName}</div>
        <div className="achievement-unlock-toast-description">{achievement.payload.description}</div>
      </div>
    </aside>
  );
}
