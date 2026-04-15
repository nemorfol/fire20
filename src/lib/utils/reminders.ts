/**
 * Sistema di promemoria per il ribilanciamento del portafoglio.
 * Usa localStorage per la persistenza dei dati.
 */

export interface RebalanceReminder {
  enabled: boolean;
  frequencyMonths: number; // 1, 3, 6, 12
  lastRebalanceDate: string | null; // ISO date
  nextReminderDate: string | null; // ISO date
  thresholdPercent: number; // alert if allocation drifts > X% from target
}

const STORAGE_KEY = 'fire-rebalance-reminder';

export function getDefaultReminder(): RebalanceReminder {
  return {
    enabled: false,
    frequencyMonths: 3,
    lastRebalanceDate: null,
    nextReminderDate: null,
    thresholdPercent: 5
  };
}

export function getReminder(): RebalanceReminder {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...getDefaultReminder(), ...JSON.parse(stored) };
    }
  } catch {
    // ignore parse errors
  }
  return getDefaultReminder();
}

export function setReminder(r: RebalanceReminder): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
}

export function isReminderDue(): boolean {
  const r = getReminder();
  if (!r.enabled || !r.nextReminderDate) return false;
  const now = new Date();
  const next = new Date(r.nextReminderDate);
  return now >= next;
}

export function markRebalanced(): void {
  const r = getReminder();
  const now = new Date();
  r.lastRebalanceDate = now.toISOString().slice(0, 10);
  r.nextReminderDate = calculateNextDate(now, r.frequencyMonths);
  setReminder(r);
}

export function postpone(days: number = 7): void {
  const r = getReminder();
  const next = new Date();
  next.setDate(next.getDate() + days);
  r.nextReminderDate = next.toISOString().slice(0, 10);
  setReminder(r);
}

export function calculateNextDate(from: Date, frequencyMonths: number): string {
  const next = new Date(from);
  next.setMonth(next.getMonth() + frequencyMonths);
  return next.toISOString().slice(0, 10);
}

export function daysSinceLastRebalance(): number | null {
  const r = getReminder();
  if (!r.lastRebalanceDate) return null;
  const last = new Date(r.lastRebalanceDate);
  const now = new Date();
  const diffMs = now.getTime() - last.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
