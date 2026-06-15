/**
 * Returns a Date object where the year, month, date, hours, minutes, seconds,
 * and milliseconds represent the local time in Jakarta (WIB / UTC+7).
 */
export function getJakartaDate(): Date {
  const now = new Date();
  return new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
}
