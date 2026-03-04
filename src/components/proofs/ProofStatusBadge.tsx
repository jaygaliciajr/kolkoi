import { StatusBadge } from "@/components/ui/StatusBadge";

export function ProofStatusBadge({ status }: { status: string | null }) {
  return <StatusBadge status={status ?? "not_submitted"} />;
}
