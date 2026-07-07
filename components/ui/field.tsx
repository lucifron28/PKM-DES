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
      {required ? <span className="text-red-600"> *</span> : null}
    </label>
  );
}

const inputClass =
  "mt-2 min-h-11 w-full rounded-md border border-slateui-border bg-white px-3 py-2 text-sm text-slateui-text outline-none transition placeholder:text-slateui-muted focus:border-primary-800 focus:ring-2 focus:ring-primary-100";

export function TextInput({
  label,
  required,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div>
      <FieldLabel htmlFor={String(props.id ?? props.name)} required={required}>
        {label}
      </FieldLabel>
      <input className={cn(inputClass, className)} required={required} {...props} />
    </div>
  );
}

export function SelectInput({
  label,
  children,
  required,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <div>
      <FieldLabel htmlFor={String(props.id ?? props.name)} required={required}>
        {label}
      </FieldLabel>
      <select className={cn(inputClass, className)} required={required} {...props}>
        {children}
      </select>
    </div>
  );
}

export function TextArea({
  label,
  required,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <div>
      <FieldLabel htmlFor={String(props.id ?? props.name)} required={required}>
        {label}
      </FieldLabel>
      <textarea
        className={cn(inputClass, "min-h-28 resize-y", className)}
        required={required}
        {...props}
      />
    </div>
  );
}
