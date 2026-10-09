import Link from "next/link";
import type { Competition } from "@/data/competitions";

export function CompetitionCard({ competition }: { competition: Competition }) {
  return (
    <div className="flex flex-col rounded-lg border border-border bg-background p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
          {competition.subject}
        </span>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {competition.format}
        </span>
      </div>

      <h3 className="mt-4 text-lg font-bold">{competition.name}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{competition.summary}</p>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div>
          <dt className="font-semibold text-foreground">Grade groups</dt>
          <dd>{competition.gradeGroups.join(", ")}</dd>
        </div>
        <div>
          <dt className="font-semibold text-foreground">Registration deadline</dt>
          <dd>{competition.registrationDeadline}</dd>
        </div>
      </dl>

      <div className="mt-6 flex gap-3">
        <Link
          href={`/competitions/${competition.slug}`}
          className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
        >
          View details
        </Link>
        <Link
          href="/register"
          className="inline-flex items-center rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:bg-brand-dark"
        >
          Register
        </Link>
      </div>
    </div>
  );
}
