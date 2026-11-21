import type { ReactNode } from 'react';

/* Small form controls for the admin tools (request #32). */

export function Num(props: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="adm-field">
      <span>{props.label}</span>
      <input
        type="number"
        value={Number.isFinite(props.value) ? props.value : ''}
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        aria-label={props.label}
        onChange={(e) => props.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      />
    </label>
  );
}

export function Text(props: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  multiline?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="adm-field adm-wide">
      <span>{props.label}</span>
      {props.multiline ? (
        <textarea
          value={props.value}
          maxLength={props.maxLength}
          rows={2}
          aria-label={props.label}
          onChange={(e) => props.onChange(e.target.value)}
        />
      ) : (
        <input
          value={props.value}
          maxLength={props.maxLength}
          aria-label={props.label}
          onChange={(e) => props.onChange(e.target.value)}
        />
      )}
    </label>
  );
}

export function Select<T extends string>(props: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  children: ReactNode;
}) {
  return (
    <label className="adm-field">
      <span>{props.label}</span>
      <select
        value={props.value}
        aria-label={props.label}
        onChange={(e) => props.onChange(e.target.value as T)}
      >
        {props.children}
      </select>
    </label>
  );
}
