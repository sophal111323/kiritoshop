/**
 * Utility functions for Cambodia Time (UTC+7 / Indochina Time) date boundaries.
 */

/**
 * Returns a Date object representing 00:00:00.000 of today in Cambodia (UTC+7).
 */
export function getStartOfTodayCambodia(): Date {
  const now = new Date();
  // Cambodia is UTC+7 (420 minutes ahead of UTC)
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  const cambodiaNow = new Date(utcMs + 7 * 60 * 60 * 1000);
  
  cambodiaNow.setHours(0, 0, 0, 0);
  
  // Convert Cambodia 00:00:00 back to UTC timestamp
  return new Date(cambodiaNow.getTime() - 7 * 60 * 60 * 1000);
}
