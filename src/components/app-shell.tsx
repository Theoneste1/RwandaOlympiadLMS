"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { getRoleNavigation, type Role } from "@/lib/mock-data";
import { logoutAction } from "@/lib/actions/auth";
import {
  getShellDataAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  type ShellData,
} from "@/lib/actions/shell";

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8a6 6 0 1 0-12 0c0 3.2-1 5-2 7h16c-1-2-2-3.8-2-7Z" />
      <path d="M9.5 18.5a2.5 2.5 0 0 0 5 0" />
    </svg>
  );
}

const roleMeta: Record<Role, { title: string; subtitle: string; tone: string }> = {
  student: { title: "Student Portal", subtitle: "Olympiad learning portal", tone: "bg-indigo-600" },
  teacher: { title: "Teacher Portal", subtitle: "Classroom management", tone: "bg-emerald-600" },
  admin: { title: "Admin Portal", subtitle: "Platform operations", tone: "bg-sky-600" },
};

/**
 * Real auth now happens server-side: src/proxy.ts validates the session cookie before these
 * pages render, and every page under student/teacher/admin re-checks getSession() itself.
 * This component used to additionally gate access via `localStorage['rof-role']`, which had
 * nothing to do with the real session and would bounce real logged-in users back to /login.
 * Kept as a passthrough (rather than deleted) so the ~30 pages that still import it don't need
 * individual edits.
 */
export function AuthGate({ children }: { role: Role; children: React.ReactNode }) {
  return <>{children}</>;
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

export function AppShell({ role, children }: { role: Role; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openHeaderPanel, setOpenHeaderPanel] = useState<"notifications" | "profile" | null>(null);
  const [shell, setShell] = useState<ShellData | null>(null);
  const [search, setSearch] = useState("");
  const [, startTransition] = useTransition();
  const nav = getRoleNavigation(role);

  useEffect(() => {
    getShellDataAction().then(setShell);
  }, []);

  function onOpenNotification(id: string, link: string | null) {
    startTransition(async () => {
      await markNotificationReadAction(id);
      setShell((current) =>
        current
          ? {
              ...current,
              unreadCount: Math.max(0, current.unreadCount - 1),
              notifications: current.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
            }
          : current,
      );
    });
    setOpenHeaderPanel(null);
    if (link) router.push(link);
  }

  function onMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsReadAction();
    });
    setShell((current) =>
      current
        ? { ...current, unreadCount: 0, notifications: current.notifications.map((n) => ({ ...n, read: true })) }
        : current,
    );
  }

  function onSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!search.trim()) return;
    setOpenHeaderPanel(null);
    router.push(`/search?q=${encodeURIComponent(search.trim())}`);
  }

  const displayName = shell?.name ?? "…";
  const displaySubtitle =
    shell?.role === "TEACHER"
      ? "Teacher"
      : shell?.studentIdNumber
        ? `Student · ${shell.studentIdNumber}`
        : "Student";

  const navLinks = (
    <nav className="mt-6 space-y-2">
      {nav.map((item) => {
        const isDashboardHref = item.href === "/student" || item.href === "/teacher" || item.href === "/admin";
        const active = pathname === item.href || (!isDashboardHref && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={[
              "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition",
              active ? "bg-sky-50 text-sky-700 ring-1 ring-sky-100" : "text-slate-600 hover:bg-slate-100",
            ].join(" ")}
          >
            <span>{item.label}</span>
            <span className="text-xs opacity-70">→</span>
          </Link>
        );
      })}
    </nav>
  );

  const sidebarHeader = (
    <div className="flex items-center justify-between border-b border-slate-200 p-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">ROF</p>
        <p className="mt-1 text-lg font-black">{roleMeta[role].title}</p>
      </div>
      <button
        type="button"
        className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 lg:hidden"
        onClick={() => setMobileOpen(false)}
        aria-label="Close menu"
      >
        <CloseIcon />
      </button>
    </div>
  );

  const portalCard = (
    <div className={`rounded-2xl ${roleMeta[role].tone} p-4 text-white`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">Portal</p>
      <p className="mt-2 text-2xl font-black">{roleMeta[role].subtitle}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen flex-col lg:flex-row">
        {/* Desktop: persistent sidebar */}
        <aside className="hidden border-r border-slate-200 bg-white lg:sticky lg:top-0 lg:block lg:h-screen lg:w-72">
          {sidebarHeader}
          <div className="p-5">
            {portalCard}
            {navLinks}
          </div>
        </aside>

        {/* Mobile: slide-in drawer with backdrop, consistent with the marketing site's mobile menu */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-slate-950/40" onClick={() => setMobileOpen(false)} aria-hidden="true" />
            <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] overflow-y-auto bg-white shadow-xl">
              {sidebarHeader}
              <div className="p-5">
                {portalCard}
                {navLinks}
              </div>
            </aside>
          </div>
        )}

        <div className="flex-1">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-2.5 py-2 text-slate-600 lg:hidden"
                  onClick={() => setMobileOpen((value) => !value)}
                  aria-label="Toggle menu"
                >
                  <MenuIcon />
                </button>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Get Into Olympiad</p>
                  <h1 className="text-lg font-black text-slate-900">{roleMeta[role].subtitle}</h1>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <form onSubmit={onSearchSubmit} className="hidden md:block">
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search classes, assignments, content…"
                    aria-label="Search"
                    className="w-64 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </form>
                <div className="relative">
                  <button
                    type="button"
                    aria-label="Notifications"
                    aria-expanded={openHeaderPanel === "notifications"}
                    aria-controls="notifications-panel"
                    onClick={() => setOpenHeaderPanel((current) => (current === "notifications" ? null : "notifications"))}
                    className="relative rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600"
                  >
                    <BellIcon />
                    {!!shell?.unreadCount && (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                        {shell.unreadCount > 9 ? "9+" : shell.unreadCount}
                      </span>
                    )}
                  </button>
                  {openHeaderPanel === "notifications" && (
                    <section
                      id="notifications-panel"
                      role="dialog"
                      aria-label="Notifications"
                      className="absolute right-0 top-full z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-xl"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="font-black">Notifications</h2>
                        {!!shell && shell.notifications.length > 0 && (
                          <button type="button" onClick={onMarkAllRead} className="text-xs font-semibold text-sky-700 hover:underline">
                            Mark all read
                          </button>
                        )}
                      </div>
                      {!shell ? (
                        <p className="mt-3 text-sm text-slate-500">Loading…</p>
                      ) : shell.notifications.length === 0 ? (
                        <p className="mt-3 text-sm text-slate-500">You&apos;re all caught up.</p>
                      ) : (
                        <ul className="mt-2 max-h-96 divide-y divide-slate-100 overflow-y-auto">
                          {shell.notifications.map((notification) => (
                            <li key={notification.id}>
                              <button
                                type="button"
                                onClick={() => onOpenNotification(notification.id, notification.link)}
                                className={`block w-full py-3 text-left text-sm leading-5 first:pt-2 last:pb-1 ${notification.read ? "text-slate-500" : "font-semibold text-slate-900"}`}
                              >
                                {!notification.read && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-sky-600" aria-hidden="true" />}
                                {notification.message}
                                <span className="mt-0.5 block text-xs font-normal text-slate-400">{timeAgo(notification.createdAt)}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  )}
                </div>
                <div className="relative">
                  <button
                    type="button"
                    aria-expanded={openHeaderPanel === "profile"}
                    aria-controls="profile-panel"
                    onClick={() => setOpenHeaderPanel((current) => (current === "profile" ? null : "profile"))}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-700">
                      {shell ? initials(shell.name) : "…"}
                    </span>
                    <span className="hidden sm:inline">Profile</span>
                  </button>
                  {openHeaderPanel === "profile" && (
                    <section
                      id="profile-panel"
                      role="dialog"
                      aria-label="Profile"
                      className="absolute right-0 top-full z-40 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-xl"
                    >
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">{roleMeta[role].title}</p>
                      <p className="mt-2 font-black">{displayName}</p>
                      <p className="mt-1 text-sm text-slate-600">{displaySubtitle}</p>
                      {shell?.email && <p className="mt-1 text-xs text-slate-500">{shell.email}</p>}
                      <Link href="/account" className="mt-3 inline-flex text-sm font-semibold text-sky-700 hover:underline">
                        Manage account →
                      </Link>
                    </section>
                  )}
                </div>
                <form action={logoutAction}>
                  <button type="submit" className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </header>

          <main className="p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
