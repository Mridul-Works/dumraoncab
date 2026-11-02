import Icon from "@/components/admin/Icon";

// Form pieces for the driver app (server-safe, no hooks).

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string; icon?: string; error?: boolean; prefix?: string };

// Figma "Input": label above a white field with an optional leading icon.
export function Field({ label, icon, error, prefix, className = "", id, name, ...rest }: InputProps) {
  const fieldId = id ?? `f-${name}`;
  return (
    <div className="flex w-full flex-col gap-[6px]">
      <label htmlFor={fieldId} className="type-ui text-primary">
        {label}
      </label>
      <div
        className={`flex w-full items-center gap-[8px] rounded-md border bg-layer px-[14px] py-[10px] focus-within:border-brand ${
          error ? "border-negative" : "border-gray-200"
        }`}
      >
        {icon && <Icon name={icon} size={18} className="text-secondary" />}
        {prefix && <span className="type-body-sm text-secondary">{prefix}</span>}
        <input id={fieldId} name={name} className={`min-w-0 flex-1 bg-transparent type-body-sm text-primary outline-none placeholder:text-helper ${className}`} {...rest} />
      </div>
    </div>
  );
}

// Figma "Radio" row: ring + label + description; the whole row is the target.
export function RadioRow({
  name,
  value,
  label,
  description,
  defaultChecked,
  checked,
  onChange,
}: {
  name: string;
  value: string;
  label: string;
  description?: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="flex min-h-[42px] w-full cursor-pointer items-start gap-[12px]">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        checked={checked}
        onChange={onChange ? () => onChange(value) : undefined}
        className="peer sr-only"
      />
      <span className="mt-px grid size-[18px] shrink-0 place-items-center rounded-full border-[1.5px] border-gray-200 bg-layer peer-checked:border-brand peer-checked:[&>span]:block peer-focus-visible:outline-2 peer-focus-visible:outline-focus">
        <span className="hidden size-[8px] rounded-full bg-brand" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <span className="type-ui text-primary">{label}</span>
        {description && <span className="type-body-sm text-secondary">{description}</span>}
      </span>
    </label>
  );
}

// Figma "Checkbox": 18px box, green with a white tick when checked.
export function CheckRow({
  name,
  label,
  defaultChecked,
  checked,
  onChange,
}: {
  name?: string;
  label: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (on: boolean) => void;
}) {
  return (
    <label className="flex min-h-[28px] cursor-pointer items-center gap-[8px]">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        checked={checked}
        onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
        className="peer sr-only"
      />
      <span className="grid size-[18px] shrink-0 place-items-center rounded-sm border-[1.5px] border-gray-200 bg-layer text-transparent peer-checked:border-brand peer-checked:bg-brand peer-checked:text-on-color peer-focus-visible:outline-2 peer-focus-visible:outline-focus">
        <Icon name="check-12" size={12} />
      </span>
      <span className="type-body-sm text-primary">{label}</span>
    </label>
  );
}

// Big number field: odometer and cash (10.23, 10.32, 10.35).
export function BigNumber({
  name,
  value,
  onChange,
  suffix,
  prefix,
  error,
  size = "h1",
  label,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  prefix?: string;
  error?: boolean;
  size?: "h1" | "h4";
  label: string;
}) {
  return (
    <div
      className={`flex w-full items-center rounded-lg border-2 bg-layer ${size === "h1" ? "px-[18px] py-[16px]" : "px-[16px] py-[12px]"} ${
        error ? "border-negative" : "border-brand"
      }`}
    >
      {prefix && <span className={`${size === "h1" ? "type-h1" : "type-h4"} text-secondary`}>{prefix}&nbsp;</span>}
      <input
        name={name}
        aria-label={label}
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 7);
          onChange(digits ? Number(digits).toLocaleString("en-IN") : "");
        }}
        className={`min-w-0 flex-1 bg-transparent ${size === "h1" ? "type-h1" : "type-h4"} text-primary outline-none`}
      />
      {suffix && <span className={`${size === "h1" ? "type-h4" : "type-ui"} text-secondary`}>{suffix}</span>}
    </div>
  );
}

export const toNumber = (s: string) => Number(s.replace(/\D/g, "")) || 0;
