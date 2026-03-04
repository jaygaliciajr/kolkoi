import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

type NextActionItem = {
  label: string;
  href: string;
  hint?: string;
};

export function NextActionPanel({
  title = "Next Action",
  description = "Recommended tasks to keep progress moving.",
  items,
}: {
  title?: string;
  description?: string;
  items: NextActionItem[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Card className="border-indigo-200 bg-indigo-50/60 dark:border-indigo-900 dark:bg-indigo-950/30" interactive={false}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Link key={item.href + item.label} href={item.href} className="inline-flex">
            <Button variant="secondary" size="sm" rightIcon={<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 6 6 6-6 6" /></svg>}>
              {item.label}
            </Button>
          </Link>
        ))}
      </div>
    </Card>
  );
}
