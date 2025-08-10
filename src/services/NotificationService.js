// src/services/NotificationService.js
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Mostra alerta quando a app está aberta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestPermissions() {
  try {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.status === 'granted') return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.status === 'granted';
  } catch (e) {
    console.warn('[Notifications] requestPermissions error:', e);
    return false;
  }
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  } catch (e) {
    console.warn('[Notifications] setNotificationChannelAsync error:', e);
  }
}

export async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.warn('[Notifications] cancelAllNotifications error:', e);
  }
}

/**
 * Agenda:
 *  - Dia 0 (quando atinge o ciclo): "Hoje faz X dias…"
 *  - Dias 1..tailDays depois: "passou 1 dia…" / "passaram N dias…"
 *
 * @param {string} startISO - data início (ISO)
 * @param {number} cycleDays - duração do ciclo em dias (pode ser decimal)
 * @param {number} tailDays - quantos dias extra lembrar depois (default 30, por limite iOS)
 * @param {number} fireHour - hora local do lembrete (0..23), default 9
 */
export async function scheduleCycleNotifications(startISO, cycleDays, tailDays = 30, fireHour = 9) {
  try {
    if (!startISO || !Number.isFinite(cycleDays) || cycleDays <= 0) return;

    await ensureAndroidChannel();

    const startMs = new Date(startISO).getTime();
    const oneDay = 24 * 60 * 60 * 1000;

    // Dia em que atinge o ciclo (dia 0 dos lembretes)
    const threshold = new Date(startMs + cycleDays * oneDay);
    threshold.setHours(fireHour, 0, 0, 0);

    const now = Date.now();
    let startIndex = 0;
    if (threshold.getTime() < now + 1000) {
      const diffDays = Math.floor((now - threshold.getTime()) / oneDay);
      startIndex = Math.min(diffDays + 1, tailDays);
    }

    for (let i = startIndex; i <= tailDays; i++) {
      const fireAt = new Date(threshold);
      fireAt.setDate(fireAt.getDate() + i);

      if (fireAt.getTime() <= now + 1000) continue;

      const body =
        i === 0
          ? `Hoje faz ${formatDays(cycleDays)} desde o início deste par de lentes.`
          : `Só para relembrar que ${i === 1 ? 'passou' : 'passaram'} ${i} ${i === 1 ? 'dia' : 'dias'} desde os ${formatDays(cycleDays)} das tuas lentes.`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Trocar lentes?',
          body,
        },
        // ✅ novo formato recomendado (evita o warning)
        trigger: {
          type: 'date',
          date: fireAt, // pode ser Date ou timestamp
          // channelId: 'default', // opcional no Android se quiseres explicitar
        },
      });
    }
  } catch (e) {
    console.warn('[Notifications] scheduleCycleNotifications error:', e);
  }
}

/* helpers */
function formatDays(d) {
  const n = Number(d);
  const isSingular = Math.abs(n - 1) < 1e-9;
  return `${Number.isInteger(n) ? n : n.toFixed(1)} ${isSingular ? 'dia' : 'dias'}`;
}
