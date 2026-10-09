"use client";

import { useActionState } from "react";
import { assignCompetitionAction } from "@/lib/actions/teacher";

type Option = { id: string; label: string };
type AssignState = { error?: string; success?: string };

const initialState: AssignState = {};

export function AssignCompetitionForm({
  students,
  competitions,
}: {
  students: Option[];
  competitions: Option[];
}) {
  const [state, formAction, pending] = useActionState(assignCompetitionAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label htmlFor="studentId" className="text-sm font-semibold">Student</label>
        <select
          id="studentId"
          name="studentId"
          required
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>
      <div className="flex-1">
        <label htmlFor="competitionId" className="text-sm font-semibold">Competition</label>
        <select
          id="competitionId"
          name="competitionId"
          required
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          {competitions.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Assigning…" : "Assign"}
      </button>

      {state.error && (
        <p className="w-full text-sm text-red-700 dark:text-red-300">{state.error}</p>
      )}
      {state.success && (
        <p className="w-full text-sm text-success">{state.success}</p>
      )}
    </form>
  );
}
