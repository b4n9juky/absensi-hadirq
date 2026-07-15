import React from 'react';

interface TimePickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  withSeconds?: boolean;
  className?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const SECONDS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

function parseTime(value: string): { hh: string; mm: string; ss: string } {
  const parts = (value || '00:00:00').split(':');
  return {
    hh: parts[0] || '00',
    mm: parts[1] || '00',
    ss: parts[2] || '00',
  };
}

export const TimePicker: React.FC<TimePickerProps> = ({ label, value, onChange, required, withSeconds, className }) => {
  const { hh, mm, ss } = parseTime(value);

  const emit = (newHh: string, newMm: string, newSs: string) => {
    const base = `${newHh}:${newMm}`;
    onChange(withSeconds ? `${base}:${newSs}` : base);
  };

  const selectClass = "bg-background border border-input rounded-xl px-2.5 py-2.5 text-foreground focus:outline-none focus:border-primary text-xs text-center appearance-none cursor-pointer";

  return (
    <div className={className}>
      <label className="block text-muted-foreground mb-1.5 uppercase font-semibold">{label}</label>
      <div className="flex items-center gap-1.5">
        <select
          value={hh}
          onChange={(e) => emit(e.target.value, mm, ss)}
          className={selectClass}
          style={{ width: '72px' }}
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        <span className="text-muted-foreground font-bold text-sm">:</span>
        <select
          value={mm}
          onChange={(e) => emit(hh, e.target.value, ss)}
          className={selectClass}
          style={{ width: '72px' }}
        >
          {MINUTES.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        {withSeconds && (
          <>
            <span className="text-muted-foreground font-bold text-sm">:</span>
            <select
              value={ss}
              onChange={(e) => emit(hh, mm, e.target.value)}
              className={selectClass}
              style={{ width: '72px' }}
            >
              {SECONDS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </>
        )}
        {required && <input type="hidden" value={value || ''} required={required} onChange={() => {}} />}
      </div>
    </div>
  );
};

export const formatToHHMM = (value: string): string => {
  const { hh, mm } = parseTime(value);
  return `${hh}:${mm}`;
};

export const formatToHHMMSS = (value: string): string => {
  const { hh, mm, ss } = parseTime(value);
  return `${hh}:${mm}:${ss}`;
};
