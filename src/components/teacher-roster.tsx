"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { STATUS_LABELS } from "@/components/status-badge";

export type RosterEntry = {
  registrationId: string;
  studentId: string;
  studentName: string;
  studentIdNumber: string | null;
  grade: string | null;
  competitionName: string;
  status: "ASSIGNED" | "IN_PROGRESS" | "COMPLETED";
  attemptId: string | null;
  score: number | null;
  totalPoints: number | null;
};

const ACCENT_CLASSES: Record<string, string> = {
  ASSIGNED: "bg-muted-foreground/40",
  IN_PROGRESS: "bg-accent",
  COMPLETED: "bg-success",
};

const PILL_CLASSES: Record<string, string> = {
  ASSIGNED: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-accent/15 text-accent",
  COMPLETED: "bg-success/15 text-success",
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function TeacherRoster({ entries }: { entries: RosterEntry[] }) {
  const statuses = useMemo(
    () => Array.from(new Set(entries.map((e) => e.status))),
    [entries],
  );
  const [active, setActive] = useState<string>("All");

  const filtered = active === "All" ? entries : entries.filter((e) => e.status === active);

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No competitions assigned yet.</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
        {["All", ...statuses].map((status) => (
          <button
            key={status}
            type="button"
            role="tab"
            aria-selected={active === status}
            onClick={() => setActive(status)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              active === status
                ? "bg-brand text-brand-foreground"
                : "bg-muted text-muted-foreground hover:bg-border"
            }`}
          >
            {status === "All" ? "All" : STATUS_LABELS[status] ?? status}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((entry) => (
          <div key={entry.registrationId} className="overflow-hidden rounded-lg border border-border">
            <div className={`h-1.5 ${ACCENT_CLASSES[entry.status] ?? "bg-border"}`} />
            <div className="p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">
                  {initials(entry.studentName)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{entry.studentName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {entry.studentIdNumber} · Grade {entry.grade}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-sm font-medium">{entry.competitionName}</p>

              <div className="mt-3 flex items-center justify-between gap-2">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${PILL_CLASSES[entry.status] ?? "bg-muted text-muted-foreground"}`}>
                  {STATUS_LABELS[entry.status] ?? entry.status}
                </span>
                {entry.status === "COMPLETED" && entry.attemptId ? (
                  <Link href={`/results/${entry.attemptId}`} className="text-sm font-semibold text-brand hover:underline">
                    {entry.score}/{entry.totalPoints} · View result
                  </Link>
                ) : entry.status === "IN_PROGRESS" ? (
                  <span className="text-xs text-muted-foreground">Exam in progress</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Awaiting exam</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
