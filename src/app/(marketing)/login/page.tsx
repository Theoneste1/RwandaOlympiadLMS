import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { demoLoginAction } from "@/lib/actions/auth";

const demoRoles = [
  {
    role: "STUDENT" as const,
    title: "Student demo",
    description: "Dashboard, classes, assignments, exams, grades, and resources.",
  },
  {
    role: "TEACHER" as const,
    title: "Teacher / Coach demo",
    description: "Classes, content, assignments, grading, and student roster.",
  },
  {
    role: "ADMIN" as const,
    title: "Admin demo",
    description: "Platform-wide view of users, classes, and competitions.",
  },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ demoError?: string }> }) {
  const { demoError } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-200/50">
        <div className="grid lg:grid-cols-[1.1fr_1.4fr]">
          <div className="bg-sky-950 p-8 text-white sm:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-sky-200">ROF</p>
            <h1 className="mt-4 text-4xl font-black leading-tight">Get Into Olympiad</h1>
            <p className="mt-4 max-w-md text-sm text-sky-100/80">
              Sign in to the Rwanda Olympiad Foundation learning portal.
            </p>

            <div className="mt-8 space-y-4 text-sm text-sky-100/80">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-semibold text-white">One-click demo access</p>
                <p className="mt-1">Signs you in with a real seeded account — no password needed for a quick look.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-semibold text-white">Your own account</p>
                <p className="mt-1">Log in with the username/password you registered with, or a student ID.</p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Quick access</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">Try a demo account</h2>
              </div>
              <Link href="/" className="text-sm font-semibold text-sky-700 hover:underline">
                Visit site
              </Link>
            </div>

            {demoError && (
              <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                Demo account not found. Run <code>npm run db:seed</code> to create it.
              </p>
            )}

            <div className="mt-6 grid gap-3">
              {demoRoles.map((item) => (
                <form key={item.role} action={demoLoginAction.bind(null, item.role)}>
                  <button
                    type="submit"
                    className="group w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-sky-200 hover:bg-sky-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-black text-slate-900">{item.title}</h3>
                      <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-700">Sign in</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                  </button>
                </form>
              ))}
            </div>

            <div className="mt-8 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Or log in</p>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="mt-6">
              <LoginForm />
            </div>

            <p className="mt-4 text-sm text-slate-600">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-semibold text-sky-700 hover:underline">
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
