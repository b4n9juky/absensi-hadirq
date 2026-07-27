import { useState, useEffect } from 'react';

let cachedTimezone: string | null = null;
let fetchPromise: Promise<string> | null = null;

function fetchTimezone(): Promise<string> {
  if (cachedTimezone) return Promise.resolve(cachedTimezone);
  if (!fetchPromise) {
    fetchPromise = fetch('/api/settings/timezone')
      .then(r => r.json())
      .then((d: { data?: { timezone?: string } }) => {
        const tz = d.data?.timezone || 'Asia/Jakarta';
        cachedTimezone = tz;
        return tz;
      })
      .catch(() => {
        cachedTimezone = 'Asia/Jakarta';
        return 'Asia/Jakarta';
      });
  }
  return fetchPromise;
}

export function useTimezone(): string {
  const [tz, setTz] = useState<string>('Asia/Jakarta');

  useEffect(() => {
    fetchTimezone().then(setTz);
  }, []);

  return tz;
}
