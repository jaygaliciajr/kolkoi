import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { requireSuperAdmin } from "@/lib/super-admin/auth";

export const revalidate = 60;

export default async function SuperAdminReportsPage() {
  await requireSuperAdmin();

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Reports</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Read-only platform exports for monitoring and finance reconciliation.</p>
      </div>

      <Card className="p-4" interactive={false}>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Organizations Report</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Export organization-level health metrics.</p>
        <div className="mt-3">
          <Link href="/api/super-admin/reports/orgs.csv" className="inline-flex">
            <Button variant="secondary">Download Orgs CSV</Button>
          </Link>
        </div>
      </Card>

      <Card className="p-4" interactive={false}>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Payments Report</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Export payment transactions with milestone context.</p>

        <form action="/api/super-admin/reports/payments.csv" className="mt-3 grid gap-3 sm:grid-cols-3">
          <Input id="from" name="from" type="date" label="From" helperText="Optional start date" />
          <Input id="to" name="to" type="date" label="To" helperText="Optional end date" />
          <div className="self-end">
            <Button type="submit" variant="secondary">Download Payments CSV</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
