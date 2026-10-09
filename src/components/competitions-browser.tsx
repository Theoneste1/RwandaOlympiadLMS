"use client";

import { useMemo, useState } from "react";
import { CompetitionCard } from "@/components/competition-card";
import type { Competition } from "@/data/competitions";

export function CompetitionsBrowser({ competitions }: { competitions: Competition[] }) {
  const subjects = useMemo(
    () => Array.from(new Set(competitions.map((c) => c.subject))),
    [competitions],
  );
  const [active, setActive] = useState<string>("All");

  const filtered = active === "All" ? competitions : competitions.filter((c) => c.subject === active);

  const groups = useMemo(() => {
    if (active !== "All") return [{ subject: active, items: filtered }];
    return subjects.map((subject) => ({
      subject,
      items: competitions.filter((c) => c.subject === subject),
    }));
  }, [active, filtered, subjects, competitions]);

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter competitions by subject">
        {["All", ...subjects].map((subject) => (
          <button
            key={subject}
            type="button"
            role="tab"
            aria-selected={active === subject}
            onClick={() => setActive(subject)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              active === subject
                ? "bg-brand text-brand-foreground"
                : "bg-muted text-muted-foreground hover:bg-border"
            }`}
          >
            {subject}
          </button>
        ))}
      </div>

      <div className="mt-8 space-y-12">
        {groups.map((group) => (
          <div key={group.subject}>
            {active === "All" && <h2 className="mb-4 text-lg font-bold">{group.subject}</h2>}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((competition) => (
                <CompetitionCard key={competition.slug} competition={competition} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
