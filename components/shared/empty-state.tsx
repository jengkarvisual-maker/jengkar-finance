import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EmptyStateProps = {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
};

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: EmptyStateProps) {
  return (
    <Card className="border-dashed border-border/80 bg-white/70">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between">
        <p>{description}</p>
        {actionHref && actionLabel ? (
          <Button asChild variant="secondary">
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
