import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

function FieldLabel({
  htmlFor,
  children,
  required
}: {
  htmlFor: string;
  children: string;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-semibold text-slateui-secondary">
      {children}
      {required ? <span className="ml-1 text-red-600" aria-hidden="true">*</span> : null}
    </label>
  );
}

const inputClass =
  "mt-2 min-h-11 w-full rounded-md border border-slateui-border bg-white px-3 py-2 text-sm text-slateui-text shadow-2xs outline-none transition duration-200 placeholder:text-slateui-muted focus-visible:border-primary-800 focus-visible:ring-2 focus-visible:ring-primary-100";

export function TextInput({
  label,
  required,
  error,
  className,
  containerClassName,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; containerClassName?: string }) {
  const fieldId = String(props.id ?? props.name);
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <div className={containerClassName}>
      <FieldLabel htmlFor={fieldId} required={required}>
        {label}
      </FieldLabel>
      <input
        id={fieldId}
        className={cn(inputClass, error && "border-red-600 focus-visible:border-red-600 focus-visible:ring-red-100", className)}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId ?? props["aria-describedby"]}
        {...props}
      />
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SelectInput({
  label,
  children,
  required,
  error,
  className,
  containerClassName,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string; containerClassName?: string }) {
  const fieldId = String(props.id ?? props.name);
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <div className={containerClassName}>
      <FieldLabel htmlFor={fieldId} required={required}>
        {label}
      </FieldLabel>
      <select
        id={fieldId}
        className={cn(inputClass, error && "border-red-600 focus-visible:border-red-600 focus-visible:ring-red-100", className)}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId ?? props["aria-describedby"]}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextArea({
  label,
  required,
  error,
  className,
  containerClassName,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string; containerClassName?: string }) {
  const fieldId = String(props.id ?? props.name);
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <div className={containerClassName}>
      <FieldLabel htmlFor={fieldId} required={required}>
        {label}
      </FieldLabel>
      <textarea
        id={fieldId}
        className={cn(inputClass, "min-h-28 resize-y", error && "border-red-600 focus-visible:border-red-600 focus-visible:ring-red-100", className)}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId ?? props["aria-describedby"]}
        {...props}
      />
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
