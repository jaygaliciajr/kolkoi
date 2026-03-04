import { StatusBadge } from "@/components/ui/StatusBadge";

export function SubmissionStatusBadge({ status }: { status: string | null }) {
  return <StatusBadge status={status ?? "draft"} />;
}
