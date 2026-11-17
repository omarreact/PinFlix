import type { ReactNode } from "react";
import { Button } from "@/src/components/ui/button";

export function EmptyState({ title, body, icon, action }: { title: string; body: string; icon?: ReactNode; action?: { label: string; onClick?: () => void } }) {
  return <div className="rounded-lg border border-dashed border-border bg-surface/60 p-8 text-center md:p-10">{icon && <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-elevated text-brand">{icon}</div>}<p className="text-lg font-semibold">{title}</p><p className="mx-auto mt-2 max-w-md text-sm text-muted">{body}</p>{action && <Button className="mt-6" onClick={action.onClick}>{action.label}</Button>}</div>;
}
