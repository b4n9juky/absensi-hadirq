const SCHOOL_TZ = process.env.APP_TIMEZONE || 'Asia/Jakarta';

export function getSchoolDate(): Date {
  const now = new Date();
  const tzStr = now.toLocaleString('en-US', { timeZone: SCHOOL_TZ, hour12: false });
  const [datePart, timePart] = tzStr.split(', ');
  const [month, day, year] = datePart.split('/');
  const [hours, minutes, seconds] = timePart.split(':').map(Number);
  return new Date(Date.UTC(+year, +month - 1, +day, hours, minutes, seconds));
}

export function getSchoolTimezone(): string {
  return SCHOOL_TZ;
}
