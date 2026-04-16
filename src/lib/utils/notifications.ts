/**
 * Sistema di notifiche per PWA.
 * Usa la Notification API del browser per promemoria di ribilanciamento.
 */

const LAST_NOTIFICATION_KEY = 'fire-last-notification';
const NOTIFICATION_DISMISSED_KEY = 'fire-notification-banner-dismissed';
const MIN_NOTIFICATION_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 ore minimo tra notifiche
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // Controlla ogni ora

/**
 * Verifica se le notifiche del browser sono supportate.
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Restituisce lo stato corrente del permesso notifiche.
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Richiede il permesso per le notifiche.
 * Restituisce true se il permesso e stato concesso.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  try {
    const result = await Notification.requestPermission();
    return result === 'granted';
  } catch {
    return false;
  }
}

/**
 * Invia una notifica del browser immediatamente.
 */
export function sendNotification(
  title: string,
  body: string,
  options?: NotificationOptions
): void {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== 'granted') return;

  try {
    const notification = new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: 'fire-planner',
      ...options,
    });

    // Chiudi dopo 10 secondi
    setTimeout(() => notification.close(), 10000);

    // Click apre l'app
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch {
    // Fallback silenzioso se la notifica fallisce
  }
}

/**
 * Programma una notifica locale con un ritardo.
 */
export function scheduleLocalNotification(
  title: string,
  body: string,
  delayMs: number
): void {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== 'granted') return;

  setTimeout(() => {
    sendNotification(title, body);
  }, delayMs);
}

/**
 * Controlla se e passato abbastanza tempo dall'ultima notifica.
 */
function canSendNotification(): boolean {
  try {
    const last = localStorage.getItem(LAST_NOTIFICATION_KEY);
    if (!last) return true;
    const elapsed = Date.now() - parseInt(last, 10);
    return elapsed >= MIN_NOTIFICATION_INTERVAL_MS;
  } catch {
    return true;
  }
}

/**
 * Segna il timestamp dell'ultima notifica inviata.
 */
function markNotificationSent(): void {
  try {
    localStorage.setItem(LAST_NOTIFICATION_KEY, String(Date.now()));
  } catch {
    // Ignora errori localStorage
  }
}

/**
 * Controlla se il banner notifiche e stato chiuso in questa sessione.
 */
export function isBannerDismissed(): boolean {
  try {
    return sessionStorage.getItem(NOTIFICATION_DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Segna il banner notifiche come chiuso per questa sessione.
 */
export function dismissBanner(): void {
  try {
    sessionStorage.setItem(NOTIFICATION_DISMISSED_KEY, 'true');
  } catch {
    // Ignora
  }
}

/**
 * Controlla i promemoria e invia notifica se necessario.
 * Importa dinamicamente reminders per evitare dipendenze circolari.
 */
export async function checkAndNotifyReminders(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;
  if (!canSendNotification()) return false;

  try {
    const { isReminderDue, getReminder } = await import('./reminders');
    if (isReminderDue()) {
      const reminder = getReminder();
      sendNotification(
        'Ribilanciamento Portafoglio',
        `E\' il momento di ribilanciare il tuo portafoglio! Soglia di deviazione: ${reminder.thresholdPercent}%.`,
        { tag: 'fire-rebalance' }
      );
      markNotificationSent();
      return true;
    }
  } catch {
    // Ignora errori
  }
  return false;
}

let checkInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Avvia il controllo periodico dei promemoria.
 * Controlla subito e poi ogni ora.
 */
export function startReminderChecks(): void {
  if (typeof window === 'undefined') return;

  // Controlla subito
  checkAndNotifyReminders();

  // Avvia controllo periodico
  if (checkInterval) clearInterval(checkInterval);
  checkInterval = setInterval(() => {
    checkAndNotifyReminders();
  }, CHECK_INTERVAL_MS);
}

/**
 * Ferma il controllo periodico.
 */
export function stopReminderChecks(): void {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}
