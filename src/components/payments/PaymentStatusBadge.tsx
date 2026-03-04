import { StatusBadge } from "@/components/ui/StatusBadge";

export function PaymentStatusBadge({ status }: { status: string | null }) {
  return <StatusBadge status={status ?? "pending"} />;
}
