"use client";

import { useFormStatus } from "react-dom";
import Icon from "@/components/admin/Icon";
import { btnClass, Spinner, type BtnVariant } from "./ui";

// Submit button for server-action forms: dims and shows a spinner + "busy"
// text the moment it's tapped, so the driver knows it worked while the
// server saves and builds the next screen.
export function SubmitBtn({
  children,
  busy = "Saving…",
  variant = "primary",
  icon,
  disabled,
  name,
  value,
  className,
}: {
  children: React.ReactNode;
  busy?: string;
  variant?: BtnVariant;
  icon?: string;
  disabled?: boolean;
  name?: string;
  value?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
      name={name}
      value={value}
      className={className ?? btnClass(variant)}
    >
      {pending ? <Spinner /> : icon && <Icon name={icon} size={16} />}
      {pending ? busy : children}
    </button>
  );
}
