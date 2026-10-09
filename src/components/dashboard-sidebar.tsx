"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SITE } from "@/lib/site-config";
import { logoutAction } from "@/lib/actions/auth";
import type { SessionPayload } from "@/lib/auth";

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

function ExamsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12a1 1 0 0 1 1 1v16H5V4a1 1 0 0 1 1-1Z" />
      <path d="M9 7h6M9 11h6M9 15h3M15 15h.01" />
    </svg>
  );
}

function ResultsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3h10v18H7zM9.5 7h5M9.5 11h5M9.5 15h2" />
      <path d="m15 15 1.5 1.5L19 14" />
    </svg>
  );
}

function SupportIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 13a8 8 0 0 1 16 0v3a2 2 0 0 1-2 2h-2v-5h4M4 13v5H3a2 2 0 0 1-2-2v-3h3Z" />
      <path d="M9 21h4a2 2 0 0 0 2-2" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4H6a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 6 20h3" />
      <path d="M16 16l4-4-4-4" />
      <path d="M20 12H9" />
    </svg>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function NavLinks({ session, onNavigate }: { session: SessionPayload; onNavigate?: () => void }) {
  const pathname = usePathname();
  const dashboardHref = session.role === "TEACHER" ? "/Teacher/Dashboard" : "/Student/Dashboard";
  const items = [
    { href: dashboardHref, label: "Dashboard", icon: <HomeIcon /> },
    ...(session.role === "TEACHER" ? [{ href: "/Teacher/Exams", label: "Exams", icon: <ExamsIcon /> }] : []),
    ...(session.role === "STUDENT" ? [{ href: "/Student/Exams", label: "Exams", icon: <ExamsIcon /> }] : []),
    ...(session.role === "STUDENT" ? [{ href: "/Student/Results", label: "My Results", icon: <ResultsIcon /> }] : []),
    ...(session.role === "STUDENT" ? [{ href: "/Student/Support", label: "Support", icon: <SupportIcon /> }] : []),
    { href: "/account", label: "Profile", icon: <UserIcon /> },
  ];

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = pathname === item.href || (item.href === "/Student/Exams" && pathname.startsWith("/student/exams/"));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
              active ? "bg-brand text-brand-foreground" : "text-foreground/80 hover:bg-muted"
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({ session, onNavigate }: { session: SessionPayload; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="p-4">
        <Link href="/" onClick={onNavigate} className="flex items-center gap-2 font-bold text-lg">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-brand-foreground text-sm">
            RO
          </span>
          <span>{SITE.shortName}</span>
        </Link>
      </div>

      <div className="px-4">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
        >
          <BackIcon />
          Back to site
        </Link>
      </div>

      <div className="mt-4 flex-1 px-4">
        <NavLinks session={session} onNavigate={onNavigate} />
      </div>

      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">
            {initials(session.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{session.name}</p>
            <p className="text-xs text-muted-foreground">{session.role === "TEACHER" ? "Teacher" : "Student"}</p>
          </div>
        </div>
        <form action={logoutAction} className="mt-3">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
          >
            <LogoutIcon />
            Log Out
          </button>
        </form>
      </div>
    </div>
  );
}

export function DashboardSidebar({ session }: { session: SessionPayload }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop: persistent sidebar */}
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:border-border">
        <SidebarContent session={session} />
      </aside>

      {/* Mobile: top bar + slide-in drawer */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background px-4 md:hidden">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-brand-foreground text-xs">
            RO
          </span>
          {SITE.shortName}
        </Link>
        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border"
        >
          ☰
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div id="app-mobile-menu" className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-background shadow-xl">
            <div className="flex justify-end p-2">
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border"
              >
                ✕
              </button>
            </div>
            <SidebarContent session={session} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
