import React from 'react';

interface InputProps {
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  step?: string;
  className?: string;
}

export const FormInput: React.FC<InputProps> = ({ label, type = 'text', value, onChange, placeholder, required, className }) => (
  <div className={className}>
    <label className="block text-muted-foreground mb-1.5 uppercase font-semibold">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-foreground focus:outline-none focus:border-primary text-xs"
      required={required}
    />
  </div>
);

interface SelectProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}

export const FormSelect: React.FC<SelectProps> = ({ label, value, onChange, options, placeholder, className }) => (
  <div className={className}>
    <label className="block text-muted-foreground mb-1.5 uppercase font-semibold">{label}</label>
    <select
      value={value}
      onChange={onChange}
      className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-foreground focus:outline-none focus:border-primary text-xs"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

interface LabelProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export const FormGroup: React.FC<LabelProps> = ({ label, children, className }) => (
  <div className={className}>
    <label className="block text-muted-foreground mb-1.5 uppercase font-semibold">{label}</label>
    {children}
  </div>
);
