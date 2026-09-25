import type { HTMLAttributes } from "react";
import { cn } from "@/src/lib/utils";

export function Card({ className, interactive = false, ...props }: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return <div className={cn("rounded-lg border border-border bg-surface", interactive && "motion-surface hover:border-panel hover:bg-elevated", className)} {...props} />;
}
