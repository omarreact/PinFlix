import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/src/lib/utils";

type ButtonVariant = "primary" | "ghost" | "danger";

export function Button({ className, variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={cn(
    "tv-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold disabled:pointer-events-none disabled:opacity-50",
    variant === "primary" && "bg-brand text-white shadow-lg shadow-brand/15 hover:bg-brand-2",
    variant === "ghost" && "border border-border bg-transparent text-muted hover:border-panel hover:bg-elevated hover:text-fg",
    variant === "danger" && "bg-danger text-white hover:brightness-110",
    className,
  )} {...props} />;
}
