import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-[28px] border border-border/70 bg-white/70 p-6 soft-shadow lg:flex-row lg:items-end lg:justify-between",
        className,
      )}
    >
      <div className="space-y-2">
        {eyebrow ? <div className="metric-chip">{eyebrow}</div> : null}
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description ? (
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {action ? <div className="flex flex-wrap items-center gap-3">{action}</div> : null}
    </div>
  );
}
