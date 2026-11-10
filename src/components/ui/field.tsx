import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/cn";

const controlBase =
  "w-full rounded-[var(--radius-sm)] border bg-surface px-3.5 text-sm text-foreground placeholder:text-muted/75 transition-[border-color,box-shadow] duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/18 disabled:cursor-not-allowed disabled:bg-surface-secondary disabled:text-muted";

export function Label({
  htmlFor,
  children,
  className,
}: {
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={cn("block text-[0.72rem] font-semibold text-foreground-soft", className)}>
      {children}
    </label>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
  optional,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[0.8125rem] font-semibold text-foreground">
          {label}
          {required ? <span className="ml-0.5 text-error" aria-hidden="true">*</span> : null}
        </label>
        {optional ? <span className="text-[0.6875rem] text-muted">Optional</span> : null}
      </div>
      {children}
      {hint && !error ? <p className="text-xs leading-relaxed text-muted">{hint}</p> : null}
      {error ? (
        <p className="flex items-start gap-1.5 text-xs leading-relaxed text-error" role="alert">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(controlBase, "h-11", invalid ? "border-error" : "border-border-strong", className)}
      {...props}
    />
  );
});

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        controlBase,
        "min-h-28 resize-y py-2.5 leading-relaxed",
        invalid ? "border-error" : "border-border-strong",
        className,
      )}
      {...props}
    />
  );
});

export function Checkbox({
  label,
  description,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; description?: string }) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-[var(--radius-sm)] border border-border bg-surface p-3.5 transition-colors hover:border-border-strong",
        className,
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 rounded-[3px] border-border-strong accent-[var(--primary)]"
        {...props}
      />
      <span>
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {description ? <span className="mt-0.5 block text-xs leading-relaxed text-muted">{description}</span> : null}
      </span>
    </label>
  );
}

export function FormAlert({
  tone = "error",
  children,
  className,
}: {
  tone?: "error" | "success" | "info" | "warning";
  children: ReactNode;
  className?: string;
}) {
  const styles = {
    error: "border-error/30 bg-error-soft text-error",
    success: "border-success/30 bg-success-soft text-success",
    info: "border-info/30 bg-info-soft text-info",
    warning: "border-warning/30 bg-warning-soft text-warning",
  } as const;
  const Icon = tone === "success" ? CheckCircle2 : tone === "info" ? AlertCircle : AlertCircle;

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-[var(--radius-sm)] border px-3.5 py-3 text-[0.8125rem] leading-relaxed",
        styles[tone],
        className,
      )}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function Fieldset({
  legend,
  description,
  children,
}: {
  legend: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="space-y-4">
      <div>
        <legend className="font-display text-lg font-semibold tracking-[-0.02em] text-foreground">
          {legend}
        </legend>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {children}
    </fieldset>
  );
}
