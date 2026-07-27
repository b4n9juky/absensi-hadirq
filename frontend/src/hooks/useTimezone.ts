import { useState, useEffect } from 'react';

let cachedTimezone: string | null = null;
let fetchPromise: Promise<string> | null = null;

async function fetchTimezone(): Promise<string> {
  if (cachedTimezone) return cachedTimezone;
  if (!fetchPromise) {
    fetchPromise = fetch('/api/settings/timezone')
      .then(r => r.json())
      .then(d => {
        cachedTimezone = d.data?.timezone || 'Asia/Jakarta';
        return cachedTimezone;
      })
      .catch(() => {
        cachedTimezone = 'Asia/Jakarta';
        return cachedTimezone;
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
