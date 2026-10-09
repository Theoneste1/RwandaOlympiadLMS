"use client";

import { useActionState, useState } from "react";
import { registerAction, type ActionState } from "@/lib/actions/auth";

const initialState: ActionState = {};
const inputClass =
  "mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100";
const labelClass = "block text-sm font-semibold text-slate-800";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, initialState);
  const [role, setRole] = useState<"Student" | "Teacher">("Student");
  const [clientError, setClientError] = useState<string | null>(null);

  // Checked client-side (in addition to the server check) so a simple typo doesn't send the
  // whole form to the server and wipe every field on the error round-trip.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const confirmPassword = (form.elements.namedItem("confirmPassword") as HTMLInputElement).value;
    if (password !== confirmPassword) {
      event.preventDefault();
      setClientError("Passwords do not match.");
      return;
    }
    setClientError(null);
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1" role="group" aria-label="Registration type">
        <button
          type="button"
          aria-pressed={role === "Student"}
          onClick={() => setRole("Student")}
          className={`min-h-11 rounded-lg px-3 py-2 text-sm font-bold ${role === "Student" ? "bg-white text-sky-900 shadow-sm" : "text-slate-600"}`}
        >
          Student
        </button>
        <button
          type="button"
          aria-pressed={role === "Teacher"}
          onClick={() => setRole("Teacher")}
          className={`min-h-11 rounded-lg px-3 py-2 text-sm font-bold ${role === "Teacher" ? "bg-white text-sky-900 shadow-sm" : "text-slate-600"}`}
        >
          Coach / Teacher
        </button>
      </div>
      <input type="hidden" name="role" value={role} />

      <fieldset className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <legend className="px-2 text-base font-black text-slate-900">Account information</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={`${labelClass} sm:col-span-2`}>
            Full name *
            <input name="fullName" required autoComplete="name" className={inputClass} />
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            Email *
            <input name="email" type="email" required autoComplete="email" className={inputClass} />
          </label>
          <label className={labelClass}>
            Password *
            <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
            <span className="mt-1 block text-xs font-normal text-slate-500">At least 8 characters.</span>
          </label>
          <label className={labelClass}>
            Confirm password *
            <input name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
          </label>
        </div>
      </fieldset>

      <p className="text-xs leading-5 text-slate-500">
        {role === "Teacher"
          ? "Coach/teacher accounts are created and activated immediately with this platform's current account model."
          : "You can add your student ID, grade, and school details afterwards from your profile."}
      </p>

      {(clientError ?? state.error) && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {clientError ?? state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="min-h-12 w-full rounded-lg bg-sky-900 px-5 py-3 text-sm font-bold text-white hover:bg-sky-800 disabled:opacity-60"
      >
        {pending ? "Creating account…" : role === "Student" ? "Create student account" : "Create coach/teacher account"}
      </button>
    </form>
  );
}
