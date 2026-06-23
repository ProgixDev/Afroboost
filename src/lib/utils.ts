import { format as fmt } from 'date-fns';
import { fr as frLocale, enUS } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';

export function cn(...args: (string | false | null | undefined)[]) {
  return args.filter(Boolean).join(' ');
}

type HapticKind = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'select';

/**
 * Fire a haptic. Best-effort and fire-and-forget — never throws (haptics are
 * unavailable on web and some emulators).
 */
export function haptic(kind: HapticKind = 'light') {
  try {
    switch (kind) {
      case 'select':
        void Haptics.selectionAsync();
        break;
      case 'success':
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'medium':
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      default:
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch {
    // no-op
  }
}

export function formatDate(d: Date | string, pattern = 'PPP', lng: 'fr' | 'en' = 'fr') {
  const date = typeof d === 'string' ? new Date(d) : d;
  return fmt(date, pattern, { locale: lng === 'fr' ? frLocale : enUS });
}

export function formatRelative(d: Date | string, lng: 'fr' | 'en' = 'fr') {
  const date = typeof d === 'string' ? new Date(d) : d;
  const diffMs = Date.now() - date.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return lng === 'fr' ? 'à l’instant' : 'just now';
  if (min < 60) return lng === 'fr' ? `il y a ${min} min` : `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return lng === 'fr' ? `il y a ${h} h` : `${h}h ago`;
  const day = Math.floor(h / 24);
  if (day < 7) return lng === 'fr' ? `il y a ${day} j` : `${day}d ago`;
  return formatDate(date, 'PP', lng);
}

export function genId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
