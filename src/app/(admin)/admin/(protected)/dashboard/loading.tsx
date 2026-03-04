import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, idx) => (
          <Card key={idx} className="p-5" interactive={false}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-20" />
          </Card>
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <Card interactive={false}><Skeleton className="h-72 w-full" /></Card>
        <Card interactive={false}><Skeleton className="h-72 w-full" /></Card>
      </section>
      <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card interactive={false}><Skeleton className="h-80 w-full" /></Card>
        <Card interactive={false}><Skeleton className="h-80 w-full" /></Card>
      </section>
    </div>
  );
}
