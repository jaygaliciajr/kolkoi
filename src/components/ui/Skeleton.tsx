import { cardBase } from "@/lib/ui/tokens";

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-xl bg-slate-200/80 dark:bg-slate-800/80",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/45 before:to-transparent dark:before:via-slate-600/20",
        className,
      )}
    />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return <div className={cx(cardBase, "p-5", className)}><Skeleton className="h-4 w-24" /><Skeleton className="mt-3 h-7 w-20" /></div>;
}
