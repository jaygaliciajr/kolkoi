import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-56" />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Card key={idx} className="p-5" interactive={false}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-20" />
          </Card>
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card interactive={false}><Skeleton className="h-80 w-full" /></Card>
        <Card interactive={false}><Skeleton className="h-80 w-full" /></Card>
      </section>
      <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card interactive={false}><Skeleton className="h-80 w-full" /></Card>
        <Card interactive={false}><Skeleton className="h-80 w-full" /></Card>
      </section>
    </div>
  );
}
