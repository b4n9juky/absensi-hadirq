let schoolTimezone: string = process.env.APP_TIMEZONE || 'Asia/Jakarta';

export function setSchoolTimezone(tz: string): void {
  schoolTimezone = tz;
}

export function getSchoolTimezone(): string {
  return schoolTimezone;
}

function parseWIB(date: Date): { year: number; month: number; day: number; hours: number; minutes: number; seconds: number } {
  const tzStr = date.toLocaleString('en-US', { timeZone: schoolTimezone, hour12: false });
  const [datePart, timePart] = tzStr.split(', ');
  const [month, day, year] = datePart.split('/');
  const [hours, minutes, seconds] = timePart.split(':').map(Number);
  return { year: +year, month: +month, day: +day, hours, minutes, seconds };
}

export function formatDateWIB(date: Date): string {
  const d = parseWIB(date);
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
}

export function formatTimeWIB(date: Date): string {
  const d = parseWIB(date);
  return `${String(d.hours).padStart(2, '0')}:${String(d.minutes).padStart(2, '0')}:${String(d.seconds).padStart(2, '0')}`;
}

export function getWIBDayName(date: Date): string {
  return date.toLocaleDateString('en-US', { timeZone: schoolTimezone, weekday: 'long' });
}

export function getWIBDay(date: Date): number {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days.indexOf(getWIBDayName(date));
}

export function getSchoolDate(): Date {
  return new Date();
}
