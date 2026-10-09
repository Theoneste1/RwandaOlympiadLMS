import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { SupportCenter } from "@/components/support-center";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Support" };

function HeadsetIcon() {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 13a8 8 0 0 1 16 0v3a2 2 0 0 1-2 2h-2v-5h4M4 13v5H3a2 2 0 0 1-2-2v-3h3Z" /><path d="M9 21h4a2 2 0 0 0 2-2" /></svg>;
}

export default async function SupportPage() {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") redirect("/login");

  return (
    <AuthGate role="student">
      <AppShell role="student">
        <div className="support-page min-h-full px-4 py-5 sm:px-8 sm:py-8"><div className="mx-auto max-w-7xl"><header className="support-heading"><div className="support-heading-icon"><HeadsetIcon /></div><div><p className="profile-kicker">Student portal</p><h1>Support</h1><p>Send us your questions and we&apos;ll help you find an answer.</p></div></header><SupportCenter /><div className="support-notice"><span aria-hidden="true">i</span><p>This is not a live chat. Our support team usually replies within 12–48 hours. You&apos;ll receive a notification here and by email when we respond.</p></div></div></div>
      </AppShell>
    </AuthGate>
  );
}