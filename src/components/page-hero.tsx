import { Container } from "@/components/container";

export function PageHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="border-b border-border bg-muted">
      <Container className="py-14">
        {eyebrow && (
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">{eyebrow}</p>
        )}
        <h1 className="mt-2 font-serif text-4xl font-normal tracking-tight sm:text-5xl">{title}</h1>
        {description && (
          <p className="mt-3 max-w-2xl text-muted-foreground">{description}</p>
        )}
      </Container>
    </div>
  );
}
