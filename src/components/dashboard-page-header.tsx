export function DashboardPageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="border-b border-border px-4 py-8 sm:px-8">
      {eyebrow && (
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">{eyebrow}</p>
      )}
      <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      {description && <p className="mt-2 text-muted-foreground">{description}</p>}
    </div>
  );
}
