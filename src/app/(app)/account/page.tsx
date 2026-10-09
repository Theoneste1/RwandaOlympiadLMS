import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { ChangePasswordForm } from "@/components/change-password-form";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "My Account" };

function Icon({ name }: { name: "user" | "contact" | "alert" | "lock" }) {
  const paths = {
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></>,
    contact: <><rect x="4" y="5" width="16" height="14" rx="2" /><path d="m7 9 5 3 5-3M7 16h3" /></>,
    alert: <><path d="m12 4 9 16H3L12 4Z" /><path d="M12 9v4M12 16h.01" /></>,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  };

  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });
  const role = session.role === "TEACHER" ? "teacher" : "student";

  return (
    <AuthGate role={role}>
      <AppShell role={role}>
    <div className="profile-page min-h-full px-4 py-5 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <section className="profile-banner">
          <div><p className="profile-kicker">{role === "teacher" ? "Teacher portal" : "Student portal"}</p><h1><Icon name="user" />Profile information</h1><p>Manage your account and contact information</p></div>
        </section>

        <div className="profile-alert"><Icon name="alert" /><span>Keep your profile information up to date so your competition records stay accurate.</span></div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <section className="profile-panel">
            <h2><span><Icon name="user" /></span>User information</h2>
            <div className="profile-fields">
              <label><span>Student ID</span><input value={user.studentIdNumber ?? "Not provided"} readOnly /></label>
              <label><span>Full name</span><input value={user.name} readOnly /></label>
              <label><span>Username</span><input value={user.username} readOnly /></label>
              <label><span>Grade</span><input value={user.grade ?? "Not provided"} readOnly /></label>
              <label><span>Account type</span><input value={user.role === "TEACHER" ? "Teacher" : "Student"} readOnly /></label>
            </div>
          </section>

          <section className="profile-panel">
            <h2><span><Icon name="contact" /></span>Contact information</h2>
            <div className="profile-fields">
              <label><span>Email</span><input value={user.email} readOnly /></label>
              <label><span>Phone number</span><input value="Not provided" readOnly /></label>
              <label><span>Address</span><input value="Not provided" readOnly /></label>
            </div>
            <p className="profile-note">Contact details can be added when profile editing is enabled.</p>
          </section>
        </div>

        <section className="profile-password mt-3">
          <div className="profile-password-heading"><span><Icon name="lock" /></span><div><h2>Change password</h2><p>{user.studentIdNumber ? "Your student ID is the initial password if you have not changed it yet." : "Set a new password for your account."}</p></div></div>
          <div className="mt-5 max-w-xl"><ChangePasswordForm /></div>
        </section>
      </div>
    </div>
      </AppShell>
    </AuthGate>
  );
}
