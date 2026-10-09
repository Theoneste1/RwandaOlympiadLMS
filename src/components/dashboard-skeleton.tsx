import { Container } from "@/components/container";

export function DashboardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="border-b border-border bg-muted">
        <Container className="py-14">
          <div className="h-4 w-24 rounded bg-border" />
          <div className="mt-3 h-8 w-64 rounded bg-border" />
          <div className="mt-3 h-4 w-96 max-w-full rounded bg-border" />
        </Container>
      </div>
      <Container className="space-y-6 py-12">
        <div className="h-32 rounded-lg border border-border bg-muted" />
        <div className="h-24 rounded-lg border border-border bg-muted" />
        <div className="h-24 rounded-lg border border-border bg-muted" />
      </Container>
    </div>
  );
}
