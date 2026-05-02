import Link from "next/link";
import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary-800 text-white hover:bg-primary-900 focus-visible:ring-primary-700",
  secondary:
    "bg-secondary-600 text-slateui-text hover:bg-secondary-700 focus-visible:ring-secondary-700",
  outline:
    "border border-slateui-border bg-white text-primary-800 hover:bg-primary-50 focus-visible:ring-primary-700",
  ghost: "text-primary-800 hover:bg-primary-50 focus-visible:ring-primary-700",
  danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-700"
};

const baseClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

export function buttonClassName(variant: ButtonVariant = "primary", className?: string) {
  return cn(baseClass, variants[variant], className);
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={buttonClassName(variant, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: ButtonVariant;
  children: ReactNode;
}) {
  return (
    <Link className={buttonClassName(variant, className)} {...props}>
      {children}
    </Link>
  );
}
