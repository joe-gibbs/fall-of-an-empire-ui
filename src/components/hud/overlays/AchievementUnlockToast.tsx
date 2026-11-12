import { useEffect, useState } from 'react';
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

/** Unlocks waiting to show. The first entry is on screen, and `closing` is its exit phase. */
interface AchievementToastQueue {
  queue: AchievementUnlockedPayload[];
  closing: boolean;
}

export default function AchievementUnlockToast() {
  const t = useWebUIText();
  const [toasts, setToasts] = useState<AchievementToastQueue>({ queue: [], closing: false });
  const achievement = toasts.queue[0] ?? null;
  const closing = toasts.closing;

  useEffect(() => {
    const onAchievementUnlocked = (event: Event) => {
      const payload = (event as CustomEvent<AchievementUnlockedPayload>).detail;
      if (!payload?.id) return;
      setToasts(current => (
        current.queue.some(entry => entry.id === payload.id)
          ? current
          : { ...current, queue: [...current.queue, payload] }
      ));
    };

    bridgeEvents.addEventListener('game.achievement_unlocked', onAchievementUnlocked);
    bridgeCall('game.achievement_events').catch(acknowledgeBridgeFailure);

    return () => {
      bridgeEvents.removeEventListener('game.achievement_unlocked', onAchievementUnlocked);
    };
  }, []);

  // Each toast shows, then plays its exit, then hands over to the next unlock.
  useEffect(() => {
    if (!achievement) return undefined;
    const timer = window.setTimeout(() => {
      setToasts(current => (
        current.closing
          ? { queue: current.queue.slice(1), closing: false }
          : { ...current, closing: true }
      ));
    }, closing ? EXIT_DURATION_MS : DISPLAY_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [achievement, closing]);

  if (!achievement) return null;

  return (
    <aside key={achievement.id} className={`achievement-unlock-toast${closing ? ' achievement-unlock-toast--closing' : ''}`} role="status" aria-live="polite">
      {achievement.iconUrl && <img src={achievement.iconUrl} alt="" className="achievement-unlock-toast-icon" draggable={false} />}
      <div className="achievement-unlock-toast-copy">
        <div className="achievement-unlock-toast-label">{t('Achievements.UnlockNotificationTitle')}</div>
        <div className="achievement-unlock-toast-title">{achievement.displayName}</div>
        <div className="achievement-unlock-toast-description">{achievement.description}</div>
      </div>
    </aside>
  );
}
