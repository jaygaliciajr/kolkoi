import { ClientSectionShell } from "@/components/client/ClientSectionShell";

export default function ClientReportsPage() {
  return (
    <ClientSectionShell
      title="Reports"
      subtitle="View campaign outcomes, compliance, and score-based recommendation history."
      bodyTitle="Client reports"
      bodyDescription="Reports in this area are read-only and aligned with V2 anonymization rules."
    />
  );
}
