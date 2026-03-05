"use client";

import { useMemo, useState } from "react";
import type { TextareaHTMLAttributes } from "react";

import { focusRing, inputBase, transitionFast } from "@/lib/ui/tokens";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  helperText?: string;
  errorText?: string;
  validate?: (value: string) => string | null;
  success?: boolean;
};

function cx(...parts: Array<string | undefined | false | null>) {
  return parts.filter(Boolean).join(" ");
}

export function Textarea({
  id,
  label,
  helperText,
  errorText,
  validate,
  required,
  success,
  className,
  onBlur,
  onInvalid,
  ...props
}: TextareaProps) {
  const [touched, setTouched] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const resolvedError = useMemo(() => {
    if (errorText) return errorText;
    if (!touched) return null;
    return localError;
  }, [errorText, localError, touched]);

  return (
    <label className="block space-y-1.5">
      <span className="flex items-center gap-2 text-sm font-medium text-text">
        {label}
        {required ? <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] uppercase text-muted">Required</span> : null}
      </span>

      <textarea
        id={id}
        required={required}
        className={cx(
          inputBase,
          focusRing,
          transitionFast,
          "min-h-24",
          resolvedError && "border-rose-400 focus:ring-rose-500/30",
          !resolvedError && success && "border-emerald-400 focus:ring-emerald-500/30",
          !resolvedError && !success && "border-border",
          className,
        )}
        onBlur={(event) => {
          setTouched(true);
          if (validate) {
            setLocalError(validate(event.currentTarget.value));
          } else if (required && !event.currentTarget.value.trim()) {
            setLocalError("This field is required.");
          } else {
            setLocalError(null);
          }
          onBlur?.(event);
        }}
        onInvalid={(event) => {
          event.preventDefault();
          setTouched(true);
          const el = event.currentTarget;
          const derived = validate?.(el.value) ?? (el.validity.valueMissing ? "This field is required." : "Please enter a valid value.");
          setLocalError(derived);
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.focus();
          onInvalid?.(event);
        }}
        {...props}
      />

      <div className="min-h-5">
        {resolvedError ? (
          <p className="text-xs text-rose-600 transition-all duration-200 dark:text-rose-300">{resolvedError}</p>
        ) : helperText ? (
          <p className="text-xs text-muted">{helperText}</p>
        ) : null}
      </div>
    </label>
  );
}
