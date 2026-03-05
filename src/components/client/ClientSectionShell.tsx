import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

export function ClientSectionShell({
  title,
  subtitle,
  bodyTitle,
  bodyDescription,
}: {
  title: string;
  subtitle: string;
  bodyTitle: string;
  bodyDescription: string;
}) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} />
      <Card interactive={false}>
        <CardHeader>
          <CardTitle>{bodyTitle}</CardTitle>
          <CardDescription>{bodyDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No data yet"
            description="Your manager workspace and automations are being configured for the new V2 client model."
          />
        </CardContent>
      </Card>
    </div>
  );
}
