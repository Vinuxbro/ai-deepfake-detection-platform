"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

export function Nav({
  user,
}: {
  user: { email: string; name?: string | null } | null;
}) {
  const router = useRouter();
  const pathname = usePathname();

  if (pathname === "/login" || pathname === "/signup") return null;

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={`rounded-lg px-3 py-1.5 text-sm transition ${
        pathname === href
          ? "bg-slate-800 text-white"
          : "text-slate-400 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-[#060913]/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-black text-white shadow-md shadow-indigo-500/30">
            D
          </div>
          <span className="font-bold">DeepVerify</span>
        </Link>

        {user ? (
          <nav className="flex items-center gap-1.5">
            {link("/", "Detector")}
            {link("/history", "History")}
            <span className="ml-2 hidden text-xs text-slate-500 sm:inline">
              {user.name || user.email}
            </span>
            <button
              onClick={logout}
              className="ml-1 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-slate-800"
            >
              Sign out
            </button>
          </nav>
        ) : (
          <nav className="flex items-center gap-2">
            {link("/login", "Log in")}
            <Link
              href="/signup"
              className="rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 px-3 py-1.5 text-sm font-semibold text-white"
            >
              Sign up
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
