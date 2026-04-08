import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      className={cn(
        "border",
        STATUS_COLORS[status] ?? "border-zinc-200 bg-zinc-100 text-zinc-700",
      )}
    >
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
