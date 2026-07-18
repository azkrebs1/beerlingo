// Streak logic works off the device's LOCAL calendar day, which is what
// "a new calendar day" means to the person holding the phone.

/** Returns 'YYYY-MM-DD' for the given date in the device's local timezone. */
export function localDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Local 'YYYY-MM-DD' for yesterday. */
export function localYesterdayString(now: Date = new Date()): string {
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  return localDateString(y);
}

export type CheckInResult =
  | { kind: 'already-checked-in' }
  | { kind: 'continued'; newStreak: number }
  | { kind: 'reset'; newStreak: number }
  | { kind: 'first'; newStreak: number };

/**
 * Pure streak state machine.
 * - Already checked in today  -> no change.
 * - Last check-in was yesterday -> streak + 1.
 * - Last check-in was earlier (a day missed) -> reset to 1.
 * - Never checked in -> start at 1.
 */
export function computeCheckIn(
  currentStreak: number,
  lastCheckInDate: string | null,
  now: Date = new Date()
): CheckInResult {
  const today = localDateString(now);
  const yesterday = localYesterdayString(now);

  if (lastCheckInDate === today) {
    return { kind: 'already-checked-in' };
  }
  if (lastCheckInDate === null) {
    return { kind: 'first', newStreak: 1 };
  }
  if (lastCheckInDate === yesterday) {
    return { kind: 'continued', newStreak: currentStreak + 1 };
  }
  return { kind: 'reset', newStreak: 1 };
}

/** Whether the user is allowed to check in right now (new calendar day). */
export function canCheckInToday(
  lastCheckInDate: string | null,
  now: Date = new Date()
): boolean {
  return lastCheckInDate !== localDateString(now);
}
