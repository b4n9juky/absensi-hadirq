// Mutable in-memory timezone — initialized from env, updatable via setSchoolTimezone()
let schoolTimezone: string = process.env.APP_TIMEZONE || 'Asia/Jakarta';

export function setSchoolTimezone(tz: string): void {
  schoolTimezone = tz;
}

export function getSchoolDate(): Date {
  const now = new Date();
  const tzStr = now.toLocaleString('en-US', { timeZone: schoolTimezone, hour12: false });
  const [datePart, timePart] = tzStr.split(', ');
  const [month, day, year] = datePart.split('/');
  const [hours, minutes, seconds] = timePart.split(':').map(Number);
  return new Date(Date.UTC(+year, +month - 1, +day, hours, minutes, seconds));
}

export function getSchoolTimezone(): string {
  return schoolTimezone;
}
