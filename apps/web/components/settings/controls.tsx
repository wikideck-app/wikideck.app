import { SelectMenu } from "@/components/select-menu";
import type { IconType } from "@/components/icons";
import { useFormatter } from "next-intl";
import type { ReactNode } from "react";

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? "border-accent bg-accent" : "border-line bg-transparent hover:border-accent"
      }`}
    >
      <span
        aria-hidden
        className={`absolute top-[2px] size-[18px] rounded-full transition-all duration-200 ${
          checked ? "left-[22px] bg-surface" : "left-[2px] bg-fog"
        }`}
      />
    </button>
  );
}

export function Slider({
  value,
  onChange,
  label,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  disabled?: boolean;
}) {
  const format = useFormatter();
  return (
    <div className="flex items-center gap-3 sm:w-64">
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-accent/20 accent-white disabled:cursor-not-allowed disabled:opacity-40"
      />
      <output className="w-10 text-right text-xs font-bold tabular-nums text-pale-mist">
        {format.number(value / 100, "percent")}
      </output>
    </div>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  disabled,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`inline-flex rounded-full border border-line p-0.5 ${disabled ? "opacity-40" : ""}`}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
              active ? "bg-accent text-accent-foreground" : "text-pale-mist hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function SelectField<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return <SelectMenu label={label} value={value} options={options} onChange={onChange} />;
}

export function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-line py-5 first:pt-0 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div className="min-w-0">
        <h3 className="text-sm font-bold">{title}</h3>
        {description && <p className="mt-1 text-xs leading-relaxed text-fog">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function Panel({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: IconType;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-surface p-6 sm:p-7">
      <header className="mb-6 flex items-start gap-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface">
          <Icon className="size-5" strokeWidth={1.8} />
        </span>
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          {description && <p className="mt-1 text-sm text-pale-mist">{description}</p>}
        </div>
      </header>
      <div>{children}</div>
    </section>
  );
}

export const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-full border-2 border-accent bg-surface px-5 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40";
export const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2 text-sm font-bold text-accent-foreground transition-colors hover:bg-accent/80 disabled:cursor-not-allowed disabled:opacity-40";
export const dangerButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-danger px-5 py-2 text-sm font-bold text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40";
