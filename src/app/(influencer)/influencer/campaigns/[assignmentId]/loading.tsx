import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-56" />
      <Card interactive={false}><Skeleton className="h-40 w-full" /></Card>
      <Card interactive={false}><Skeleton className="h-56 w-full" /></Card>
    </div>
  );
}
