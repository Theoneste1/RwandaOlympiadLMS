"use client";

import { useActionState } from "react";
import { addStudentAction } from "@/lib/actions/teacher";

type FormState = { error?: string; success?: string };
const initialState: FormState = {};

export function AddStudentForm() {
  const [state, formAction, pending] = useActionState(addStudentAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label htmlFor="name" className="text-sm font-semibold">Full name</label>
        <input
          id="name"
          name="name"
          required
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="flex-1">
        <label htmlFor="studentIdNumber" className="text-sm font-semibold">Student ID</label>
        <input
          id="studentIdNumber"
          name="studentIdNumber"
          required
          placeholder="e.g. STU1005"
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="w-full sm:w-32">
        <label htmlFor="grade" className="text-sm font-semibold">Grade</label>
        <input
          id="grade"
          name="grade"
          required
          placeholder="e.g. S3"
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add Student"}
      </button>

      {state.error && <p className="w-full text-sm text-red-700 dark:text-red-300">{state.error}</p>}
      {state.success && <p className="w-full text-sm text-success">{state.success}</p>}
    </form>
  );
}
