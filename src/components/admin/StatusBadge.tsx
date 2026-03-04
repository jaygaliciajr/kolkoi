import { StatusBadge as GlobalStatusBadge } from "@/components/ui/StatusBadge";

export function StatusBadge({ status }: { status: string | null }) {
  return <GlobalStatusBadge status={status ?? "draft"} />;
}
